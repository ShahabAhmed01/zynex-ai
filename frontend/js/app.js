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

import { initMobileInteractions } from './ui.js';

// ── DOM refs ───────────────────────────────────────────────────────────────
const $input   = document.getElementById('messageInput');
const $sendBtn = document.getElementById('sendBtn');
const $sidebar = document.getElementById('sidebar');
const $overlay = document.getElementById('sidebarOverlay');

// ── Init ───────────────────────────────────────────────────────────────────
(function init() {
  renderHistory();
  updateSidebar();
  bindModals();
  initMobileInteractions();

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

  // Mobile: close sidebar when overlay is tapped
  $overlay.addEventListener('click', e => {
    if (state.sidebarOpen) toggleSidebar();
  });

  // Mobile: swipe right to open sidebar
  let touchStartX = 0;
  let touchStartY = 0;
  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (window.innerWidth > 768) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
    if (dx > 60 && dy < 80 && touchStartX < 30 && !state.sidebarOpen) {
      toggleSidebar();
    }
  }, { passive: true });

  // Sidebar buttons
  document.getElementById('newChatBtn')?.addEventListener('click', newChat);
  document.getElementById('clearChatBtn')?.addEventListener('click', clearChat);
  document.getElementById('menuBtn')?.addEventListener('click', toggleSidebar);

  // Model selector
  document.getElementById('modelSelector')?.addEventListener('click', cycleModel);
  document.getElementById('modelSelector')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      cycleModel();
    }
  });

  // Suggestion cards
  document.querySelectorAll('.welcome__suggestion').forEach(btn => {
    btn.addEventListener('click', () => useSuggestion(btn.dataset.prompt));
  });
})();

function updateSidebar() {
  if (state.sidebarOpen) {
    $sidebar.classList.remove('sidebar--collapsed');
    if (window.innerWidth <= 768) {
      $sidebar.classList.add('sidebar--open');
      $overlay.classList.add('sidebar-overlay--visible');
    }
  } else {
    $sidebar.classList.add('sidebar--collapsed');
    $sidebar.classList.remove('sidebar--open');
    $overlay.classList.remove('sidebar-overlay--visible');
  }
}
