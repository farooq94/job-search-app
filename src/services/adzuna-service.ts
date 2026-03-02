import axios from 'axios';
import { BaseJobService } from './base-job-service';
import { Job, SearchParams } from '../types/job';
import { config } from '../config';

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string; area: string[] };
  description: string;
  salary_min?: number;
  salary_max?: number;
  contract_type?: string;
  redirect_url: string;
  created: string;
  category: { label: string };
}

export class AdzunaService extends BaseJobService {
  readonly name = 'Adzuna';

  isAvailable(): boolean {
    return !!(config.adzuna.appId && config.adzuna.appKey);
  }

  async search(params: SearchParams): Promise<Job[]> {
    const page = Math.max(1, params.page);
    const queryParams: Record<string, string | number> = {
      app_id: config.adzuna.appId,
      app_key: config.adzuna.appKey,
      results_per_page: params.resultsPerPage,
      what: params.keyword || '',
      content_type: 'application/json',
    };

    if (params.location && params.location !== 'All US') {
      queryParams.where = params.location;
    }

    if (params.salaryMin) queryParams.salary_min = params.salaryMin;
    if (params.salaryMax) queryParams.salary_max = params.salaryMax;

    if (params.type && params.type !== 'All Types') {
      const typeMap: Record<string, string> = {
        'Full-time': 'full_time',
        'Part-time': 'part_time',
        'Contract': 'contract',
      };
      if (typeMap[params.type]) {
        queryParams.contract_type = typeMap[params.type];
      }
    }

    const url = `${config.adzuna.baseUrl}/${page}`;
    const response = await axios.get(url, {
      params: queryParams,
      timeout: 10000,
    });

    const results: AdzunaJob[] = response.data.results || [];

    return results.map((job): Job => ({
      id: this.generateId('adzuna', job.id),
      title: job.title || '',
      company: job.company?.display_name || 'Unknown',
      location: job.location?.display_name || 'US',
      description: job.description || '',
      salary: this.formatSalary(job.salary_min, job.salary_max),
      type: this.mapContractType(job.contract_type),
      remote: (job.title + job.description + job.location?.display_name).toLowerCase().includes('remote'),
      url: job.redirect_url || '',
      source: this.name,
      postedDate: this.normalizeDate(job.created),
      companyLogo: null,
      via: 'Adzuna',
      benefits: [],
      qualifications: [],
    }));
  }

  private formatSalary(min?: number, max?: number): string | null {
    if (!min && !max) return null;
    if (min && max) return `$${Math.round(min).toLocaleString()} - $${Math.round(max).toLocaleString()}`;
    if (min) return `$${Math.round(min).toLocaleString()}+`;
    return `Up to $${Math.round(max!).toLocaleString()}`;
  }

  private mapContractType(type?: string): string | null {
    if (!type) return null;
    const map: Record<string, string> = {
      full_time: 'Full-time',
      part_time: 'Part-time',
      contract: 'Contract',
    };
    return map[type] || type;
  }
}
