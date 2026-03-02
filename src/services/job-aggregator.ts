import { BaseJobService } from './base-job-service';
import { IndeedScraperService } from './indeed-scraper-service';
import { LinkedInScraperService } from './linkedin-scraper-service';
import { SimplyHiredScraperService } from './simplyhired-scraper-service';
import { Job, SearchParams, SearchResponse, SourceStatus } from '../types/job';
import { TTLCache } from '../cache/cache';
import { config } from '../config';

export class JobAggregator {
  private services: BaseJobService[];
  private cache: TTLCache;

  constructor() {
    this.services = [
      new IndeedScraperService(),
      new LinkedInScraperService(),
      new SimplyHiredScraperService(),
    ];
    this.cache = new TTLCache(config.cacheTtl);
  }

  async search(params: SearchParams): Promise<SearchResponse> {
    const cacheKey = JSON.stringify(params);
    const cached = this.cache.get<SearchResponse>(cacheKey);
    if (cached) return cached;

    // Filter to requested and available sources
    const activeServices = this.services.filter((s) => {
      if (!s.isAvailable()) return false;
      if (params.sources.length > 0 && !params.sources.includes(s.name)) return false;
      return true;
    });

    // Query all services in parallel
    const results = await Promise.allSettled(
      activeServices.map((service) => service.search(params))
    );

    const allJobs: Job[] = [];
    const sources: SourceStatus[] = [];

    activeServices.forEach((service, i) => {
      const result = results[i];
      if (result.status === 'fulfilled') {
        allJobs.push(...result.value);
        sources.push({
          name: service.name,
          count: result.value.length,
          error: null,
          available: true,
        });
      } else {
        const errorMsg = result.reason instanceof Error
          ? result.reason.message
          : 'Unknown error';
        sources.push({
          name: service.name,
          count: 0,
          error: errorMsg,
          available: true,
        });
      }
    });

    // Add unavailable sources
    this.services
      .filter((s) => !s.isAvailable())
      .forEach((s) => {
        sources.push({
          name: s.name,
          count: 0,
          error: null,
          available: false,
        });
      });

    // Deduplicate by normalized title + company
    const seen = new Set<string>();
    const uniqueJobs = allJobs.filter((job) => {
      const key = `${job.title.toLowerCase().replace(/\s+/g, ' ').trim()}|${job.company.toLowerCase().replace(/\s+/g, ' ').trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    console.log(`[Aggregator] ${allJobs.length} total -> ${uniqueJobs.length} after dedup`);

    // Sort by date (newest first), fallback to title
    uniqueJobs.sort((a, b) => {
      if (a.postedDate && b.postedDate) {
        return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
      }
      if (a.postedDate) return -1;
      if (b.postedDate) return 1;
      return a.title.localeCompare(b.title);
    });

    // Paginate
    const page = params.page || 1;
    const pageSize = params.resultsPerPage || 20;
    const start = (page - 1) * pageSize;
    const paginatedJobs = uniqueJobs.slice(start, start + pageSize);

    const response: SearchResponse = {
      jobs: paginatedJobs,
      total: uniqueJobs.length,
      page,
      pageSize,
      totalPages: Math.ceil(uniqueJobs.length / pageSize),
      sources,
    };

    this.cache.set(cacheKey, response);
    return response;
  }

  getSources(): SourceStatus[] {
    return this.services.map((s) => ({
      name: s.name,
      count: 0,
      error: null,
      available: s.isAvailable(),
    }));
  }
}
