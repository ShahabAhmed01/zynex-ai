/**
 * Zynex — Application Logic
 * Complete SPA controller: research flow, SSE progress, report rendering, exports, toasts.
 */
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════
     State
     ═══════════════════════════════════════════════════ */
  const state = {
    currentJobId: null,
    currentSection: 'input',
    eventSource: null,
    progressStages: ['planning', 'researching', 'analyzing', 'composing', 'charting', 'completed'],
    stageAliases: {
      charts: 'charting',
      charting: 'charting',
      done: 'completed',
      completed: 'completed',
    },
    currentStageIndex: -1,
    currentReport: null,
    currentAccessToken: null,
  };

  /* ═══════════════════════════════════════════════════
     Report History (localStorage)
     ═══════════════════════════════════════════════════ */
  const HISTORY_KEY = 'zynex_report_history';
  const MAX_HISTORY = 5;

  function getHistory() {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to read history:', e);
      return [];
    }
  }

  function saveToHistory(report, accessToken) {
    try {
      const history = getHistory();
      const entry = {
        job_id: state.currentJobId,
        topic: report.topic,
        summary: report.summary,
        word_count: report.word_count,
        generated_at: report.generated_at,
        access_token: accessToken,
      };
      
      // Add to beginning, remove oldest if over limit
      history.unshift(entry);
      if (history.length > MAX_HISTORY) {
        history.pop();
      }
      
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      renderHistory();
    } catch (e) {
      console.error('Failed to save to history:', e);
    }
  }

  function renderHistory() {
    const history = getHistory();
    const container = $('#history-list');
    if (!container) return;
    
    if (history.length === 0) {
      container.innerHTML = '<p class="text-muted">No reports yet</p>';
      return;
    }
    
    container.innerHTML = history.map((item, idx) => `
      <div class="history-item" data-idx="${idx}">
        <div class="history-topic">${escapeHtml(item.topic)}</div>
        <div class="history-meta">
          <span>${item.word_count} words</span>
          <span>•</span>
          <span>${new Date(item.generated_at).toLocaleDateString()}</span>
        </div>
      </div>
    `).join('');
    
    // Add click handlers
    $$('.history-item').forEach(el => {
      el.addEventListener('click', () => loadFromHistory(parseInt(el.dataset.idx)));
    });
  }

  function loadFromHistory(idx) {
    const history = getHistory();
    const item = history[idx];
    if (!item) return;
    
    state.currentJobId = item.job_id;
    state.currentAccessToken = item.access_token;
    
    // Load report from server
    fetch(`/api/research/${item.job_id}/report?token=${item.access_token}`)
      .then(res => res.json())
      .then(report => {
        state.currentReport = report;
        renderReport(report);
        showSection('report');
      })
      .catch(err => {
        showToast('Failed to load report from history', 'error');
        console.error(err);
      });
  }

  function generateShareUrl() {
    if (!state.currentJobId || !state.currentAccessToken) {
      showToast('No report to share', 'error');
      return;
    }
    
    const url = `${window.location.origin}?job_id=${state.currentJobId}&token=${state.currentAccessToken}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
      showToast('Share URL copied to clipboard!', 'success');
    }).catch(() => {
      // Fallback: show in alert
      prompt('Copy this share URL:', url);
    });
  }

  function loadFromUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('job_id');
    const token = params.get('token');
    
    if (jobId && token) {
      state.currentJobId = jobId;
      state.currentAccessToken = token;
      
      // Load report from server
      fetch(`/api/research/${jobId}/report?token=${token}`)
        .then(res => res.json())
        .then(report => {
          state.currentReport = report;
          renderReport(report);
          showSection('report');
          // Clear URL params
          window.history.replaceState({}, '', window.location.pathname);
        })
        .catch(err => {
          showToast('Failed to load shared report', 'error');
          console.error(err);
          showSection('input');
        });
    }
  }

  /* ═══════════════════════════════════════════════════
     DOM References
     ═══════════════════════════════════════════════════ */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    sections: {
      input: $('#input-section'),
      progress: $('#progress-section'),
      report: $('#report-section'),
    },
    topicInput: $('#topic-input'),
    researchBtn: $('#research-btn'),
    progressTopic: $('#progress-topic'),
    progressBar: $('#progress-bar'),
    progressPercent: $('#progress-percent'),
    progressSteps: $('#progress-steps'),
    progressLog: $('#progress-log'),
    reportTitle: $('#report-title'),
    reportMeta: $('#report-meta'),
    reportContent: $('#report-content'),
    reportCitations: $('#citations-list'),
    tocNav: $('#toc-nav'),
    shareBtn: $('#share-btn'),
    exportPdfBtn: $('#export-pdf-btn'),
    exportSlidesBtn: $('#export-slides-btn'),
    newResearchBtn: $('#new-research-btn'),
    toastContainer: $('#toast-container'),
  };

  /* ═══════════════════════════════════════════════════
     Section Switching (with animations)
     ═══════════════════════════════════════════════════ */
  function showSection(name) {
    if (state.currentSection === name) return;

    Object.entries(dom.sections).forEach(([key, el]) => {
      if (key === name) {
        el.classList.add('active');
        el.classList.add('section--entering');
        // Remove entering class after animation completes
        setTimeout(() => el.classList.remove('section--entering'), 600);
      } else {
        el.classList.remove('active');
        el.classList.remove('section--entering');
      }
    });

    state.currentSection = name;

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ═══════════════════════════════════════════════════
     Toast Notifications
     ═══════════════════════════════════════════════════ */
  function showToast(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️',
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    dom.toastContainer.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('toast--visible');
    });

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));

    // Auto-dismiss
    const timer = setTimeout(() => removeToast(toast), duration);
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
    toast.addEventListener('mouseleave', () => {
      setTimeout(() => removeToast(toast), 2000);
    });
  }

  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('toast--leaving');
    toast.addEventListener('animationend', () => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    });
  }

  /* ═══════════════════════════════════════════════════
     Start Research
     ═══════════════════════════════════════════════════ */
  async function startResearch() {
    const topic = dom.topicInput.value.trim();
    if (!topic) {
      showToast('Please enter a research topic', 'error');
      dom.topicInput.focus();
      dom.topicInput.classList.add('input-shake');
      setTimeout(() => dom.topicInput.classList.remove('input-shake'), 500);
      return;
    }

    if (topic.length < 3) {
      showToast('Please enter a more descriptive topic (at least 3 characters)', 'error');
      return;
    }

    const depth = document.querySelector('input[name="depth"]:checked')?.value || 'standard';

    // Set button to loading state
    setButtonLoading(true);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, depth }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || `Server error (${res.status})`);
      }

      const data = await res.json();
      state.currentJobId = data.job_id;
      state.currentAccessToken = data.access_token;

      // Transition to progress
      showSection('progress');
      dom.progressTopic.textContent = topic;
      resetProgress();
      connectProgress(data.job_id);

      showToast('Research started! Zynex is working...', 'success');

    } catch (err) {
      console.error('Research start failed:', err);
      showToast(`Failed to start research: ${err.message}`, 'error');
    } finally {
      setButtonLoading(false);
    }
  }

  function setButtonLoading(loading) {
    const btn = dom.researchBtn;
    if (loading) {
      btn.classList.add('btn--loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('btn--loading');
      btn.disabled = false;
    }
  }

  /* ═══════════════════════════════════════════════════
     SSE Progress Connection
     ═══════════════════════════════════════════════════ */
  function connectProgress(jobId) {
    // Close any existing connection
    if (state.eventSource) {
      state.eventSource.close();
      state.eventSource = null;
    }

    const source = new EventSource(`/api/research/${jobId}/status`);
    state.eventSource = source;

    source.onmessage = function (event) {
      try {
        const update = JSON.parse(event.data);
        updateProgressUI(update);

        if (update.stage === 'completed' || update.status === 'completed') {
          source.close();
          state.eventSource = null;
          addLogEntry('Research complete! Loading report...', 'success');
          setTimeout(() => loadReport(jobId), 800);
        }

        if (update.stage === 'failed' || update.status === 'failed') {
          source.close();
          state.eventSource = null;
          showToast('Research failed: ' + (update.message || 'Unknown error'), 'error');
          addLogEntry('Research failed: ' + (update.message || 'Unknown error'), 'error');
          setTimeout(() => showSection('input'), 2000);
        }
      } catch (e) {
        console.error('Failed to parse SSE data:', e);
      }
    };

    source.onerror = function () {
      console.warn('SSE connection error — retrying...');
      // EventSource will auto-reconnect for non-fatal errors.
      // If it permanently fails, we handle it gracefully.
      if (source.readyState === EventSource.CLOSED) {
        state.eventSource = null;
        addLogEntry('Connection lost. Attempting to fetch status...', 'warning');
        // Fallback: poll for status
        pollStatus(jobId);
      }
    };
  }

  /* ── Polling Fallback ─────────────────────────── */
  async function pollStatus(jobId) {
    try {
      const res = await fetch(`/api/research/${jobId}/poll`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'completed') {
          loadReport(jobId);
        } else if (data.status === 'failed') {
          showToast('Research failed: ' + (data.error || 'Unknown error'), 'error');
          showSection('input');
        } else {
          setTimeout(() => pollStatus(jobId), 3000);
        }
      }
    } catch (e) {
      console.error('Poll failed:', e);
      setTimeout(() => pollStatus(jobId), 5000);
    }
  }

  /* ═══════════════════════════════════════════════════
     Progress UI Updates
     ═══════════════════════════════════════════════════ */
  function resetProgress() {
    state.currentStageIndex = -1;

    // Reset progress bar
    dom.progressBar.style.width = '0%';
    dom.progressPercent.textContent = '0%';

    // Reset steps
    $$('.step').forEach((step) => {
      step.classList.remove('step--active', 'step--completed');
    });

    // Clear log
    dom.progressLog.innerHTML = `
      <div class="log-entry log-entry--system">
        <span class="log-time">${getTimeStr()}</span>
        <span class="log-msg">Initializing research pipeline...</span>
      </div>
    `;
  }

  function updateProgressUI(update) {
    // Progress percentage
    if (update.progress !== undefined) {
      const raw = Number(update.progress);
      const pct = Math.min(
        Math.max(Math.round(raw <= 1 ? raw * 100 : raw), 0),
        100
      );
      dom.progressBar.style.width = pct + '%';
      dom.progressPercent.textContent = pct + '%';
    }

    // Stage update
    if (update.stage) {
      const stageName = (
        state.stageAliases[update.stage.toLowerCase()] || update.stage.toLowerCase()
      );
      const stageIndex = state.progressStages.indexOf(stageName);

      if (stageIndex >= 0 && stageIndex > state.currentStageIndex) {
        // Mark previous stages as completed
        for (let i = 0; i <= stageIndex; i++) {
          const stepEl = $(`.step[data-step="${state.progressStages[i]}"]`);
          if (stepEl) {
            if (i < stageIndex) {
              stepEl.classList.add('step--completed');
              stepEl.classList.remove('step--active');
            } else {
              stepEl.classList.add('step--active');
              stepEl.classList.remove('step--completed');
            }
          }
        }
        state.currentStageIndex = stageIndex;
      }
    }

    // Log message
    if (update.message) {
      addLogEntry(update.message, update.type || 'info');
    }
  }

  function addLogEntry(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-entry--${type}`;

    const typeIcons = {
      info: '→',
      success: '✓',
      error: '✗',
      warning: '⚠',
      system: '●',
    };

    entry.innerHTML = `
      <span class="log-time">${getTimeStr()}</span>
      <span class="log-icon">${typeIcons[type] || '→'}</span>
      <span class="log-msg">${escapeHtml(message)}</span>
    `;

    // Animate in
    entry.style.opacity = '0';
    entry.style.transform = 'translateX(-10px)';
    dom.progressLog.appendChild(entry);

    requestAnimationFrame(() => {
      entry.style.transition = 'all 0.3s ease';
      entry.style.opacity = '1';
      entry.style.transform = 'translateX(0)';
    });

    // Auto-scroll
    dom.progressLog.scrollTop = dom.progressLog.scrollHeight;
  }

  /* ═══════════════════════════════════════════════════
     Load & Render Report
     ═══════════════════════════════════════════════════ */
  async function loadReport(jobId) {
    try {
      const res = await fetch(`/api/research/${jobId}/report`);
      if (!res.ok) throw new Error(`Failed to load report (${res.status})`);

      const report = await res.json();
      renderReport(report);
      showSection('report');
      showToast('Report ready!', 'success');

    } catch (err) {
      console.error('Load report failed:', err);
      showToast('Failed to load report: ' + err.message, 'error');
    }
  }

  function renderReport(report) {
    // Title
    dom.reportTitle.textContent = report.topic || report.title || 'Research Report';

    // Meta
    const wordCount = report.word_count || '—';
    const sectionCount = report.sections?.length || 0;
    const sourceCount = report.citations?.length || report.sources?.length || 0;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    dom.reportMeta.textContent = `${date} • ${wordCount} words • ${sectionCount} sections • ${sourceCount} sources`;

    // Build TOC
    let tocHtml = '';
    // Build content
    let contentHtml = '';

    // Summary section
    if (report.summary || report.executive_summary) {
      const summary = report.summary || report.executive_summary;
      const summaryId = 'section-summary';
      tocHtml += `<a href="#${summaryId}" class="toc-link toc-link--active">Executive Summary</a>`;
      contentHtml += `
        <div class="report-section report-section--summary" id="${summaryId}">
          <h3 class="report-section-title">
            <span class="section-number">01</span>
            Executive Summary
          </h3>
          <div class="report-section-body">
            ${formatMarkdown(summary)}
          </div>
        </div>
      `;
    }

    // Main sections
    if (report.sections && Array.isArray(report.sections)) {
      report.sections.forEach((section, idx) => {
        const sectionId = `section-${idx}`;
        const num = String(idx + 2).padStart(2, '0');

        tocHtml += `<a href="#${sectionId}" class="toc-link">${escapeHtml(section.title || `Section ${idx + 1}`)}</a>`;

        let chartsHtml = '';
        if (section.charts && Array.isArray(section.charts)) {
          chartsHtml = section.charts.map((chart) => `
            <figure class="report-chart">
              <img src="${escapeHtml(chart.url || chart.path || chart)}" alt="${escapeHtml(chart.title || 'Chart')}" loading="lazy">
              ${chart.title ? `<figcaption>${escapeHtml(chart.title)}</figcaption>` : ''}
            </figure>
          `).join('');
        }

        // If chart_url exists at section level
        if (section.chart_url) {
          chartsHtml += `
            <figure class="report-chart">
              <img src="${escapeHtml(section.chart_url)}" alt="Chart" loading="lazy">
            </figure>
          `;
        }

        contentHtml += `
          <div class="report-section" id="${sectionId}">
            <h3 class="report-section-title">
              <span class="section-number">${num}</span>
              ${escapeHtml(section.title || `Section ${idx + 1}`)}
            </h3>
            <div class="report-section-body">
              ${formatMarkdown(section.content || section.body || '')}
              ${chartsHtml}
            </div>
          </div>
        `;
      });
    }

    dom.tocNav.innerHTML = tocHtml;
    dom.reportContent.innerHTML = contentHtml;

    // Citations
    const citations = report.citations || report.sources || [];
    if (citations.length > 0) {
      let citationsHtml = '';
      citations.forEach((cite, idx) => {
        const title = cite.title || cite.name || cite.url || `Source ${idx + 1}`;
        const url = cite.url || cite.link || '#';
        const snippet = cite.snippet || cite.description || '';

        citationsHtml += `
          <div class="citation-item">
            <span class="citation-num">[${idx + 1}]</span>
            <div class="citation-body">
              <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="citation-title">
                ${escapeHtml(title)}
              </a>
              ${snippet ? `<p class="citation-snippet">${escapeHtml(snippet)}</p>` : ''}
              <span class="citation-url">${escapeHtml(url)}</span>
            </div>
          </div>
        `;
      });
      dom.reportCitations.innerHTML = citationsHtml;
      $('#report-citations').style.display = 'block';
    } else {
      $('#report-citations').style.display = 'none';
    }

    // Animate sections in sequentially
    animateReportSections();

    // Setup TOC scroll highlighting
    setupTocHighlighting();

    // Render charts
    renderCharts(report);

    // Save to history
    saveToHistory(report, state.currentAccessToken);
  }

  function renderCharts(report) {
    const chartsBase64 = report.charts_base64 || {};
    const chartTitles = Object.keys(chartsBase64);
    if (chartTitles.length === 0) return;

    let chartsHtml = '<div class="charts-grid">';
    chartTitles.forEach(title => {
      const b64 = chartsBase64[title];
      chartsHtml += `
        <figure class="report-chart-figure">
          <img src="data:image/png;base64,${b64}"
               alt="${escapeHtml(title)}"
               class="report-chart-img"
               loading="lazy">
          <figcaption class="chart-caption">${escapeHtml(title)}</figcaption>
        </figure>
      `;
    });
    chartsHtml += '</div>';

    // Insert after report content before citations
    const chartsSection = document.createElement('div');
    chartsSection.className = 'report-section report-section--charts';
    chartsSection.id = 'section-charts';
    chartsSection.innerHTML = `
      <h3 class="report-section-title">
        <span class="section-number">📊</span>
        Data Visualizations
      </h3>
      <div class="report-section-body">${chartsHtml}</div>
    `;
    dom.reportContent.appendChild(chartsSection);

    // Add to TOC
    dom.tocNav.innerHTML += `<a href="#section-charts" class="toc-link">📊 Visualizations</a>`;
  }

  function animateReportSections() {
    const sections = $$('.report-section');
    sections.forEach((section, idx) => {
      section.style.opacity = '0';
      section.style.transform = 'translateY(20px)';
      setTimeout(() => {
        section.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
      }, 100 + idx * 120);
    });
  }

  function setupTocHighlighting() {
    const tocLinks = $$('.toc-link');
    const sectionEls = $$('.report-section');

    if (!sectionEls.length || !tocLinks.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          tocLinks.forEach((link) => {
            link.classList.toggle('toc-link--active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });

    sectionEls.forEach((section) => observer.observe(section));

    // Click handling for smooth scroll
    tocLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════════
     Export Handlers
     ═══════════════════════════════════════════════════ */
  function exportPDF() {
    if (!state.currentJobId) {
      showToast('No report available to export', 'warning');
      return;
    }
    showToast('Generating PDF...', 'info');
    window.open(`/api/research/${state.currentJobId}/export/pdf`, '_blank');
  }

  function exportSlides() {
    if (!state.currentJobId) {
      showToast('No report available to export', 'warning');
      return;
    }
    showToast('Generating slides...', 'info');
    window.open(`/api/research/${state.currentJobId}/export/slides`, '_blank');
  }

  function newResearch() {
    // Close any SSE connection
    if (state.eventSource) {
      state.eventSource.close();
      state.eventSource = null;
    }
    state.currentJobId = null;
    state.currentStageIndex = -1;
    dom.topicInput.value = '';
    showSection('input');
    dom.topicInput.focus();
  }

  /* ═══════════════════════════════════════════════════
     Utility Functions
     ═══════════════════════════════════════════════════ */
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatMarkdown(text) {
    if (!text) return '';
    // Step 1: Extract and protect links before escaping
    const links = [];
    let processed = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      const idx = links.length;
      links.push({ text: linkText, url: url });
      return `%%LINK_${idx}%%`;
    });

    // Step 2: Escape HTML in the remaining text
    let html = escapeHtml(processed);

    // Step 3: Restore links with safe HTML
    links.forEach(({ text, url }, idx) => {
      const safeText = escapeHtml(text);
      const safeUrl = url.replace(/"/g, '%22');
      html = html.replace(
        `%%LINK_${idx}%%`,
        `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`
      );
    });

    // Step 4: Apply remaining markdown (on escaped text, no URL breakage)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    html = html.replace(/^### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^## (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    return '<p>' + html + '</p>';
  }

  function getTimeStr() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /* ═══════════════════════════════════════════════════
     Depth Selector Enhancement
     ═══════════════════════════════════════════════════ */
  function setupDepthSelector() {
    const options = $$('.depth-option');
    options.forEach((option) => {
      const radio = option.querySelector('input[type="radio"]');
      if (radio.checked) option.classList.add('active');

      option.addEventListener('click', () => {
        options.forEach((o) => o.classList.remove('active'));
        option.classList.add('active');
        radio.checked = true;
      });
    });
  }

  /* ═══════════════════════════════════════════════════
     Keyboard Shortcuts
     ═══════════════════════════════════════════════════ */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Enter to start research
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && state.currentSection === 'input') {
        e.preventDefault();
        startResearch();
      }
      // Escape to go back to input
      if (e.key === 'Escape' && state.currentSection === 'report') {
        newResearch();
      }
    });
  }

  /* ═══════════════════════════════════════════════════
     Input Focus Effects
     ═══════════════════════════════════════════════════ */
  function setupInputEffects() {
    const inputCard = $('.input-card');
    const input = dom.topicInput;

    input.addEventListener('focus', () => {
      inputCard.classList.add('input-card--focused');
    });

    input.addEventListener('blur', () => {
      inputCard.classList.remove('input-card--focused');
    });
  }

  /* ═══════════════════════════════════════════════════
     Feature Card Hover Tilt Effect
     ═══════════════════════════════════════════════════ */
  function setupFeatureCards() {
    const cards = $$('.feature-card');

    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -4;
        const rotateY = ((x - centerX) / centerX) * 4;

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;

        // Move glow
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* ═══════════════════════════════════════════════════
     Entrance Animations (on load)
     ═══════════════════════════════════════════════════ */
  function playEntranceAnimations() {
    // Stagger feature cards
    const cards = $$('.feature-card');
    cards.forEach((card, idx) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      setTimeout(() => {
        card.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 300 + idx * 100);
    });

    // Animate hero text
    const heroTitle = $('.hero-title');
    const heroSubtitle = $('.hero-subtitle');
    const inputCard = $('.input-card');
    const heroBadge = $('.hero-badge');

    [heroBadge, heroTitle, heroSubtitle, inputCard].forEach((el, idx) => {
      if (!el) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      setTimeout(() => {
        el.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 100 + idx * 120);
    });
  }

  /* ═══════════════════════════════════════════════════
     Event Listeners
     ═══════════════════════════════════════════════════ */
  function bindEvents() {
    // Research button
    dom.researchBtn.addEventListener('click', startResearch);

    // Enter key on input
    dom.topicInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') startResearch();
    });

    // Export buttons
    dom.shareBtn.addEventListener('click', generateShareUrl);
    dom.exportPdfBtn.addEventListener('click', exportPDF);
    dom.exportSlidesBtn.addEventListener('click', exportSlides);

    // New research
    dom.newResearchBtn.addEventListener('click', newResearch);
  }

  /* ═══════════════════════════════════════════════════
     Initialization
     ═══════════════════════════════════════════════════ */
  function init() {
    bindEvents();
    setupDepthSelector();
    setupKeyboardShortcuts();
    setupInputEffects();
    setupFeatureCards();

    // Load report history
    renderHistory();

    // Load shared report from URL params
    loadFromUrlParams();

    // Play entrance animations after a brief delay
    requestAnimationFrame(() => {
      setTimeout(playEntranceAnimations, 100);
    });

    // Focus input
    setTimeout(() => dom.topicInput.focus(), 800);
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
