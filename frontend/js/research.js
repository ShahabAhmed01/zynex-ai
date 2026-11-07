/**
 * Research — form, live pipeline progress, report rendering, history, exports.
 */

import { escHtml, renderMarkdown } from './markdown.js';
import { showToast } from './ui.js';

const HISTORY_KEY = 'zynex_research_history';
const MAX_HISTORY = 20;
const STAGES = ['planning', 'researching', 'analyzing', 'composing', 'charting', 'completed'];
const STAGE_LABELS = {
  planning: 'Planning',
  researching: 'Searching',
  analyzing: 'Analyzing',
  composing: 'Composing',
  charting: 'Charting',
  completed: 'Complete',
};

let history = loadHistory();
let currentJob = null;
let currentReport = null;
let running = false;
let stream = null;
let pollTimer = null;
let pollGeneration = 0;
let lastStage = 'planning';

const $ = (id) => document.getElementById(id);

// ── History ────────────────────────────────────────────────────────────────

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (record) => record && typeof record.jobId === 'string' && typeof record.token === 'string'
    );
  } catch {
    return [];
  }
}

function persistHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // Quota or private mode — history simply won't survive a reload.
  }
}

function addHistoryRecord(report) {
  if (!currentJob) return;
  const record = {
    jobId: currentJob.id,
    token: currentJob.token,
    topic: report.topic || currentJob.topic || 'Untitled research',
    date: Date.now(),
    demoMode: Boolean(report.demo_mode),
    model: report.model || '',
    words: report.word_count || 0,
    citations: Array.isArray(report.citations) ? report.citations.length : 0,
    sections: Array.isArray(report.sections) ? report.sections.length : 0,
  };
  history = [record, ...history.filter((item) => item.jobId !== record.jobId)].slice(
    0,
    MAX_HISTORY
  );
  persistHistory();
  renderResearchHistory();
}

