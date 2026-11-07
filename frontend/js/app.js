/**
 * App — view switching and application wiring.
 */

import {
  bindModals,
  clearChat,
  newChat,
  renderHistory,
  send,
  state,
  stopStream,
  toggleSidebar,
  updateSidebar,
  useSuggestion,
} from './chat.js';
import { initConfig } from './config.js';
import { initResearch, renderResearchHistory, showResearchForm } from './research.js';
import { initCodeCopy, initMobileInteractions } from './ui.js';

// ── DOM refs ───────────────────────────────────────────────────────────────
const $input = document.getElementById('messageInput');
const $sendBtn = document.getElementById('sendBtn');
const $sidebar = document.getElementById('sidebar');
const $overlay = document.getElementById('sidebarOverlay');
const $headerTitle = document.getElementById('conversationTitle');
const $chatArea = document.getElementById('chatArea');
const $chatInputArea = document.getElementById('chatInputArea');
const $researchView = document.getElementById('researchView');
const $chatActions = document.getElementById('chatActions');
const $exportBtn = document.getElementById('exportBtn');
const $conversationList = document.getElementById('conversationList');
const $researchHistoryList = document.getElementById('researchHistoryList');
const $newItemLabel = document.getElementById('newItemLabel');

let currentView = '';
let lastChatTitle = 'New Conversation';

// ── View switching ─────────────────────────────────────────────────────────
function switchView(view) {
  if (view !== 'chat' && view !== 'research') return;
  if (view === currentView) return;

  if (currentView === 'chat' && $headerTitle) {
    lastChatTitle = $headerTitle.textContent || 'New Conversation';
  }

  currentView = view;
  document.body.dataset.view = view;

  const isResearch = view === 'research';
  $chatArea.hidden = isResearch;
  $chatInputArea.hidden = isResearch;
  $researchView.hidden = !isResearch;
  $chatActions.hidden = isResearch;
  $exportBtn.hidden = isResearch;
  $conversationList.hidden = isResearch;
  $researchHistoryList.hidden = !isResearch;

  if ($newItemLabel) $newItemLabel.textContent = isResearch ? 'New Research' : 'New Chat';
  if ($headerTitle) $headerTitle.textContent = isResearch ? 'Research' : lastChatTitle;

  document.querySelectorAll('[data-view]').forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle('sidebar__nav-item--active', active && button.classList.contains('sidebar__nav-item'));
    button.classList.toggle('mode-tab--active', active && button.classList.contains('mode-tab'));
    if (button.getAttribute('role') === 'tab') {
      button.setAttribute('aria-selected', String(active));
    }
  });

  if (window.innerWidth <= 768 && state.sidebarOpen) toggleSidebar();
}

// ── Chat composer ──────────────────────────────────────────────────────────
function initComposer() {
  $input.addEventListener('input', () => {
    $sendBtn.disabled = $input.value.trim() === '' || state.isStreaming;
    $input.style.height = 'auto';
    $input.style.height = Math.min($input.scrollHeight, 160) + 'px';
  });

  $input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!$sendBtn.disabled) send();
    }
  });

  $sendBtn.addEventListener('click', () => {
    if (state.isStreaming) stopStream();
    else send();
  });

  document.querySelectorAll('.welcome__suggestion').forEach((button) => {
    button.addEventListener('click', () => useSuggestion(button.dataset.prompt));
  });
}

// ── Mobile sidebar ─────────────────────────────────────────────────────────
function initMobileSidebar() {
  document.addEventListener('click', (event) => {
    if (window.innerWidth > 768 || !state.sidebarOpen) return;
    if (!$sidebar.contains(event.target) && !event.target.closest('#menuBtn')) {
      toggleSidebar();
    }
  });

  $overlay.addEventListener('click', () => {
    if (state.sidebarOpen) toggleSidebar();
  });

  let touchStartX = 0;
  let touchStartY = 0;
  document.addEventListener(
    'touchstart',
    (event) => {
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    },
    { passive: true }
  );
  document.addEventListener(
    'touchend',
    (event) => {
      if (window.innerWidth > 768) return;
      const dx = event.changedTouches[0].clientX - touchStartX;
      const dy = Math.abs(event.changedTouches[0].clientY - touchStartY);
      if (dx > 60 && dy < 80 && touchStartX < 30 && !state.sidebarOpen) {
        toggleSidebar();
      }
    },
    { passive: true }
  );
}

function initNavigation() {
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });

  document.getElementById('newChatBtn')?.addEventListener('click', () => {
    if (currentView === 'research') {
      showResearchForm();
    } else {
      newChat();
    }
  });

  document.getElementById('clearChatBtn')?.addEventListener('click', clearChat);
  document.getElementById('menuBtn')?.addEventListener('click', toggleSidebar);

  document.getElementById('welcomeResearchBtn')?.addEventListener('click', () => {
    switchView('research');
    showResearchForm();
  });

  document.addEventListener('zynex:view', (event) => {
    switchView(event.detail?.view);
  });
}

// ── Init ───────────────────────────────────────────────────────────────────
(function init() {
  renderHistory();
  renderResearchHistory();
  updateSidebar();
  bindModals();
  initMobileInteractions();
  initCodeCopy(document);
  initComposer();
  initMobileSidebar();
  initNavigation();
  initResearch();
  switchView('chat');

  initConfig().catch((error) => {
    console.error('Configuration failed to load', error);
  });
})();
