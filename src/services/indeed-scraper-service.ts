import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser } from 'puppeteer';
import { BaseJobService } from './base-job-service';
import { Job, SearchParams } from '../types/job';

puppeteer.use(StealthPlugin());

let sharedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!sharedBrowser || !sharedBrowser.connected) {
    const launchOptions: Record<string, unknown> = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled', '--disable-gpu'],
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    sharedBrowser = await puppeteer.launch(launchOptions) as unknown as Browser;
  }
  return sharedBrowser;
}

export { getBrowser };

export class IndeedScraperService extends BaseJobService {
  readonly name = 'Indeed';

  isAvailable(): boolean {
    return true;
  }

  async search(params: SearchParams): Promise<Job[]> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 1920, height: 1080 });

      const query = params.keyword || 'software engineer';
      const location = params.location && params.location !== 'All US' ? params.location : '';
      const start = ((params.page || 1) - 1) * 10;

      let url = `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&start=${start}`;
      if (params.remote) url += '&remotejob=032b3046-06a3-4876-8dfd-474eb5e7ed11';
      if (params.type && params.type !== 'All Types') {
        const typeMap: Record<string, string> = {
          'Full-time': 'fulltime',
          'Part-time': 'parttime',
          'Contract': 'contract',
          'Internship': 'internship',
          'Temporary': 'temporary',
        };
        if (typeMap[params.type]) url += `&jt=${typeMap[params.type]}`;
      }

      console.log(`[Indeed] Fetching: ${url}`);
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
          benefits: string[];
        }> = [];

        const cards = document.querySelectorAll('.job_seen_beacon, .resultContent, .css-zu9cdh');

        cards.forEach(card => {
          const titleEl = card.querySelector('h2 a, .jobTitle a, [data-jk] a') as HTMLAnchorElement;
          const title = titleEl?.innerText?.trim() || '';
          const href = titleEl?.href || '';

          const companyEl = card.querySelector('[data-testid="company-name"], .companyName, .css-63koeb') as HTMLElement;
          const company = companyEl?.innerText?.trim() || '';

          const locEl = card.querySelector('[data-testid="text-location"], .companyLocation, .css-1p0sjhy') as HTMLElement;
          const location = locEl?.innerText?.trim() || '';

          const salaryEl = card.querySelector('.salary-snippet-container, [data-testid="attribute_snippet_testid"], .css-18z4q2i, .metadata .attribute_snippet') as HTMLElement;
          const salary = salaryEl?.innerText?.trim() || '';

          const snippetEl = card.querySelector('.job-snippet, [data-testid="jobDescriptionText"], .css-9446fg') as HTMLElement;
          const description = snippetEl?.innerText?.trim() || '';

          const dateEl = card.querySelector('.date, [data-testid="myJobsStateDate"], .css-qvloho') as HTMLElement;
          const posted = dateEl?.innerText?.trim() || '';

          // Job type from metadata
          const metaEls = card.querySelectorAll('.metadata div, .css-tvvxwd');
          let type = '';
          const benefits: string[] = [];
          metaEls.forEach(el => {
            const text = (el as HTMLElement).innerText?.trim() || '';
            const lower = text.toLowerCase();
            if (['full-time', 'part-time', 'contract', 'temporary', 'internship'].includes(lower)) {
              type = text;
            } else if (lower.includes('insurance') || lower.includes('401') || lower.includes('paid') || lower.includes('dental')) {
              benefits.push(text);
            }
          });

          if (title) {
            results.push({ title, company, location, salary, description, url: href, posted, type, benefits });
          }
        });

        return results;
      });

      console.log(`[Indeed] Scraped ${jobs.length} jobs`);

      return jobs.map((job, i): Job => ({
        id: this.generateId('indeed', `${Date.now()}-${i}`),
        title: job.title,
        company: job.company,
        location: job.location || 'US',
        description: job.description,
        salary: job.salary || null,
        type: job.type || null,
        remote: (job.location + job.title).toLowerCase().includes('remote'),
        url: job.url.startsWith('http') ? job.url : `https://www.indeed.com${job.url}`,
        source: this.name,
        postedDate: this.parseRelativeDate(job.posted),
        companyLogo: null,
        via: 'Indeed',
        benefits: job.benefits.slice(0, 4),
        qualifications: [],
      }));
    } catch (err) {
      console.error('[Indeed] Error:', (err as Error).message);
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
    if (lower.includes('just posted') || lower.includes('today')) return now.toISOString();
    if (lower.includes('hour')) { now.setHours(now.getHours() - num); return now.toISOString(); }
    if (lower.includes('day')) { now.setDate(now.getDate() - num); return now.toISOString(); }
    if (lower.includes('week')) { now.setDate(now.getDate() - num * 7); return now.toISOString(); }
    if (lower.includes('month')) { now.setMonth(now.getMonth() - num); return now.toISOString(); }
    return null;
  }
}
