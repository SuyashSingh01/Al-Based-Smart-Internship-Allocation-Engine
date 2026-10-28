import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { CircuitBreaker, CircuitOpenError } from '../../common/resilience/circuit-breaker';
import { Student } from '../students/entities/student.entity';
import { Internship } from '../internships/entities/internship.entity';

/** One scored (student, internship) pair as returned by the ML service (snake_case wire format). */
export interface MlMatchScore {
  student_id: string;
  internship_id: string;
  overall_score: number;
  skill_score: number;
  qualification_score: number;
  location_score: number;
  sector_score: number;
  diversity_score: number;
  field_score?: number;
  certification_score?: number;
  language_score?: number;
  ranker_score?: number | null;
  eligible?: boolean;
  explanation?: Record<string, string>;
}

export interface MlMatchResult {
  student_id: string;
  student_name: string;
  matches: MlMatchScore[];
  total_matches: number;
}

export interface RankOptions {
  maxMatches: number;
  minScore: number;
  diversityBoost: boolean;
  correlationId?: string;
}

/**
 * HTTP client for the FastAPI ML service.
 *
 * Resilience stack (outermost first):
 *   circuit breaker → retry w/ exponential backoff + jitter → per-request timeout
 *
 * - Timeout: ML_SERVICE_TIMEOUT_MS (default 10s) per attempt.
 * - Retries: up to 2 extra attempts on network errors, 5xx and 429. 4xx are
 *   caller bugs and fail immediately.
 * - Breaker: after 5 consecutive failed calls it opens for 30s and fails fast
 *   with 503, so a dead ML service doesn't tie up workers waiting on timeouts.
 */
@Injectable()
export class MlClientService {
  private readonly logger = new Logger(MlClientService.name);
  private readonly http: AxiosInstance;
  private readonly breaker: CircuitBreaker;
  private readonly MAX_RETRIES = 2;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ML_SERVICE_API_KEY');
    if (!apiKey) {
      this.logger.warn('ML_SERVICE_API_KEY is not set; ML calls will be rejected with 401');
    }
    this.http = axios.create({
      baseURL: config.get<string>('ML_SERVICE_URL', 'http://localhost:8000'),
      timeout: Number(config.get('ML_SERVICE_TIMEOUT_MS', 10_000)),
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey ?? '',
        'X-Service-Name': 'nest-backend',
      },
    });
    this.breaker = new CircuitBreaker({ name: 'ml-service', failureThreshold: 5, cooldownMs: 30_000 });
  }

  /** Two-stage rank of one student against an internship pool (`POST /api/v1/matching/rank`). */
  async rank(student: Student, internships: Internship[], opts: RankOptions): Promise<MlMatchResult> {
    return this.post<MlMatchResult>(
      '/api/v1/matching/rank',
      {
        student: this.toMlStudent(student),
        internships: internships.map((i) => this.toMlInternship(i)),
        max_matches: opts.maxMatches,
        min_score: opts.minScore,
        candidate_pool_size: 100,
        apply_hard_filter: true,
        use_trained_ranker: true,
        diversity_boost: opts.diversityBoost,
      },
      opts.correlationId,
    );
  }

  async isHealthy(): Promise<boolean> {
    try {
      const res = await this.http.get('/api/v1/health', { timeout: 3000 });
      return res.status === 200;
    } catch (e) {
      this.logger.warn(`ML health check failed: ${(e as Error).message}`);
      return false;
    }
  }

  get breakerState(): string {
    return this.breaker.currentState;
  }

  // ------------------------------------------------------------------
  // Transport
  // ------------------------------------------------------------------

  private async post<T>(path: string, body: unknown, correlationId?: string): Promise<T> {
    const headers = correlationId ? { 'X-Correlation-ID': correlationId } : undefined;
    try {
      return await this.breaker.exec(() =>
        this.withRetry(async () => (await this.http.post<T>(path, body, { headers })).data, path),
      );
    } catch (err) {
      throw this.toHttpException(err, path);
    }
  }

  private async withRetry<T>(op: () => Promise<T>, context: string): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await op();
      } catch (err) {
        if (attempt >= this.MAX_RETRIES || !this.isRetryable(err)) throw err;
        const backoff = 2 ** attempt * 500 + Math.random() * 200;
        this.logger.warn(
          `Retrying ${context} in ${Math.round(backoff)}ms (attempt ${attempt + 1}/${this.MAX_RETRIES}): ${(err as Error).message}`,
        );
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  private isRetryable(err: unknown): boolean {
    if (!axios.isAxiosError(err)) return false;
    const status = err.response?.status;
    if (!status) return true; // network error / timeout
    return status >= 500 || status === 429;
  }

  private toHttpException(err: unknown, context: string): HttpException {
    if (err instanceof CircuitOpenError) {
      return new ServiceUnavailableException('ML service unavailable (circuit open); try again shortly');
    }
    if (axios.isAxiosError(err)) {
      const axiosErr = err as AxiosError<{ detail?: unknown }>;
      const upstream = axiosErr.response?.status;
      const detail = axiosErr.response?.data?.detail ?? axiosErr.message;
      this.logger.error(`ML ${context} failed [${upstream ?? 'network'}]: ${JSON.stringify(detail)}`);
      // Any upstream failure is a gateway problem from our client's point of view
      // (even an upstream 4xx means *we* sent a bad request). No response → timeout.
      return new HttpException(
        { error: 'ML_SERVICE_ERROR', message: `${context}: ${JSON.stringify(detail)}` },
        upstream === undefined ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY,
      );
    }
    return err instanceof HttpException ? err : new HttpException((err as Error).message, 500);
  }

  // ------------------------------------------------------------------
  // Wire-format mapping (camelCase entities → snake_case ML schema)
  // ------------------------------------------------------------------

  private toMlStudent(student: Student) {
    return {
      student_id: student.id,
      name: student.name,
      skills: student.skills ?? [],
      qualification: student.qualification,
      field_of_study: student.fieldOfStudy,
      cgpa: student.cgpa,
      location_preference: student.locationPreference ?? [],
      sector_interests: student.sectorInterests ?? [],
      social_category: student.socialCategory,
      district_type: student.districtType,
      past_internships: student.pastInternships ?? 0,
      languages: student.languages ?? [],
      certifications: student.certifications ?? [],
    };
  }

  private toMlInternship(internship: Internship) {
    return {
      internship_id: internship.id,
      company_name: internship.companyName,
      title: internship.title,
      description: internship.description,
      required_skills: internship.requiredSkills ?? [],
      preferred_qualification: internship.preferredQualification,
      sector: internship.sector,
      location: internship.location,
      stipend: internship.stipend ?? null,
      duration_months: internship.durationMonths,
      capacity: internship.capacity,
      filled_positions: internship.filledPositions,
      min_cgpa: internship.minCgpa,
      preferred_fields: internship.preferredFields ?? [],
      preferred_skills: internship.preferredSkills ?? [],
      required_languages: internship.requiredLanguages ?? [],
    };
  }
}
