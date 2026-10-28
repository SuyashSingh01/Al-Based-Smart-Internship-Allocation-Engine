import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CacheService } from '../../common/cache/cache.service';
import type { PlatformStats } from './stats.resolver';

/**
 * Admin dashboard aggregates. All counting happens in Postgres; the result is
 * cached for 30s because dashboards poll and exact real-time counts aren't needed.
 */
@Injectable()
export class StatsService {
  private readonly CACHE_KEY = 'stats:platform';
  private readonly TTL_SECONDS = 30;

  constructor(
    private readonly dataSource: DataSource,
    private readonly cache: CacheService,
  ) {}

  platformStats(): Promise<PlatformStats> {
    return this.cache.getOrSet(this.CACHE_KEY, () => this.compute(), this.TTL_SECONDS);
  }

  private async compute(): Promise<PlatformStats> {
    const q = <T>(sql: string) => this.dataSource.query(sql) as Promise<T>;

    const [[counts], byStatus, bySector, [diversity]] = await Promise.all([
      q<Array<Record<string, string | null>>>(`
        SELECT
          (SELECT COUNT(*) FROM users)                                   AS users,
          (SELECT COUNT(*) FROM students)                                AS students,
          (SELECT COUNT(*) FROM companies)                               AS companies,
          (SELECT COUNT(*) FROM internships)                             AS internships,
          (SELECT COUNT(*) FROM internships WHERE "isActive")            AS active_internships,
          (SELECT COALESCE(SUM(capacity), 0) FROM internships)           AS total_seats,
          (SELECT COALESCE(SUM("filledPositions"), 0) FROM internships)  AS filled_seats,
          (SELECT COUNT(*) FROM applications)                            AS applications,
          (SELECT COUNT(*) FROM match_scores)                            AS match_scores,
          (SELECT AVG("overallScore") FROM match_scores)                 AS avg_score
      `),
      q<Array<{ key: string; count: string }>>(
        `SELECT status::text AS key, COUNT(*) AS count FROM applications GROUP BY status ORDER BY count DESC`,
      ),
      q<Array<{ key: string; count: string }>>(
        `SELECT sector AS key, COUNT(*) AS count FROM internships GROUP BY sector ORDER BY count DESC LIMIT 10`,
      ),
      q<Array<{ count: string }>>(`
        SELECT COUNT(DISTINCT s.id) AS count
        FROM students s
        JOIN match_scores m ON m."studentId" = s.id
        WHERE s."socialCategory" IN ('SC', 'ST', 'OBC')
           OR s."districtType" IN ('RURAL', 'ASPIRATIONAL')
      `),
    ]);

    const n = (v: string | null | undefined) => Number(v ?? 0);
    return {
      users: n(counts.users),
      students: n(counts.students),
      companies: n(counts.companies),
      internships: n(counts.internships),
      activeInternships: n(counts.active_internships),
      totalSeats: n(counts.total_seats),
      filledSeats: n(counts.filled_seats),
      applications: n(counts.applications),
      applicationsByStatus: byStatus.map((r) => ({ key: r.key, count: n(r.count) })),
      matchScores: n(counts.match_scores),
      avgMatchScore: counts.avg_score === null ? undefined : Math.round(Number(counts.avg_score) * 10000) / 10000,
      underrepresentedStudentsMatched: n(diversity?.count),
      internshipsBySector: bySector.map((r) => ({ key: r.key, count: n(r.count) })),
    };
  }
}
