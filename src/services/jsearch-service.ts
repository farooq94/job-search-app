import axios from 'axios';
import { BaseJobService } from './base-job-service';
import { Job, SearchParams } from '../types/job';
import { config } from '../config';

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo: string | null;
  job_city: string;
  job_state: string;
  job_country: string;
  job_description: string;
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_salary_currency: string;
  job_salary_period: string;
  job_employment_type: string;
  job_is_remote: boolean;
  job_apply_link: string;
  job_posted_at_datetime_utc: string;
  job_publisher: string;
  job_highlights?: {
    Qualifications?: string[];
    Benefits?: string[];
  };
  job_required_education?: {
    degree_mentioned: boolean;
    degree_preferred: boolean;
  };
}

export class JSearchService extends BaseJobService {
  readonly name = 'Google Jobs';

  isAvailable(): boolean {
    return !!config.jsearch.apiKey;
  }

  async search(params: SearchParams): Promise<Job[]> {
    const query = [params.keyword || 'developer']
      .concat(params.location && params.location !== 'All US' ? [params.location] : [])
      .join(' in ');

    const queryParams: Record<string, string | number | boolean> = {
      query,
      page: params.page,
      num_pages: 1,
    };

    if (params.remote) queryParams.remote_jobs_only = true;

    if (params.type && params.type !== 'All Types') {
      const typeMap: Record<string, string> = {
        'Full-time': 'FULLTIME',
        'Part-time': 'PARTTIME',
        'Contract': 'CONTRACTOR',
        'Internship': 'INTERN',
      };
      if (typeMap[params.type]) {
        queryParams.employment_types = typeMap[params.type];
      }
    }

    const response = await axios.get(config.jsearch.baseUrl, {
      params: queryParams,
      headers: {
        'X-RapidAPI-Key': config.jsearch.apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
      timeout: 10000,
    });

    const results: JSearchJob[] = response.data.data || [];
    console.log(`[JSearch] Query: "${query}", Status: ${response.data.status}, Results: ${results.length}`);

    return results.map((job): Job => ({
      id: this.generateId('gjobs', job.job_id),
      title: job.job_title || '',
      company: job.employer_name || 'Unknown',
      companyLogo: job.employer_logo || null,
      location: [job.job_city, job.job_state].filter(Boolean).join(', ') || job.job_country || 'US',
      description: job.job_description || '',
      salary: this.formatSalary(job.job_min_salary, job.job_max_salary, job.job_salary_period),
      type: this.mapEmploymentType(job.job_employment_type),
      remote: job.job_is_remote || false,
      url: job.job_apply_link || '',
      source: this.name,
      via: job.job_publisher || null,
      postedDate: this.normalizeDate(job.job_posted_at_datetime_utc),
      benefits: job.job_highlights?.Benefits?.slice(0, 4) || [],
      qualifications: this.extractQualBadges(job),
    }));
  }

  private formatSalary(min: number | null, max: number | null, period: string): string | null {
    if (!min && !max) return null;
    const suffix = period === 'HOUR' ? '/hr' : '/yr';
    if (min && max) {
      const fmtMin = min >= 1000 ? `${Math.round(min / 1000)}K` : min.toString();
      const fmtMax = max >= 1000 ? `${Math.round(max / 1000)}K` : max.toString();
      return `$${fmtMin}-${fmtMax} a year`;
    }
    if (min) return `$${min.toLocaleString()}+${suffix}`;
    return `Up to $${max!.toLocaleString()}${suffix}`;
  }

  private mapEmploymentType(type: string): string | null {
    if (!type) return null;
    const map: Record<string, string> = {
      FULLTIME: 'Full-time',
      PARTTIME: 'Part-time',
      CONTRACTOR: 'Contract',
      INTERN: 'Internship',
    };
    return map[type] || type;
  }

  private extractQualBadges(job: JSearchJob): string[] {
    const badges: string[] = [];
    if (job.job_required_education) {
      badges.push(job.job_required_education.degree_mentioned ? 'Degree required' : 'No degree mentioned');
    }
    return badges;
  }
}
