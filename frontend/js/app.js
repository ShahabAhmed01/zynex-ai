/**
 * App — Main application controller
 */

import {
  state,
  send,
  stopStream,
  newChat,
  clearChat,
  cycleModel,
  toggleSidebar,
  useSuggestion,
  renderHistory,
  bindModals,
} from './chat.js';

// ── DOM refs ───────────────────────────────────────────────────────────────
const $input   = document.getElementById('messageInput');
const $sendBtn = document.getElementById('sendBtn');
const $sidebar = document.getElementById('sidebar');

// ── Init ───────────────────────────────────────────────────────────────────
(function init() {
  renderHistory();
  updateSidebar();
  bindModals();

  // Auto-resize textarea
  $input.addEventListener('input', () => {
    $sendBtn.disabled = $input.value.trim() === '' || state.isStreaming;
    $input.style.height = 'auto';
    $input.style.height = Math.min($input.scrollHeight, 160) + 'px';
  });

  // Send on Enter (Shift+Enter = newline)
  $input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!$sendBtn.disabled) send();
    }
  });

  $sendBtn.addEventListener('click', () => {
    if (state.isStreaming) {
      stopStream();
    } else {
      send();
    }
  });

  // Mobile: close sidebar on outside tap
  document.addEventListener('click', e => {
    if (window.innerWidth <= 768 && state.sidebarOpen) {
      if (!$sidebar.contains(e.target) && e.target.id !== 'menuBtn') {
        toggleSidebar();
      }
    }
  });

  // Sidebar buttons
  document.getElementById('newChatBtn')?.addEventListener('click', newChat);
  document.getElementById('clearChatBtn')?.addEventListener('click', clearChat);
  document.getElementById('menuBtn')?.addEventListener('click', toggleSidebar);

  // Model selector
  document.getElementById('modelSelector')?.addEventListener('click', cycleModel);

  // Suggestion cards
  document.querySelectorAll('.welcome__suggestion').forEach(btn => {
    btn.addEventListener('click', () => useSuggestion(btn.dataset.prompt));
  });
})();

function updateSidebar() {
  if (state.sidebarOpen) {
    $sidebar.classList.remove('sidebar--collapsed');
    if (window.innerWidth <= 768) $sidebar.classList.add('sidebar--open');
  } else {
    $sidebar.classList.add('sidebar--collapsed');
    $sidebar.classList.remove('sidebar--open');
  }
}
