window.app = {
  currentPage: 1,
  salaryRanges: [],

  async init() {
    try {
      const [options, sources] = await Promise.all([
        API.getOptions(),
        API.getSources(),
      ]);

      this.salaryRanges = options.salaryRanges;

      UI.populateSelect(UI.els.position(), options.positions);
      UI.populateSelect(UI.els.location(), options.cities);
      UI.populateSelect(UI.els.jobType(), options.jobTypes);
      UI.populateSalaryRanges(UI.els.salaryRange(), options.salaryRanges);
      UI.populateSources(sources);
    } catch (err) {
      console.error('Failed to load options:', err);
    }

    UI.els.form().addEventListener('submit', (e) => {
      e.preventDefault();
      this.currentPage = 1;
      this.search();
    });
  },

  getSearchParams() {
    const salaryIdx = parseInt(UI.els.salaryRange().value, 10);
    const salary = this.salaryRanges[salaryIdx] || {};

    const position = UI.els.position().value;
    const keyword = UI.els.keyword().value.trim();
    // Combine keyword with position if a specific position is selected
    let searchKeyword = keyword;
    if (position && position !== 'All Positions') {
      searchKeyword = keyword ? `${keyword} ${position}` : position;
    }

    return {
      keyword: searchKeyword,
      location: UI.els.location().value,
      type: UI.els.jobType().value,
      remote: UI.els.remoteOnly().checked,
      salaryMin: salary.min || null,
      salaryMax: salary.max || null,
      page: this.currentPage,
      resultsPerPage: UI.els.resultsPerPage().value,
      sources: UI.getSelectedSources(),
    };
  },

  async search() {
    UI.showLoading();
    try {
      const params = this.getSearchParams();
      const data = await API.searchJobs(params);
      UI.renderResults(data);
    } catch (err) {
      UI.showError(err.message || 'Search failed. Please try again.');
    }
  },

  goToPage(page) {
    this.currentPage = page;
    this.search();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
};

document.addEventListener('DOMContentLoaded', () => window.app.init());