function removeHistoryRecord(jobId) {
  history = history.filter((record) => record.jobId !== jobId);
  persistHistory();
  renderResearchHistory();
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function renderResearchHistory() {
  const list = $('researchHistoryList');
  if (!list) return;

  list.innerHTML = '';
  if (history.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'sidebar__empty';
    empty.textContent = 'No research reports yet';
    list.appendChild(empty);
    return;
  }

  const label = document.createElement('div');
  label.className = 'sidebar__date-label';
  label.textContent = 'Recent reports';
  list.appendChild(label);

  history.forEach((record) => {
    const item = document.createElement('div');
    item.className =
      'sidebar__conversation' +
      (currentJob?.id === record.jobId ? ' sidebar__conversation--active' : '');
    item.title = record.topic;
    item.innerHTML = `
      <svg class="sidebar__conversation-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <div class="sidebar__conversation-body">
        <div class="sidebar__conversation-title">${escHtml(record.topic)}</div>
        <div class="sidebar__conversation-time">${formatRelativeTime(record.date)}</div>
      </div>
      <button class="sidebar__conversation-delete" type="button" aria-label="Remove report from history">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;

    item.addEventListener('click', (event) => {
      if (event.target.closest('.sidebar__conversation-delete')) return;
      openHistoryRecord(record);
    });

    item.querySelector('.sidebar__conversation-delete').addEventListener('click', (event) => {
      event.stopPropagation();
      removeHistoryRecord(record.jobId);
      if (currentJob?.id === record.jobId) {
        showResearchForm();
      }
      showToast('Report removed from history', 'info');
    });

    list.appendChild(item);
  });
}

// ── View switching ─────────────────────────────────────────────────────────

function requestResearchView() {
  document.dispatchEvent(new CustomEvent('zynex:view', { detail: { view: 'research' } }));
}

export function showResearchForm() {
  stopConnections();
  currentJob = null;
  currentReport = null;
  lastStage = 'planning';

  $('researchFormView').hidden = false;
  $('researchProgressView').hidden = true;
  $('researchReportView').hidden = true;
  $('researchError').hidden = true;
  $('researchError').textContent = '';
  resetStageList();

  const topic = $('researchTopic');
  if (topic) {
    window.setTimeout(() => topic.focus(), 60);
  }
}

function showProgressView(topic) {
  $('researchFormView').hidden = true;
  $('researchReportView').hidden = true;
  $('researchProgressView').hidden = false;
  $('progressTopic').textContent = topic || 'Research in progress';
}

function showReportView(report) {
  $('researchFormView').hidden = true;
  $('researchProgressView').hidden = true;
  $('researchReportView').hidden = false;
  renderReport(report);
}

function resetProgress(topic) {
  lastStage = 'planning';
  const bar = $('researchProgressBar');
  const track = $('researchProgressTrack');
  const message = $('researchProgressMessage');
  const error = $('researchError');

  if (bar) {
    bar.style.width = '0%';
    bar.classList.remove('research-progress__bar--error');
  }
  if (track) track.setAttribute('aria-valuenow', '0');
  if (message) message.textContent = 'Starting the pipeline…';
  if (error) {
    error.hidden = true;
    error.textContent = '';
  }
  $('progressTopic').textContent = topic || 'Research in progress';
  resetStageList();
}

function resetStageList() {
  document.querySelectorAll('#stageList .stage-item').forEach((item) => {
    item.classList.remove('stage-item--active', 'stage-item--done', 'stage-item--error');
  });
}

// ── Progress rendering ─────────────────────────────────────────────────────

function applyProgress(update) {
  if (!update || typeof update !== 'object') return;

  if (typeof update.progress === 'number') {
    const percent = Math.max(0, Math.min(100, Math.round(update.progress * 100)));
    const bar = $('researchProgressBar');
    const track = $('researchProgressTrack');
    if (bar) bar.style.width = `${percent}%`;
    if (track) track.setAttribute('aria-valuenow', String(percent));
  }

  const message = $('researchProgressMessage');
  if (message && update.message) message.textContent = update.message;

  if (update.stage && update.stage !== 'failed') {
    lastStage = update.stage;
    updateStageList(update.stage);
  }
}

function updateStageList(stage) {
  const currentIndex = STAGES.indexOf(stage);
  if (currentIndex === -1) return;

  STAGES.forEach((name, index) => {
    const item = document.querySelector(`#stageList [data-stage="${name}"]`);
    if (!item) return;
    item.classList.remove('stage-item--active', 'stage-item--done', 'stage-item--error');
    if (stage === 'completed' || index < currentIndex) {
      item.classList.add('stage-item--done');
    } else if (index === currentIndex) {
      item.classList.add('stage-item--active');
    }
  });
}

function markStagesFailed() {
  const failedIndex = Math.max(0, STAGES.indexOf(lastStage));
  STAGES.forEach((name, index) => {
    const item = document.querySelector(`#stageList [data-stage="${name}"]`);
    if (!item) return;
    item.classList.remove('stage-item--active', 'stage-item--done', 'stage-item--error');
    if (index < failedIndex) item.classList.add('stage-item--done');
    else if (index === failedIndex) item.classList.add('stage-item--error');
  });
}

function showProgressError(message) {
  running = false;
  const error = $('researchError');
  const bar = $('researchProgressBar');
  const track = $('researchProgressTrack');
  const progressMessage = $('researchProgressMessage');

  if (error) {
    error.hidden = false;
    error.textContent = message || 'Research failed. Check the server logs and try again.';
  }
  if (progressMessage) progressMessage.textContent = 'Research stopped.';
  if (bar) {
    bar.style.width = '100%';
    bar.classList.add('research-progress__bar--error');
  }
  if (track) track.setAttribute('aria-valuenow', '100');
  markStagesFailed();
  showToast(message || 'Research failed.', 'error');
}

// ── Pipeline start ─────────────────────────────────────────────────────────

async function startResearch(event) {
  event.preventDefault();
  if (running) return;

  const topic = $('researchTopic')?.value.trim() || '';
  if (topic.length < 3) {
    showToast('Enter a research topic of at least 3 characters.', 'error');
    $('researchTopic')?.focus();
    return;
  }

  const depth =
    document.querySelector('input[name="depth"]:checked')?.value || 'standard';
  const startButton = $('startResearchBtn');

  resetProgress(topic);
  showProgressView(topic);
  running = true;
  if (startButton) startButton.disabled = true;

  try {
    const response = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ topic, depth }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || `Could not start research (HTTP ${response.status}).`);
    }

    currentJob = {
      id: data.job_id,
      token: data.access_token,
      topic: data.topic || topic,
      demoMode: Boolean(data.demo_mode),
    };
    currentReport = null;
    openStream();
  } catch (error) {
    showProgressError(error.message || 'Could not start research.');
  } finally {
    if (startButton) startButton.disabled = false;
  }
}

