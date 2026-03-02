import { Browser } from 'puppeteer';
import { BaseJobService } from './base-job-service';
import { Job, SearchParams } from '../types/job';
import { getBrowser } from './indeed-scraper-service';

export class LinkedInScraperService extends BaseJobService {
  readonly name = 'LinkedIn';

  isAvailable(): boolean {
    return true;
  }

  async search(params: SearchParams): Promise<Job[]> {
    const browser: Browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 1920, height: 1080 });

      const query = params.keyword || 'software engineer';
      const location = params.location && params.location !== 'All US' ? params.location : 'United States';
      const start = ((params.page || 1) - 1) * 25;

      let url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&start=${start}`;
      if (params.remote) url += '&f_WT=2';
      if (params.type && params.type !== 'All Types') {
        const typeMap: Record<string, string> = {
          'Full-time': 'F',
          'Part-time': 'P',
          'Contract': 'C',
          'Internship': 'I',
          'Temporary': 'T',
        };
        if (typeMap[params.type]) url += `&f_JT=${typeMap[params.type]}`;
      }

      console.log(`[LinkedIn] Fetching: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));

      const jobs = await page.evaluate(() => {
        const results: Array<{
          title: string;
          company: string;
          location: string;
          url: string;
          posted: string;
          logo: string;
          salary: string;
          type: string;
          benefits: string[];
        }> = [];

        // Use the most specific selector to avoid duplicate matches
        const cards = document.querySelectorAll('.base-card.base-card--link');
        const seen = new Set();

        cards.forEach(card => {
          const titleEl = card.querySelector('.base-search-card__title') as HTMLElement;
          const title = titleEl?.innerText?.trim() || '';

          const linkEl = card.querySelector('a.base-card__full-link') as HTMLAnchorElement;
          const url = linkEl?.href || '';

          // Skip duplicates
          const key = title + '|' + url;
          if (seen.has(key)) return;
          seen.add(key);

          const companyEl = card.querySelector('.base-search-card__subtitle, h4 a') as HTMLElement;
          const company = companyEl?.innerText?.trim() || '';

          const locEl = card.querySelector('.job-search-card__location, .base-search-card__metadata span') as HTMLElement;
          const location = locEl?.innerText?.trim() || '';

          const dateEl = card.querySelector('time, .job-search-card__listdate') as HTMLElement;
          const posted = dateEl?.getAttribute('datetime') || dateEl?.innerText?.trim() || '';

          const logoEl = card.querySelector('img[data-delayed-url], img.artdeco-entity-image') as HTMLImageElement;
          const logo = logoEl?.getAttribute('data-delayed-url') || logoEl?.src || '';

          // Salary and benefits from metadata
          const metaEls = card.querySelectorAll('.base-search-card__metadata span, .result-benefits__text');
          let salary = '';
          let type = '';
          const benefits: string[] = [];
          metaEls.forEach(el => {
            const text = (el as HTMLElement).innerText?.trim() || '';
            const lower = text.toLowerCase();
            if (lower.includes('$') || lower.includes('k/yr') || lower.includes('/hr')) {
              salary = text;
            } else if (['full-time', 'part-time', 'contract', 'internship', 'temporary'].includes(lower)) {
              type = text;
            }
          });

          if (title) {
            results.push({ title, company, location, url, posted, logo, salary, type, benefits });
          }
        });

        return results;
      });

      console.log(`[LinkedIn] Scraped ${jobs.length} jobs`);

      return jobs.map((job, i): Job => ({
        id: this.generateId('linkedin', `${Date.now()}-${i}`),
        title: job.title,
        company: job.company,
        location: job.location || 'US',
        description: '',
        salary: job.salary || null,
        type: job.type || null,
        remote: (job.location + job.title).toLowerCase().includes('remote'),
        url: job.url,
        source: this.name,
        postedDate: this.parseDate(job.posted),
        companyLogo: job.logo && job.logo.startsWith('http') ? job.logo : null,
        via: 'LinkedIn',
        benefits: job.benefits.slice(0, 4),
        qualifications: [],
      }));
    } catch (err) {
      console.error('[LinkedIn] Error:', (err as Error).message);
      return [];
    } finally {
      await page.close();
    }
  }

  private parseDate(text: string): string | null {
    if (!text) return null;
    // LinkedIn often provides ISO dates in datetime attr
    if (text.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(text).toISOString();
    }
    const now = new Date();
    const lower = text.toLowerCase();
    const numMatch = lower.match(/(\d+)/);
    const num = numMatch ? parseInt(numMatch[1], 10) : 0;
    if (lower.includes('hour')) { now.setHours(now.getHours() - num); return now.toISOString(); }
    if (lower.includes('day')) { now.setDate(now.getDate() - num); return now.toISOString(); }
    if (lower.includes('week')) { now.setDate(now.getDate() - num * 7); return now.toISOString(); }
    if (lower.includes('month')) { now.setMonth(now.getMonth() - num); return now.toISOString(); }
    return null;
  }
}
