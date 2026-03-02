import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser } from 'puppeteer';
import { BaseJobService } from './base-job-service';
import { Job, SearchParams } from '../types/job';

puppeteer.use(StealthPlugin());

export class GoogleScraperService extends BaseJobService {
  readonly name = 'Google Jobs';
  private browser: Browser | null = null;

  isAvailable(): boolean {
    return true;
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--window-size=1920,1080',
        ],
      }) as unknown as Browser;
    }
    return this.browser;
  }

  async search(params: SearchParams): Promise<Job[]> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 1920, height: 1080 });

      // Build query
      const queryParts: string[] = [];
      if (params.keyword) queryParts.push(params.keyword);
      if (!params.keyword) queryParts.push('jobs');
      if (params.location && params.location !== 'All US') {
        queryParts.push(`in ${params.location}`);
      }
      if (params.remote) queryParts.push('remote');

      const query = queryParts.join(' ');
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&ibp=htl;jobs`;

      console.log(`[Google Scraper] Fetching: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for jobs to appear
      await page.waitForSelector('li', { timeout: 8000 }).catch(() => null);
      await new Promise(r => setTimeout(r, 2000));

      // Check for CAPTCHA
      const hasCaptcha = await page.evaluate(() => {
        return document.body.innerHTML.includes('captcha') || document.body.innerHTML.includes('unusual traffic');
      });

      if (hasCaptcha) {
        console.log('[Google Scraper] CAPTCHA detected, returning empty results');
        return [];
      }

      // Extract job listings
      const rawJobs = await page.evaluate(() => {
        const results: Array<{
          title: string;
          company: string;
          location: string;
          extensions: string[];
          thumbnail: string;
        }> = [];

        // Google Jobs uses various selectors - try multiple approaches
        // Approach 1: li items with role="treeitem" or data-ved
        const cards = document.querySelectorAll('li[data-ved], li[role="treeitem"], .iFjolb');

        cards.forEach((card) => {
          const headings = card.querySelectorAll('[role="heading"], .BjJfJf, .sH3zFd');
          const title = headings.length > 0 ? (headings[0] as HTMLElement).innerText?.trim() : '';

          // Company and location are usually in separate divs after the title
          const metaDivs = card.querySelectorAll('.vNEEBe, .nJlQNd, .Qk80Jf, .sMzDkb, .compText');
          const company = metaDivs.length > 0 ? (metaDivs[0] as HTMLElement).innerText?.trim() : '';
          const location = metaDivs.length > 1 ? (metaDivs[1] as HTMLElement).innerText?.trim() : '';

          // Extensions (badges: salary, type, posted date)
          const extensions: string[] = [];
          card.querySelectorAll('.LL4CDc, .I2Cbhb, .KKh3md span, .SuWscb, .metadata span, .job-age').forEach(el => {
            const text = (el as HTMLElement).innerText?.trim();
            if (text && text.length < 80) extensions.push(text);
          });

          const thumbEl = card.querySelector('img');
          const thumbnail = thumbEl?.getAttribute('src') || '';

          if (title) {
            results.push({ title, company, location, extensions, thumbnail });
          }
        });

        // Approach 2: If approach 1 yielded nothing, try generic job-card-like elements
        if (results.length === 0) {
          document.querySelectorAll('[jsname] [role="heading"]').forEach(heading => {
            const title = (heading as HTMLElement).innerText?.trim();
            const parent = heading.closest('[jsname]') || heading.parentElement?.parentElement;
            if (!parent || !title) return;

            const texts = Array.from(parent.querySelectorAll('div, span'))
              .map(el => (el as HTMLElement).innerText?.trim())
              .filter(t => t && t !== title && t.length < 100);

            results.push({
              title,
              company: texts[0] || '',
              location: texts[1] || '',
              extensions: texts.slice(2),
              thumbnail: '',
            });
          });
        }

        return results;
      });

      // Now click each card to get full details
      const jobs: Job[] = [];
      const cardSelector = 'li[data-ved], li[role="treeitem"], .iFjolb';

      for (let i = 0; i < Math.min(rawJobs.length, 20); i++) {
        try {
          const cards = await page.$$(cardSelector);
          if (!cards[i]) continue;

          await cards[i].click();
          await new Promise(r => setTimeout(r, 1000));

          const details = await page.evaluate(() => {
            // Try to get the description from the detail panel
            const descSelectors = [
              '.HBvzbc', '.YgLbBe', '.WbZuDe', '[class*="description"]',
              '#gws-plugins-horizon-jobs__job_details_page',
            ];
            let desc = '';
            for (const sel of descSelectors) {
              const el = document.querySelector(sel);
              if (el && (el as HTMLElement).innerText?.length > 50) {
                desc = (el as HTMLElement).innerText.trim();
                break;
              }
            }

            // Try to find apply link
            const applyEl = document.querySelector('.pMhGee a[href], a[data-ved][href*="http"]') as HTMLAnchorElement;
            const applyUrl = applyEl?.href || '';

            // Via / publisher
            const viaEl = document.querySelector('.Qk80Jf, .nJlQNd');
            let via = (viaEl as HTMLElement)?.innerText?.trim() || '';
            if (via.startsWith('via ')) via = via.substring(4);

            return { desc, applyUrl, via };
          });

          const raw = rawJobs[i];
          const parsed = this.parseExtensions(raw.extensions);

          jobs.push({
            id: this.generateId('google', `${Date.now()}-${i}`),
            title: raw.title,
            company: raw.company,
            location: raw.location || 'US',
            description: details.desc,
            salary: parsed.salary,
            type: parsed.type,
            remote: this.isRemoteJob(raw),
            url: details.applyUrl || `https://www.google.com/search?q=${encodeURIComponent(query)}&ibp=htl;jobs`,
            source: this.name,
            postedDate: this.parseRelativeDate(parsed.posted),
            companyLogo: raw.thumbnail && raw.thumbnail.startsWith('http') ? raw.thumbnail : null,
            via: details.via || null,
            benefits: parsed.benefits,
            qualifications: parsed.qualifications,
          });
        } catch (err) {
          console.log(`[Google Scraper] Error on card ${i}:`, (err as Error).message);
        }
      }

      console.log(`[Google Scraper] Scraped ${jobs.length} jobs`);
      return jobs;
    } catch (err) {
      console.error('[Google Scraper] Error:', (err as Error).message);
      return [];
    } finally {
      await page.close();
    }
  }

  private parseExtensions(extensions: string[]): {
    salary: string | null;
    type: string | null;
    posted: string | null;
    benefits: string[];
    qualifications: string[];
  } {
    let salary: string | null = null;
    let type: string | null = null;
    let posted: string | null = null;
    const benefits: string[] = [];
    const qualifications: string[] = [];

    for (const text of extensions) {
      const lower = text.toLowerCase();
      if (lower.includes('$') || lower.includes('a year') || lower.includes('an hour') || lower.includes('k–') || lower.includes('k-')) {
        salary = text;
      } else if (['full-time', 'part-time', 'contract', 'contractor', 'internship', 'temporary'].includes(lower)) {
        type = text;
      } else if (lower.includes('ago') || lower.match(/\d+\s*(day|hour|week|month)/)) {
        posted = text;
      } else if (lower.includes('insurance') || lower.includes('paid') || lower.includes('401') || lower.includes('dental') || lower.includes('vision') || lower.includes('health')) {
        benefits.push(text);
      } else if (lower.includes('degree') || lower.includes('experience') || lower.includes('no degree')) {
        qualifications.push(text);
      }
    }

    return { salary, type, posted, benefits, qualifications };
  }

  private isRemoteJob(raw: { title: string; location: string; extensions: string[] }): boolean {
    const text = `${raw.title} ${raw.location} ${raw.extensions.join(' ')}`.toLowerCase();
    return text.includes('remote') || text.includes('work from home');
  }

  private parseRelativeDate(text: string | null): string | null {
    if (!text) return null;
    const now = new Date();
    const lower = text.toLowerCase();
    const numMatch = lower.match(/(\d+)/);
    const num = numMatch ? parseInt(numMatch[1], 10) : 0;

    if (lower.includes('hour')) now.setHours(now.getHours() - num);
    else if (lower.includes('day')) now.setDate(now.getDate() - num);
    else if (lower.includes('week')) now.setDate(now.getDate() - num * 7);
    else if (lower.includes('month')) now.setMonth(now.getMonth() - num);
    else return null;

    return now.toISOString();
  }
}