// ── SSE + polling ──────────────────────────────────────────────────────────

function closeStream() {
  if (stream) {
    stream.close();
    stream = null;
  }
}

function stopConnections() {
  pollGeneration += 1;
  closeStream();
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  running = false;
}

function openStream() {
  if (!currentJob) return;
  const job = currentJob;
  const generation = ++pollGeneration;
  let settled = false;

  try {
    stream = new EventSource(
      `/api/research/${encodeURIComponent(job.id)}/status?token=${encodeURIComponent(job.token)}`
    );
  } catch {
    startPolling(job, generation);
    return;
  }

  stream.onmessage = async (event) => {
    if (settled || generation !== pollGeneration) return;

    let update;
    try {
      update = JSON.parse(event.data);
    } catch {
      return;
    }

    applyProgress(update);

    if (update.stage === 'completed') {
      settled = true;
      closeStream();
      await finishJob(job, generation);
    } else if (update.stage === 'failed') {
      settled = true;
      closeStream();
      showProgressError(update.message || 'Research failed.');
    }
  };

  stream.onerror = () => {
    if (settled || generation !== pollGeneration) return;
    settled = true;
    closeStream();
    startPolling(job, generation);
  };
}

function startPolling(job, generation) {
  if (generation !== pollGeneration) return;
  let failures = 0;

  const poll = async () => {
    if (generation !== pollGeneration || currentJob?.id !== job.id) return;

    try {
      const response = await fetch(
        `/api/research/${encodeURIComponent(job.id)}/poll?token=${encodeURIComponent(job.token)}`,
        { cache: 'no-store', headers: { Accept: 'application/json' } }
      );
      if (!response.ok) {
        throw new Error(`Status request failed (HTTP ${response.status}).`);
      }

      const data = await response.json();
      if (generation !== pollGeneration) return;

      if (data.progress) applyProgress(data.progress);

      if (data.status === 'completed' || data.report_ready) {
        await finishJob(job, generation);
        return;
      }
      if (data.status === 'failed') {
        showProgressError(data.error || 'Research failed.');
        return;
      }
      failures = 0;
    } catch (error) {
      failures += 1;
      if (failures >= 5) {
        showProgressError(`Lost contact with the research job. ${error.message}`);
        return;
      }
    }

    pollTimer = window.setTimeout(poll, 1500);
  };

  poll();
}

async function fetchReport(job) {
  const response = await fetch(
    `/api/research/${encodeURIComponent(job.id)}/report?token=${encodeURIComponent(job.token)}`,
    { cache: 'no-store', headers: { Accept: 'application/json' } }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(
      data.detail || `Report request failed (HTTP ${response.status}).`
    );
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function finishJob(job, generation) {
  applyProgress({
    stage: 'completed',
    message: 'Report ready.',
    progress: 1,
  });

  try {
    const report = await fetchReport(job);
    if (generation !== pollGeneration) return;
    currentReport = report;
    addHistoryRecord(report);
    showReportView(report);
    showToast('Research complete — your report is ready.', 'success');
  } catch (error) {
    if (generation !== pollGeneration) return;
    showProgressError(error.message || 'The report could not be loaded.');
  } finally {
    if (generation === pollGeneration) running = false;
  }
}

// ── Saved report loading ───────────────────────────────────────────────────

async function openHistoryRecord(record) {
  requestResearchView();

  if (currentReport && currentJob?.id === record.jobId) {
    showReportView(currentReport);
    return;
  }

  stopConnections();
  currentJob = { id: record.jobId, token: record.token, topic: record.topic };
  currentReport = null;
  resetProgress(record.topic);
  showProgressView(record.topic);
  $('researchProgressMessage').textContent = 'Loading saved report…';

  try {
    const report = await fetchReport(currentJob);
    currentReport = report;
    showReportView(report);
  } catch (error) {
    if (error.status === 403 || error.status === 404) {
      removeHistoryRecord(record.jobId);
      showToast('That report expired (the server keeps jobs for two hours).', 'error');
    } else {
      showToast(error.message || 'Could not load the saved report.', 'error');
    }
    showResearchForm();
  }
}

// ── Report rendering ───────────────────────────────────────────────────────

function safeUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return escHtml(url);
    }
  } catch {
    // Invalid URLs become inert.
  }
  return '#';
}

