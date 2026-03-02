const API = {
  async searchJobs(params) {
    const query = new URLSearchParams();
    if (params.keyword) query.set('keyword', params.keyword);
    if (params.location && params.location !== 'All US') query.set('location', params.location);
    if (params.type && params.type !== 'All Types') query.set('type', params.type);
    if (params.remote) query.set('remote', 'true');
    if (params.salaryMin) query.set('salaryMin', params.salaryMin);
    if (params.salaryMax) query.set('salaryMax', params.salaryMax);
    if (params.page) query.set('page', params.page);
    if (params.resultsPerPage) query.set('resultsPerPage', params.resultsPerPage);
    if (params.sources && params.sources.length > 0) {
      query.set('sources', params.sources.join(','));
    }

    const response = await fetch(`/api/jobs/search?${query.toString()}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Search failed');
    }
    return response.json();
  },

  async getSources() {
    const response = await fetch('/api/jobs/sources');
    return response.json();
  },

  async getOptions() {
    const response = await fetch('/api/jobs/options');
    return response.json();
  },
};
