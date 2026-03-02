import { Router, Request, Response } from 'express';
import { JobAggregator } from '../services/job-aggregator';
import { SearchParams, US_CITIES, JOB_POSITIONS, SALARY_RANGES, JOB_TYPES } from '../types/job';

const router = Router();
const aggregator = new JobAggregator();

router.get('/jobs/search', async (req: Request, res: Response) => {
  try {
    const params: SearchParams = {
      keyword: (req.query.keyword as string) || '',
      location: (req.query.location as string) || 'All US',
      type: (req.query.type as string) || 'All Types',
      remote: req.query.remote === 'true',
      salaryMin: req.query.salaryMin ? parseInt(req.query.salaryMin as string, 10) : null,
      salaryMax: req.query.salaryMax ? parseInt(req.query.salaryMax as string, 10) : null,
      page: parseInt((req.query.page as string) || '1', 10),
      resultsPerPage: parseInt((req.query.resultsPerPage as string) || '20', 10),
      sources: req.query.sources ? (req.query.sources as string).split(',') : [],
    };

    const results = await aggregator.search(params);
    res.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    res.status(500).json({ error: message });
  }
});

router.get('/jobs/sources', (_req: Request, res: Response) => {
  res.json(aggregator.getSources());
});

router.get('/jobs/options', (_req: Request, res: Response) => {
  res.json({
    cities: US_CITIES,
    positions: JOB_POSITIONS,
    salaryRanges: SALARY_RANGES,
    jobTypes: JOB_TYPES,
  });
});

export default router;