function linkCitations(html) {
  return html.replace(
    /\[(\d{1,3})\]/g,
    (match, number) =>
      `<a class="citation-ref" href="#citation-${number}" aria-label="Source ${number}">[${number}]</a>`
  );
}

function renderReport(report) {
  const sections = Array.isArray(report.sections) ? report.sections : [];
  const citations = Array.isArray(report.citations) ? report.citations : [];
  const charts = Array.isArray(report.charts) ? report.charts : [];
  const chartImages = report.charts_base64 || {};

  $('reportTopic').textContent = report.topic || 'Research report';

  const badge = $('reportModeBadge');
  if (badge) {
    const demo = Boolean(report.demo_mode);
    badge.textContent = demo ? 'Demo narrative' : 'Live AI report';
    badge.classList.toggle('report-badge--demo', demo);
    badge.title = report.model ? `Model: ${report.model}` : '';
  }

  const generated = report.generated_at ? new Date(report.generated_at) : null;
  $('reportDate').textContent =
    generated && !Number.isNaN(generated.getTime())
      ? generated.toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '';

  const stats = [];
  if (report.word_count) stats.push(`${Number(report.word_count).toLocaleString()} words`);
  stats.push(`${sections.length} section${sections.length === 1 ? '' : 's'}`);
  stats.push(`${citations.length} source${citations.length === 1 ? '' : 's'}`);
  if (report.model && !report.demo_mode) stats.push(report.model);
  $('reportStats').textContent = stats.join(' · ');

  let html = '';

  if (report.demo_mode) {
    html += `
      <div class="report-disclaimer">
        <strong>Demo narrative.</strong> The text below was generated from built-in
        templates and the source summaries are simulated. Web search and the cited
        sources are real. Activate free AI for live analysis and writing.
      </div>
    `;
  }

  if (report.summary) {
    html += `<div class="report-summary">${renderMarkdown(report.summary)}</div>`;
  }

  if (sections.length === 0) {
    html += '<p class="report-empty">This report has no sections.</p>';
  }

  sections.forEach((section) => {
    html += `
      <section class="report-section">
        <h2>${escHtml(section.title || 'Untitled section')}</h2>
        <div class="report-section__content">
          ${linkCitations(renderMarkdown(section.content || ''))}
        </div>
      </section>
    `;
  });

  const availableCharts = charts.filter((chart) => chart && chartImages[chart.title]);
  if (availableCharts.length > 0) {
    html += '<section class="report-charts"><h2>Data &amp; charts</h2><div class="report-charts__grid">';
    availableCharts.forEach((chart) => {
      html += `
        <figure class="report-chart">
          <img src="data:image/png;base64,${chartImages[chart.title]}" alt="${escHtml(
            `Chart: ${chart.title}`
          )}" loading="lazy">
          <figcaption>${escHtml(chart.title)}</figcaption>
        </figure>
      `;
    });
    html += '</div></section>';
  }

  if (citations.length > 0) {
    html += '<section class="report-citations"><h2>Sources</h2><ol class="report-citations__list">';
    citations.forEach((citation) => {
      const number = citation.index ?? citations.indexOf(citation) + 1;
      html += `
        <li class="report-citation" id="citation-${number}">
          <span class="report-citation__index">${number}</span>
          <div class="report-citation__body">
            <a href="${safeUrl(citation.url)}" target="_blank" rel="noopener noreferrer">${escHtml(
              citation.title || citation.url || 'Source'
            )}</a>
            ${citation.snippet ? `<p>${escHtml(citation.snippet)}</p>` : ''}
          </div>
        </li>
      `;
    });
    html += '</ol></section>';
  }

  $('reportBody').innerHTML = html;
}

