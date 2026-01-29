import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { MatchRequestInput, SingleMatchInput } from './dto/match-request.input';
import { MatchResult } from './entities/match.entity';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private readonly mlServiceClient: AxiosInstance;
  private readonly mlServiceUrl: string;
  private readonly mlServiceApiKey: string;

  constructor(private configService: ConfigService) {
    this.mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://localhost:8000');
    this.mlServiceApiKey = this.configService.get<string>('ML_SERVICE_API_KEY', 'your-secret-api-key-here');
    
    this.mlServiceClient = axios.create({
      baseURL: this.mlServiceUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.mlServiceApiKey,
      },
      timeout: 30000,
    });
  }

  async batchMatch(
    matchRequest: MatchRequestInput,
    students: any[],
    internships: any[],
  ): Promise<{ results: MatchResult[]; totalStudentsProcessed: number; totalMatchesGenerated: number; processingTimeSeconds: number }> {
    try {
      this.logger.log(`Processing batch match for ${students.length} students and ${internships.length} internships`);

      const mlRequest = {
        students: students.map(s => this.transformStudentForML(s)),
        internships: internships.map(i => this.transformInternshipForML(i)),
        diversity_boost: matchRequest.diversityBoost,
        max_matches_per_student: matchRequest.maxMatchesPerStudent,
        min_score_threshold: matchRequest.minScoreThreshold,
      };

      const response = await this.mlServiceClient.post('/api/v1/matching/batch', mlRequest);

      this.logger.log(`Batch matching completed. Generated ${response.data.total_matches_generated} matches`);

      return response.data;
    } catch (error) {
      this.logger.error(`Error in batch matching: ${error.message}`, error.stack);
      throw new HttpException(
        `ML Service Error: ${error.response?.data?.detail || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async singleMatch(
    matchInput: SingleMatchInput,
    student: any,
    internships: any[],
  ): Promise<MatchResult> {
    try {
      this.logger.log(`Processing single match for student ${student.id}`);

      const mlRequest = {
        student: this.transformStudentForML(student),
        internships: internships.map(i => this.transformInternshipForML(i)),
        max_matches: matchInput.maxMatches,
      };

      const response = await this.mlServiceClient.post('/api/v1/matching/single', mlRequest);

      return response.data;
    } catch (error) {
      this.logger.error(`Error in single matching: ${error.message}`, error.stack);
      throw new HttpException(
        `ML Service Error: ${error.response?.data?.detail || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async optimizeAllocation(
    students: any[],
    internships: any[],
    diversityBoost: boolean = true,
  ): Promise<{ allocation: Record<string, string>; totalAllocated: number; totalStudents: number; allocationRate: number }> {
    try {
      this.logger.log(`Optimizing allocation for ${students.length} students`);

      const response = await this.mlServiceClient.post('/api/v1/matching/optimize', {
        students: students.map(s => this.transformStudentForML(s)),
        internships: internships.map(i => this.transformInternshipForML(i)),
        diversity_boost: diversityBoost,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Error in optimization: ${error.message}`, error.stack);
      throw new HttpException(
        `ML Service Error: ${error.response?.data?.detail || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private transformStudentForML(student: any) {
    return {
      student_id: student.id,
      name: student.name,
      skills: student.skills || [],
      qualification: student.qualification,
      field_of_study: student.fieldOfStudy,
      cgpa: student.cgpa,
      location_preference: student.locationPreference || [],
      sector_interests: student.sectorInterests || [],
      social_category: student.socialCategory,
      district_type: student.districtType,
      past_internships: student.pastInternships || 0,
      languages: student.languages || [],
      certifications: student.certifications || [],
    };
  }

  private transformInternshipForML(internship: any) {
    return {
      internship_id: internship.id,
      company_name: internship.companyName,
      title: internship.title,
      description: internship.description,
      required_skills: internship.requiredSkills || [],
      preferred_qualification: internship.preferredQualification,
      sector: internship.sector,
      location: internship.location,
      stipend: internship.stipend,
      duration_months: internship.durationMonths,
      capacity: internship.capacity,
      filled_positions: internship.filledPositions || 0,
      min_cgpa: internship.minCgpa || 0,
      preferred_fields: internship.preferredFields || [],
    };
  }

  async checkMLServiceHealth(): Promise<boolean> {
    try {
      const response = await this.mlServiceClient.get('/api/v1/health');
      return response.data.status === 'healthy';
    } catch (error) {
      this.logger.error(`ML Service health check failed: ${error.message}`);
      return false;
    }
  }
}
