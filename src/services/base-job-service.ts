import { Job, SearchParams } from '../types/job';

export abstract class BaseJobService {
  abstract readonly name: string;

  abstract isAvailable(): boolean;

  abstract search(params: SearchParams): Promise<Job[]>;

  protected normalizeDate(date: string | null | undefined): string | null {
    if (!date) return null;
    try {
      return new Date(date).toISOString();
    } catch {
      return null;
    }
  }

  protected generateId(source: string, externalId: string | number): string {
    return `${source}-${externalId}`;
  }

  protected matchesKeyword(text: string, keyword: string): boolean {
    if (!keyword) return true;
    return text.toLowerCase().includes(keyword.toLowerCase());
  }

  protected matchesLocation(jobLocation: string, searchLocation: string): boolean {
    if (!searchLocation || searchLocation === 'All US') return true;
    if (searchLocation === 'Remote') {
      return jobLocation.toLowerCase().includes('remote');
    }
    return jobLocation.toLowerCase().includes(searchLocation.toLowerCase());
  }

  protected matchesType(jobType: string | null, searchType: string): boolean {
    if (!searchType || searchType === 'All Types') return true;
    if (!jobType) return false;
    return jobType.toLowerCase().includes(searchType.toLowerCase());
  }
}
