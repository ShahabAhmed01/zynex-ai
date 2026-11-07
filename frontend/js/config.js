/**
 * Config — runtime configuration, model selection, and OpenRouter activation.
 *
 * The browser never stores an API key. Activation runs through the backend's
 * PKCE exchange and the key lives only in the server-side `.env` file.
 */

import { escHtml } from './markdown.js';
import { closeModal, openModal, showToast } from './ui.js';

const MODEL_KEY = 'zynex_model';
const ACTIVATION_POLL_MS = 2000;
const ACTIVATION_MAX_MS = 5 * 60 * 1000;

export const configState = {
  loaded: false,
  demoMode: true,
  hasApiKey: false,
  defaultModel: '',
  freeModels: [],
  version: '',
  maxTokens: 0,
};

let selectedModel = '';
let activationTimer = null;
let activationStartedAt = 0;

const $ = (id) => document.getElementById(id);

function modelLabel(id) {
  if (!id) return 'Free model';
  const match = configState.freeModels.find((model) => model.id === id);
  return match?.label || id;
}

export function getSelectedModel() {
  return selectedModel || configState.defaultModel || '';
}

export function getSelectedModelLabel() {
  return modelLabel(getSelectedModel());
}

// ── Config loading ─────────────────────────────────────────────────────────

async function loadConfig() {
  try {
    const response = await fetch('/api/config', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Configuration request failed (HTTP ${response.status}).`);
    }

    const data = await response.json();
    configState.loaded = true;
    configState.demoMode = Boolean(data.demo_mode);
    configState.hasApiKey = Boolean(data.has_api_key);
    configState.defaultModel = data.default_model || '';
    configState.freeModels = Array.isArray(data.free_models) ? data.free_models : [];
    configState.version = data.version || '';
    configState.maxTokens = data.max_tokens || 0;

    const stored = localStorage.getItem(MODEL_KEY);
    const storedIsAvailable = configState.freeModels.some((model) => model.id === stored);
    const selectedIsAvailable = configState.freeModels.some((model) => model.id === selectedModel);
    if (!selectedIsAvailable) {
      selectedModel = storedIsAvailable ? stored : configState.defaultModel;
    }

    renderModelMenu();
    applyConfigToUI();
    document.dispatchEvent(new CustomEvent('zynex:config', { detail: configState }));
    return true;
  } catch (error) {
    configState.loaded = true;
    applyConfigError(error);
    return false;
  }
}

function applyConfigToUI() {
  const banner = $('setupBanner');
  const badge = $('setupBannerBadge');
  const text = $('setupBannerText');
  const activateBtn = $('activateAiBtn');

  if (banner) banner.hidden = !configState.demoMode;
  if (badge) badge.textContent = 'DEMO';
  if (text) {
    text.textContent =
      'AI text is simulated in demo mode. Research still searches the live web.';
  }
  if (activateBtn) {
    activateBtn.hidden = false;
    activateBtn.disabled = false;
    activateBtn.textContent = 'Activate free AI';
  }

  const researchNote = $('demoResearchNote');
  if (researchNote) researchNote.hidden = !configState.demoMode;

  const modelName = $('modelName');
  if (modelName) modelName.textContent = modelLabel(getSelectedModel());

  const modelStatus = $('modelStatus');
  if (modelStatus) {
    modelStatus.classList.toggle('model-selector__status--online', !configState.demoMode);
    modelStatus.classList.toggle('model-selector__status--offline', configState.demoMode);
    modelStatus.title = configState.demoMode
      ? 'Demo mode — activate free AI for live responses'
      : `Connected via OpenRouter · ${getSelectedModel()}`;
  }

  const dot = $('settingsStatusDot');
  const title = $('settingsStatusTitle');
  const statusText = $('settingsStatusText');
  const settingsModel = $('settingsModel');
  const settingsVersion = $('settingsVersion');
  const settingsMode = $('settingsMode');
  const activateWrap = $('settingsActivateWrap');

  if (dot) {
    dot.classList.toggle('settings-status__dot--online', !configState.demoMode);
    dot.classList.toggle('settings-status__dot--offline', configState.demoMode);
  }
  if (title) {
    title.textContent = configState.demoMode ? 'Demo mode' : 'Connected to OpenRouter';
  }
  if (statusText) {
    statusText.textContent = configState.demoMode
      ? 'AI text is simulated. Research still searches the live web.'
      : 'Live AI responses are enabled. The API key stays on the server.';
  }
  if (settingsModel) {
    settingsModel.textContent = configState.demoMode
      ? `${modelLabel(getSelectedModel())} (inactive)`
      : `${modelLabel(getSelectedModel())} · ${getSelectedModel()}`;
  }
  if (settingsVersion) {
    settingsVersion.textContent = configState.version ? `v${configState.version}` : '—';
  }
  if (settingsMode) settingsMode.textContent = configState.demoMode ? 'Demo' : 'Live AI';
  if (activateWrap) activateWrap.hidden = !configState.demoMode;
}

function applyConfigError(error) {
  const banner = $('setupBanner');
  const badge = $('setupBannerBadge');
  const text = $('setupBannerText');
  const activateBtn = $('activateAiBtn');

  if (banner) banner.hidden = false;
  if (badge) badge.textContent = 'OFFLINE';
  if (text) {
    text.textContent =
      'Could not reach the Zynex API. Check that the server is running, then reload the page.';
  }
  if (activateBtn) activateBtn.hidden = true;

  const dot = $('settingsStatusDot');
  if (dot) {
    dot.classList.remove('settings-status__dot--online');
    dot.classList.add('settings-status__dot--offline');
  }
  const title = $('settingsStatusTitle');
  if (title) title.textContent = 'Configuration unavailable';
  const statusText = $('settingsStatusText');
  if (statusText) statusText.textContent = error.message || 'Could not load configuration.';
  const settingsMode = $('settingsMode');
  if (settingsMode) settingsMode.textContent = 'Unknown';
  const activateWrap = $('settingsActivateWrap');
  if (activateWrap) activateWrap.hidden = true;
  const researchNote = $('demoResearchNote');
  if (researchNote) researchNote.hidden = true;
}

// ── Model menu ─────────────────────────────────────────────────────────────

function renderModelMenu() {
  const menu = $('modelMenu');
  const selector = $('modelSelector');
  if (!menu) return;

  menu.innerHTML = '';

  if (configState.freeModels.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'model-menu__empty';
    empty.textContent = 'No models available. Check the server configuration.';
    menu.appendChild(empty);
    if (selector) selector.disabled = true;
    return;
  }

  if (selector) selector.disabled = false;

  configState.freeModels.forEach((model) => {
    const active = model.id === getSelectedModel();
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `model-menu__item${active ? ' model-menu__item--active' : ''}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(active));
    item.dataset.model = model.id;
    item.innerHTML = `
      <span class="model-menu__check" aria-hidden="true">
        ${active ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </span>
      <span class="model-menu__body">
        <strong>${escHtml(model.label || model.id)}</strong>
        <small>${escHtml(model.note || 'Free on OpenRouter')}</small>
        <code>${escHtml(model.id)}</code>
      </span>
    `;
    item.addEventListener('click', () => selectModel(model.id));
    menu.appendChild(item);
  });
}

