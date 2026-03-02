const UI = {
  els: {
    form: () => document.getElementById('search-form'),
    keyword: () => document.getElementById('keyword'),
    position: () => document.getElementById('position'),
    location: () => document.getElementById('location'),
    jobType: () => document.getElementById('job-type'),
    salaryRange: () => document.getElementById('salary-range'),
    remoteOnly: () => document.getElementById('remote-only'),
    resultsPerPage: () => document.getElementById('results-per-page'),
    sourcesCheckboxes: () => document.getElementById('sources-checkboxes'),
    searchBtn: () => document.getElementById('search-btn'),
    loading: () => document.getElementById('loading'),
    noResults: () => document.getElementById('no-results'),
    errorMessage: () => document.getElementById('error-message'),
    jobResults: () => document.getElementById('job-results'),
    pagination: () => document.getElementById('pagination'),
    sourceStatus: () => document.getElementById('source-status'),
    resultsInfo: () => document.getElementById('results-info'),
  },

  populateSelect(selectEl, options) {
    selectEl.innerHTML = '';
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      selectEl.appendChild(o);
    });
  },

  populateSalaryRanges(selectEl, ranges) {
    selectEl.innerHTML = '';
    ranges.forEach((r, i) => {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = r.label;
      selectEl.appendChild(o);
    });
  },

  populateSources(sources) {
    const container = this.els.sourcesCheckboxes();
    container.innerHTML = '';
    sources.forEach(source => {
      const label = document.createElement('label');
      if (!source.available) label.classList.add('unavailable');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = source.name;
      cb.checked = source.available;
      cb.disabled = !source.available;
      const span = document.createElement('span');
      span.textContent = source.name + (source.available ? '' : ' (no key)');
      label.appendChild(cb);
      label.appendChild(span);
      container.appendChild(label);
    });
  },

  getSelectedSources() {
    const checkboxes = this.els.sourcesCheckboxes().querySelectorAll('input:checked');
    return Array.from(checkboxes).map(cb => cb.value);
  },

  showLoading() {
    this.els.loading().style.display = 'block';
    this.els.noResults().style.display = 'none';
    this.els.errorMessage().style.display = 'none';
    this.els.jobResults().innerHTML = '';
    this.els.pagination().style.display = 'none';
    this.els.sourceStatus().style.display = 'none';
    this.els.resultsInfo().style.display = 'none';
    this.els.searchBtn().disabled = true;
  },

  hideLoading() {
    this.els.loading().style.display = 'none';
    this.els.searchBtn().disabled = false;
  },

  showError(message) {
    this.hideLoading();
    this.els.errorMessage().textContent = message;
    this.els.errorMessage().style.display = 'block';
  },

  sourceClass(name) {
    return name.toLowerCase().replace(/\s+/g, '');
  },

  renderSourceStatus(sources) {
    const container = this.els.sourceStatus();
    container.innerHTML = '';
    sources.forEach(source => {
      const badge = document.createElement('span');
      let cls = this.sourceClass(source.name);
      if (source.error) cls = 'error';
      if (!source.available) cls = 'unavailable';
      badge.className = `source-badge ${cls}`;
      if (source.error) {
        badge.textContent = `${source.name}: Error`;
        badge.title = source.error;
      } else if (!source.available) {
        badge.textContent = `${source.name}: No key`;
      } else {
        badge.textContent = `${source.name}: ${source.count} jobs`;
      }
      container.appendChild(badge);
    });
    container.style.display = 'flex';
  },

  renderResults(data) {
    this.hideLoading();
    this.renderSourceStatus(data.sources);

    if (data.jobs.length === 0) {
      this.els.noResults().style.display = 'block';
      this.els.resultsInfo().style.display = 'none';
      return;
    }

    // Results info
    const start = (data.page - 1) * data.pageSize + 1;
    const end = Math.min(data.page * data.pageSize, data.total);
    this.els.resultsInfo().textContent = `Showing ${start}-${end} of ${data.total} jobs`;
    this.els.resultsInfo().style.display = 'block';

    // Job cards
    const container = this.els.jobResults();
    container.innerHTML = '';
    data.jobs.forEach(job => {
      container.appendChild(this.createJobCard(job));
    });

    // Pagination
    this.renderPagination(data.page, data.totalPages);
  },

  getLogoColor(name) {
    const colors = ['#c62828','#4527a0','#1565c0','#00838f','#2e7d32','#e65100','#4e342e','#37474f','#ad1457','#283593'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  },

  createJobCard(job) {
    const card = document.createElement('div');
    card.className = `job-card source-${this.sourceClass(job.source)}`;

    // Company logo or initial
    const initial = (job.company || '?')[0].toUpperCase();
    const bgColor = this.getLogoColor(job.company);
    const logoHtml = job.companyLogo
      ? `<img class="company-logo" src="${this.escapeHtml(job.companyLogo)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="company-initial" style="display:none;background:${bgColor}">${initial}</span>`
      : `<span class="company-initial" style="background:${bgColor}">${initial}</span>`;

    // Via line
    const viaText = job.via ? ` &middot; via ${this.escapeHtml(job.via)}` : '';

    // Tags row: date, salary, type, qualifications, benefits
    const tags = [];
    const dateStr = job.postedDate ? this.formatDate(job.postedDate) : '';
    if (dateStr) tags.push(`<span class="job-tag job-tag-date">${dateStr}</span>`);
    if (job.salary) tags.push(`<span class="job-tag job-tag-salary">${this.escapeHtml(job.salary)}</span>`);
    if (job.type) tags.push(`<span class="job-tag job-tag-type">${this.escapeHtml(job.type)}</span>`);
    if (job.qualifications) {
      job.qualifications.forEach(q => tags.push(`<span class="job-tag">${this.escapeHtml(q)}</span>`));
    }
    if (job.benefits) {
      job.benefits.slice(0, 3).forEach(b => {
        const short = b.length > 30 ? b.slice(0, 28) + '...' : b;
        tags.push(`<span class="job-tag job-tag-benefit">${this.escapeHtml(short)}</span>`);
      });
    }
    if (job.remote) tags.push(`<span class="job-tag job-tag-remote">Remote</span>`);

    const descHtml = job.description ? this.escapeHtml(job.description) : '';

    card.innerHTML = `
      <div class="job-card-row">
        <div class="job-logo-col">${logoHtml}</div>
        <div class="job-info-col">
          <a href="${this.escapeHtml(job.url)}" target="_blank" rel="noopener" class="job-title">${this.escapeHtml(job.title)}</a>
          <div class="job-company">${this.escapeHtml(job.company)}</div>
          <div class="job-location-via">${this.escapeHtml(job.location)}${viaText}</div>
          <div class="job-tags">${tags.join('')}</div>
          ${descHtml ? `
          <div class="job-desc-preview">${this.escapeHtml(this.truncate(job.description, 200))}</div>
          <button class="job-desc-toggle" onclick="UI.toggleDesc(this)">Show full description</button>
          <div class="job-desc-full" style="display:none;">${descHtml}</div>
          ` : ''}
        </div>
      </div>
    `;
    return card;
  },

  renderPagination(currentPage, totalPages) {
    const container = this.els.pagination();
    container.innerHTML = '';
    if (totalPages <= 1) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';

    // Prev
    const prev = document.createElement('button');
    prev.textContent = 'Prev';
    prev.disabled = currentPage <= 1;
    prev.addEventListener('click', () => window.app.goToPage(currentPage - 1));
    container.appendChild(prev);

    // Page numbers
    const pages = this.getPageNumbers(currentPage, totalPages);
    pages.forEach(p => {
      if (p === '...') {
        const dots = document.createElement('span');
        dots.textContent = '...';
        dots.style.padding = '8px 4px';
        container.appendChild(dots);
      } else {
        const btn = document.createElement('button');
        btn.textContent = p;
        if (p === currentPage) btn.classList.add('active');
        btn.addEventListener('click', () => window.app.goToPage(p));
        container.appendChild(btn);
      }
    });

    // Next
    const next = document.createElement('button');
    next.textContent = 'Next';
    next.disabled = currentPage >= totalPages;
    next.addEventListener('click', () => window.app.goToPage(currentPage + 1));
    container.appendChild(next);
  },

  toggleDesc(btn) {
    const fullDesc = btn.nextElementSibling;
    const preview = btn.previousElementSibling;
    if (fullDesc.style.display === 'none') {
      fullDesc.style.display = 'block';
      preview.style.display = 'none';
      btn.textContent = 'Hide description';
    } else {
      fullDesc.style.display = 'none';
      preview.style.display = '-webkit-box';
      btn.textContent = 'Show full description';
    }
  },

  getPageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  },

  formatDate(iso) {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Yesterday';
      if (diff < 7) return `${diff} days ago`;
      if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  },

  truncate(str, len) {
    if (!str) return '';
    if (str.length <= len) return str;
    return str.slice(0, len).trimEnd() + '...';
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
