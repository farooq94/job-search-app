import axios from 'axios';
import { BaseJobService } from './base-job-service';
import { Job, SearchParams } from '../types/job';
import { config } from '../config';

interface RemoteOKJob {
  id: string;
  position: string;
  company: string;
  location: string;
  description: string;
  salary_min?: number;
  salary_max?: number;
  tags: string[];
  url: string;
  date: string;
  company_logo?: string;
}

export class RemoteOKService extends BaseJobService {
  readonly name = 'RemoteOK';

  isAvailable(): boolean {
    return true; // No auth needed
  }

  async search(params: SearchParams): Promise<Job[]> {
    const response = await axios.get(config.remoteok.baseUrl, {
      headers: {
        'User-Agent': 'JobSearchApp/1.0',
      },
      timeout: 15000,
    });

    // First element is a legal notice, skip it
    const results: RemoteOKJob[] = Array.isArray(response.data)
      ? response.data.filter((item: Record<string, unknown>) => item.id)
      : [];

    return results
      .map((job): Job => {
        const salaryStr = this.formatSalary(job.salary_min, job.salary_max);
        return {
          id: this.generateId('remoteok', job.id),
          title: job.position || '',
          company: job.company || 'Unknown',
          location: job.location || 'Remote',
          description: this.stripHtml(job.description || ''),
          salary: salaryStr,
          type: 'Full-time',
          remote: true,
          url: `https://remoteok.com/remote-jobs/${job.id}`,
          source: this.name,
          postedDate: this.normalizeDate(job.date),
          companyLogo: job.company_logo || null,
          via: 'RemoteOK',
          benefits: [],
          qualifications: [],
        };
      })
      .filter((job) => {
        if (params.keyword && !this.matchesKeyword(`${job.title} ${job.company} ${job.description}`, params.keyword)) {
          return false;
        }
        if (params.type && params.type !== 'All Types' && !this.matchesType(job.type, params.type)) return false;
        if (params.salaryMin && job.salary) {
          const minSalary = this.extractMinSalary(job.salary);
          if (minSalary && minSalary < params.salaryMin) return false;
        }
        return true;
      });
  }

  private formatSalary(min?: number, max?: number): string | null {
    if (!min && !max) return null;
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `$${min.toLocaleString()}+`;
    return `Up to $${max!.toLocaleString()}`;
  }

  private extractMinSalary(salary: string): number | null {
    const match = salary.replace(/[,$]/g, '').match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
