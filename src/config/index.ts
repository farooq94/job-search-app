import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  cacheTtl: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10) * 1000,
  adzuna: {
    appId: process.env.ADZUNA_APP_ID || '',
    appKey: process.env.ADZUNA_APP_KEY || '',
    baseUrl: 'https://api.adzuna.com/v1/api/jobs/us/search',
  },
  jsearch: {
    apiKey: process.env.JSEARCH_API_KEY || '',
    baseUrl: 'https://jsearch.p.rapidapi.com/search',
  },
  muse: {
    baseUrl: 'https://www.themuse.com/api/public/jobs',
  },
  remoteok: {
    baseUrl: 'https://remoteok.com/api',
    cacheTtl: 3600 * 1000, // 1 hour
  },
};
