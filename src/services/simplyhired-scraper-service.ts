import { Browser } from 'puppeteer';
import { BaseJobService } from './base-job-service';
import { Job, SearchParams } from '../types/job';
import { getBrowser } from './indeed-scraper-service';

export class SimplyHiredScraperService extends BaseJobService {
  readonly name = 'SimplyHired';

  isAvailable(): boolean {
    return true;
  }

  async search(params: SearchParams): Promise<Job[]> {
    const browser: Browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 1920, height: 1080 });

      const query = params.keyword || 'software engineer';
      const location = params.location && params.location !== 'All US' ? params.location : '';
      const pageNum = params.page || 1;

      let url = `https://www.simplyhired.com/search?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`;
      if (pageNum > 1) url += `&pn=${pageNum}`;
      if (params.type && params.type !== 'All Types') {
        const typeMap: Record<string, string> = {
          'Full-time': 'CF3CP', 'Part-time': 'CF3CP2', 'Contract': 'CF3CP8',
          'Internship': 'CF3CP4', 'Temporary': 'CF3CP16',
        };
        if (typeMap[params.type]) url += `&jt=${typeMap[params.type]}`;
      }

      console.log(`[SimplyHired] Fetching: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));

      const jobs = await page.evaluate(() => {
        const results: Array<{
          title: string;
          company: string;
          location: string;
          salary: string;
          description: string;
          url: string;
          posted: string;
          type: string;
          qualifications: string[];
        }> = [];

        // SimplyHired uses article elements or chakra-linkbox divs
        const cards = document.querySelectorAll('article, [data-testid="searchSerpJob"], .chakra-linkbox, li.css-0');

        cards.forEach(card => {
          const titleEl = card.querySelector('h2 a, h3 a, [data-testid="searchSerpJobTitle"], a[data-mdref]') as HTMLAnchorElement;
          const title = titleEl?.innerText?.trim() || '';
          const href = titleEl?.href || '';

          const companyEl = card.querySelector('[data-testid="companyName"], .css-lvyu5j, span[class*="company"]') as HTMLElement;
          const company = companyEl?.innerText?.trim() || '';

          const locEl = card.querySelector('[data-testid="searchSerpJobLocation"], .css-1t92pv, span[class*="location"]') as HTMLElement;
          const location = locEl?.innerText?.trim() || '';

          const salaryEl = card.querySelector('[data-testid="searchSerpJobSalary"], .css-1xe2n1k, .salary-range') as HTMLElement;
          const salary = salaryEl?.innerText?.trim() || '';

          const snippetEl = card.querySelector('[data-testid="searchSerpJobSnippet"], .css-jkeyps, p[class*="snippet"]') as HTMLElement;
          const description = snippetEl?.innerText?.trim() || '';

          const dateEl = card.querySelector('[data-testid="searchSerpJobDateStamp"], time, .css-cqluae') as HTMLElement;
          const posted = dateEl?.innerText?.trim() || '';

          // Type and qualifications
          let type = '';
          const qualifications: string[] = [];
          card.querySelectorAll('.css-1lyr5hq span, .tag, [data-testid="searchSerpJobTag"]').forEach(el => {
            const text = (el as HTMLElement).innerText?.trim() || '';
            const lower = text.toLowerCase();
            if (['full-time', 'part-time', 'contract', 'temporary', 'internship'].includes(lower)) {
              type = text;
            } else if (text.length < 50) {
              qualifications.push(text);
            }
          });

          if (title) {
            results.push({ title, company, location, salary, description, url: href, posted, type, qualifications });
          }
        });

        return results;
      });

      console.log(`[SimplyHired] Scraped ${jobs.length} jobs`);

      return jobs.map((job, i): Job => ({
        id: this.generateId('simplyhired', `${Date.now()}-${i}`),
        title: job.title,
        company: job.company,
        location: job.location || 'US',
        description: job.description,
        salary: job.salary || null,
        type: job.type || null,
        remote: (job.location + job.title).toLowerCase().includes('remote'),
        url: job.url.startsWith('http') ? job.url : `https://www.simplyhired.com${job.url}`,
        source: this.name,
        postedDate: this.parseRelativeDate(job.posted),
        companyLogo: null,
        via: 'SimplyHired',
        benefits: [],
        qualifications: job.qualifications.slice(0, 3),
      }));
    } catch (err) {
      console.error('[SimplyHired] Error:', (err as Error).message);
      return [];
    } finally {
      await page.close();
    }
  }

  private parseRelativeDate(text: string): string | null {
    if (!text) return null;
    const now = new Date();
    const lower = text.toLowerCase();
    const numMatch = lower.match(/(\d+)/);
    const num = numMatch ? parseInt(numMatch[1], 10) : 0;
    if (lower.includes('today') || lower.includes('just')) return now.toISOString();
    if (lower.includes('hour')) { now.setHours(now.getHours() - num); return now.toISOString(); }
    if (lower.includes('day')) { now.setDate(now.getDate() - num); return now.toISOString(); }
    if (lower.includes('week')) { now.setDate(now.getDate() - num * 7); return now.toISOString(); }
    if (lower.includes('month')) { now.setMonth(now.getMonth() - num); return now.toISOString(); }
    return null;
  }
}