function selectModel(id) {
  selectedModel = id;
  try {
    localStorage.setItem(MODEL_KEY, id);
  } catch {
    // Storage can be disabled; the in-memory selection still works.
  }
  renderModelMenu();
  applyConfigToUI();
  closeModelMenu();
  showToast(`Model changed to ${modelLabel(id)}`, 'success');
}

function openModelMenu() {
  const menu = $('modelMenu');
  const selector = $('modelSelector');
  if (!menu || !selector || selector.disabled) return;
  menu.hidden = false;
  selector.setAttribute('aria-expanded', 'true');
  menu.querySelector('.model-menu__item')?.focus();
}

function closeModelMenu() {
  const menu = $('modelMenu');
  const selector = $('modelSelector');
  if (!menu || !selector) return;
  menu.hidden = true;
  selector.setAttribute('aria-expanded', 'false');
}

function initModelMenu() {
  const menu = $('modelMenu');
  const selector = $('modelSelector');
  if (!menu || !selector) return;

  selector.addEventListener('click', (event) => {
    event.stopPropagation();
    if (menu.hidden) openModelMenu();
    else closeModelMenu();
  });

  selector.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (menu.hidden) openModelMenu();
      else closeModelMenu();
    }
    if (event.key === 'Escape') closeModelMenu();
  });

  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModelMenu();
      selector.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (menu.hidden) return;
    if (event.target.closest('#modelMenu') || event.target.closest('#modelSelector')) return;
    closeModelMenu();
  });
}

