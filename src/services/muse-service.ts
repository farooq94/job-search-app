import axios from 'axios';
import { BaseJobService } from './base-job-service';
import { Job, SearchParams } from '../types/job';
import { config } from '../config';

interface MuseJob {
  id: number;
  name: string;
  company: { name: string };
  locations: { name: string }[];
  contents: string;
  refs: { landing_page: string };
  categories: { name: string }[];
  levels: { name: string }[];
  publication_date: string;
  type?: string;
}

export class MuseService extends BaseJobService {
  readonly name = 'The Muse';

  isAvailable(): boolean {
    return true; // No auth needed
  }

  async search(params: SearchParams): Promise<Job[]> {
    const queryParams: Record<string, string | number> = {
      page: 0,
      descending: 'true',
    };

    // The Muse supports category filtering
    if (params.location && params.location !== 'All US' && params.location !== 'Remote') {
      queryParams.location = params.location;
    }

    const response = await axios.get(config.muse.baseUrl, {
      params: queryParams,
      timeout: 10000,
    });

    const results: MuseJob[] = response.data.results || [];

    return results
      .map((job): Job => ({
        id: this.generateId('muse', job.id),
        title: job.name,
        company: job.company?.name || 'Unknown',
        location: job.locations?.map((l) => l.name).join(', ') || 'US',
        description: this.stripHtml(job.contents || ''),
        salary: null,
        type: job.levels?.map((l) => l.name).join(', ') || null,
        remote: job.locations?.some((l) => l.name.toLowerCase().includes('remote')) || false,
        url: job.refs?.landing_page || '',
        source: this.name,
        postedDate: this.normalizeDate(job.publication_date),
        companyLogo: null,
        via: 'The Muse',
        benefits: [],
        qualifications: [],
      }))
      .filter((job) => {
        if (params.keyword && !this.matchesKeyword(`${job.title} ${job.company} ${job.description}`, params.keyword)) {
          return false;
        }
        if (params.remote && !job.remote) return false;
        if (params.type && params.type !== 'All Types' && !this.matchesType(job.type, params.type)) return false;
        return true;
      });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