function reportToMarkdown(report) {
  const lines = [`# ${report.topic || 'Research report'}`, ''];

  if (report.demo_mode) {
    lines.push(
      '> Demo narrative: the text was generated from built-in templates. Web search and cited sources are real.',
      ''
    );
  }
  if (report.summary) lines.push(report.summary, '');

  (report.sections || []).forEach((section) => {
    lines.push(`## ${section.title || 'Untitled section'}`, '', section.content || '', '');
  });

  if (report.charts?.length) {
    lines.push('## Data & charts', '');
    report.charts.forEach((chart) => lines.push(`- ${chart.title}`));
    lines.push('');
  }

  if (report.citations?.length) {
    lines.push('## Sources', '');
    report.citations.forEach((citation, index) => {
      const number = citation.index ?? index + 1;
      lines.push(`${number}. [${citation.title || citation.url}](${citation.url})`);
      if (citation.snippet) lines.push(`   ${citation.snippet}`);
    });
  }

  return lines.join('\n').trim() + '\n';
}

async function copyReport() {
  if (!currentReport) return;

  const markdown = reportToMarkdown(currentReport);
  try {
    await navigator.clipboard.writeText(markdown);
    showToast('Report copied as Markdown', 'success');
  } catch {
    showToast('Clipboard not available in this browser.', 'error');
  }
}

// ── Exports ────────────────────────────────────────────────────────────────

function slugify(value) {
  return String(value || 'report')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'report';
}

async function downloadExport(format) {
  if (!currentJob || !currentReport) {
    showToast('Run a research report first.', 'error');
    return;
  }

  const button = document.querySelector(`[data-export="${format}"]`);
  if (button) button.disabled = true;

  try {
    const response = await fetch(
      `/api/research/${encodeURIComponent(currentJob.id)}/export/${format}?token=${encodeURIComponent(
        currentJob.token
      )}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || `Export failed (HTTP ${response.status}).`);
    }

    const blob = await response.blob();
    const extension = format === 'slides' ? 'html' : format;
    const filename = `Zynex_${slugify(currentReport.topic)}.${extension}`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast(`${format === 'slides' ? 'Slide deck' : format.toUpperCase()} downloaded`, 'success');
  } catch (error) {
    showToast(error.message || 'Export failed.', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

// ── Initialisation ─────────────────────────────────────────────────────────

function initDepthPicker() {
  const options = document.querySelectorAll('.depth-option');
  options.forEach((option) => {
    const input = option.querySelector('input[type="radio"]');
    if (!input) return;
    option.classList.toggle('depth-option--active', input.checked);
    input.addEventListener('change', () => {
      options.forEach((item) => item.classList.remove('depth-option--active'));
      if (input.checked) option.classList.add('depth-option--active');
    });
  });
}

export function initResearch() {
  renderResearchHistory();
  initDepthPicker();

  $('researchForm')?.addEventListener('submit', startResearch);

  $('researchTopic')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      $('researchForm')?.requestSubmit();
    }
  });

  $('newResearchBtn')?.addEventListener('click', showResearchForm);

  $('cancelResearchViewBtn')?.addEventListener('click', () => {
    const wasRunning = running;
    showResearchForm();
    if (wasRunning) {
      showToast('Stopped tracking this run. The server may still finish it.', 'info');
    }
  });

  document.querySelectorAll('[data-export]').forEach((button) => {
    button.addEventListener('click', () => downloadExport(button.dataset.export));
  });

  $('copyReportBtn')?.addEventListener('click', copyReport);
}