// ── OpenRouter activation ──────────────────────────────────────────────────

function setActivationBusy(busy) {
  ['activateAiBtn', 'settingsActivateBtn'].forEach((id) => {
    const button = $(id);
    if (!button) return;
    button.disabled = busy;
    if (id === 'activateAiBtn') {
      button.textContent = busy ? 'Opening OpenRouter…' : 'Activate free AI';
    } else {
      button.textContent = busy ? 'Opening…' : 'Activate free AI';
    }
  });
}

function stopActivationPolling() {
  if (activationTimer) {
    clearInterval(activationTimer);
    activationTimer = null;
  }
}

async function checkActivated() {
  try {
    const response = await fetch('/api/config', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data.has_api_key);
  } catch {
    return false;
  }
}

function watchActivation(popup) {
  stopActivationPolling();
  activationStartedAt = Date.now();

  activationTimer = setInterval(async () => {
    if (Date.now() - activationStartedAt > ACTIVATION_MAX_MS) {
      stopActivationPolling();
      showToast('Activation timed out. Try again when you are ready.', 'error');
      return;
    }

    if (await checkActivated()) {
      stopActivationPolling();
      try {
        if (popup && !popup.closed) popup.close();
      } catch {
        // Ignore cross-origin close failures.
      }
      await loadConfig();
      showToast('Free AI activated — you can now use live responses.', 'success');
      return;
    }

    if (popup?.closed) {
      stopActivationPolling();
      await loadConfig();
      if (configState.demoMode) {
        showToast('Activation window closed before the key was created.', 'error');
      }
    }
  }, ACTIVATION_POLL_MS);
}

async function activateAi() {
  if (!configState.loaded) {
    await loadConfig();
  }
  if (configState.hasApiKey) {
    showToast('AI is already activated.', 'success');
    return;
  }

  setActivationBusy(true);
  try {
    const callbackUrl = window.location.origin + window.location.pathname;
    const response = await fetch(
      `/api/auth/url?callback_url=${encodeURIComponent(callbackUrl)}`,
      { headers: { Accept: 'application/json' } }
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || `Activation request failed (HTTP ${response.status}).`);
    }

    const popup = window.open(
      data.url,
      'zynex-openrouter-auth',
      'width=620,height=780,menubar=no,toolbar=no'
    );

    if (!popup) {
      showToast('Popup blocked — redirecting to OpenRouter…', 'error');
      window.location.assign(data.url);
      return;
    }

    showToast('Finish the OpenRouter sign-in to activate free AI.', 'success');
    watchActivation(popup);
  } catch (error) {
    showToast(error.message || 'Could not start activation.', 'error');
  } finally {
    setActivationBusy(false);
  }
}

async function handleAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return;

  // Remove the one-time code from the address bar before exchanging it.
  window.history.replaceState({}, '', window.location.pathname + window.location.hash);

  try {
    const response = await fetch('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || `Activation failed (HTTP ${response.status}).`);
    }

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'zynex-auth' }, window.location.origin);
      window.setTimeout(() => window.close(), 400);
      return;
    }

    await loadConfig();
    showToast(data.message || 'Free AI activated.', 'success');
  } catch (error) {
    showToast(error.message || 'Could not complete activation.', 'error');
  }
}

// ── Settings modal ─────────────────────────────────────────────────────────

function initSettingsModal() {
  const modalId = 'settingsModal';
  const open = () => openModal(modalId);
  const close = () => closeModal(modalId);

  $('settingsBtn')?.addEventListener('click', open);
  $('closeSettingsBtn')?.addEventListener('click', close);
  $('closeSettingsFooterBtn')?.addEventListener('click', close);
  $('settingsBackdrop')?.addEventListener('click', close);
}

function initActivation() {
  $('activateAiBtn')?.addEventListener('click', activateAi);
  $('settingsActivateBtn')?.addEventListener('click', activateAi);

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type !== 'zynex-auth') return;
    stopActivationPolling();
    loadConfig().then(() => {
      showToast('Free AI activated — you can now use live responses.', 'success');
    });
  });
}

export async function initConfig() {
  initSettingsModal();
  initModelMenu();
  initActivation();

  await handleAuthCallback();
  await loadConfig();
}
