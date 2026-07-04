/**
 * UI — DOM utilities, toast, progress, message rendering, mobile interactions
 */

import { renderMarkdown, escHtml } from './markdown.js';

// ── DOM refs ───────────────────────────────────────────────────────────────
const $chat        = document.getElementById('chatArea');
const $welcome     = document.getElementById('welcomeScreen');
const $messages    = document.getElementById('messages');
const $progressBar = document.getElementById('progressBar');
const $mainInput   = document.querySelector('.main__input');

// ── Mobile detection ───────────────────────────────────────────────────────
const isMobile = () => window.innerWidth <= 768;

// ── Progress bar ───────────────────────────────────────────────────────────
let progressInterval = null;
let progressVal = 0;

export function showProgress() {
  $progressBar.classList.add('progress-bar--active');
  progressVal = 0;
  $progressBar.style.width = '0%';
  progressInterval = setInterval(() => {
    progressVal += (90 - progressVal) * 0.06;
    $progressBar.style.width = progressVal + '%';
  }, 100);
}

export function hideProgress() {
  clearInterval(progressInterval);
  $progressBar.style.width = '100%';
  setTimeout(() => {
    $progressBar.classList.remove('progress-bar--active');
    $progressBar.style.width = '0%';
  }, 400);
}

// ── Scroll ─────────────────────────────────────────────────────────────────
export function scrollToBottom() {
  $chat.scrollTop = $chat.scrollHeight;
}

// ── Toasts ─────────────────────────────────────────────────────────────────
export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── Message rendering ──────────────────────────────────────────────────────
export function appendMessage({ role, content }) {
  const isUser = role === 'user';
  const isAi   = role === 'ai' || role === 'assistant';

  const wrap = document.createElement('div');
  wrap.className = `message message--${isUser ? 'user' : 'ai'} animate-fade-slide-up`;

  wrap.innerHTML = `
    <div class="message__inner">
      <div class="message__meta">
        <div class="message__avatar message__avatar--${isUser ? 'user' : 'ai'}">
          ${isUser ? '👤' : '✦'}
        </div>
        <span class="message__role">${isUser ? 'You' : 'Zynex'}</span>
      </div>
      <div class="message__bubble">${isUser ? escHtml(content) : renderMarkdown(content)}</div>
      ${isAi ? `
        <div class="message__actions">
          <button class="copy-btn" title="Copy response">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy
          </button>
        </div>
      ` : ''}
    </div>
  `;

  // Bind copy button
  const copyBtn = wrap.querySelector('.copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => copyMessage(copyBtn));
  }

  // Bind image tap-to-expand on mobile
  if (isMobile()) {
    wrap.querySelectorAll('.message__bubble img').forEach(img => {
      img.addEventListener('click', () => expandImage(img));
    });
  }

  $messages.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

export function copyMessage(btn) {
  if (!navigator.clipboard) {
    showToast('Clipboard not available', 'error');
    return;
  }
  const bubble = btn.closest('.message__inner').querySelector('.message__bubble');
  const text = bubble.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard', 'success');
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    `;
    setTimeout(() => {
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      `;
    }, 2000);
  });
}

export function renderMessages(messages) {
  $messages.innerHTML = '';
  $welcome.style.display = 'none';
  $messages.style.display = 'flex';
  messages.forEach(m => appendMessage({ role: m.role, content: m.content }));
  scrollToBottom();
}

// ── Image tap-to-expand (mobile) ──────────────────────────────────────────
let expandedOverlay = null;

function expandImage(img) {
  if (expandedOverlay) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 2000;
    background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px; cursor: pointer;
    animation: fadeIn 0.2s ease;
  `;

  const clone = img.cloneNode();
  clone.style.cssText = `
    max-width: 100%; max-height: 90vh; object-fit: contain;
    border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  `;

  overlay.appendChild(clone);
  document.body.appendChild(overlay);
  expandedOverlay = overlay;

  overlay.addEventListener('click', () => {
    overlay.remove();
    expandedOverlay = null;
  }, { once: true });
}

// ── Mobile keyboard handling ───────────────────────────────────────────────
function initKeyboardHandling() {
  if (!isMobile()) return;

  // Use VisualViewport API to detect keyboard presence
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const viewportHeight = window.visualViewport.height;
      const fullHeight = window.innerHeight;

      // Keyboard is likely open if viewport shrunk significantly
      if (viewportHeight < fullHeight * 0.85) {
        document.documentElement.style.setProperty(
          '--keyboard-height',
          `${fullHeight - viewportHeight}px`
        );
        $mainInput?.classList.add('main__input--keyboard-open');
      } else {
        document.documentElement.style.setProperty('--keyboard-height', '0px');
        $mainInput?.classList.remove('main__input--keyboard-open');
      }

      // Scroll to bottom when keyboard appears to keep input visible
      scrollToBottom();
    }, { passive: true });
  }

  // Fallback: detect focus on input to adjust layout
  const textarea = document.getElementById('messageInput');
  if (textarea) {
    textarea.addEventListener('focus', () => {
      setTimeout(() => scrollToBottom(), 300);
    }, { passive: true });
  }
}

// ── Prevent 300ms tap delay ────────────────────────────────────────────────
function initTapDelay() {
  // Add touch-action: manipulation to interactive elements
  // This CSS-level fix is more reliable than JS
  const style = document.createElement('style');
  style.textContent = `
    @media (pointer: coarse) {
      a, button, [role="button"], input, textarea, select, label,
      .sidebar__conversation, .welcome__suggestion, .copy-btn,
      .code-block__copy, .model-selector, .toast {
        touch-action: manipulation;
      }
    }
  `;
  document.head.appendChild(style);
}

// ── Modal Interactions ─────────────────────────────────────────────────────
const activeModals = new Set();

export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.add('modal--visible');
  activeModals.add(modalId);

  // Store previously focused element for restore
  modal._previousFocus = document.activeElement;

  // Focus first focusable element
  const firstFocusable = modal.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (firstFocusable) {
    setTimeout(() => firstFocusable.focus(), 50);
  }

  // Add keyboard handler
  modal._keydownHandler = (e) => handleModalKeydown(e, modalId);
  document.addEventListener('keydown', modal._keydownHandler);
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.remove('modal--visible');
  activeModals.delete(modalId);

  // Remove keyboard handler
  if (modal._keydownHandler) {
    document.removeEventListener('keydown', modal._keydownHandler);
    modal._keydownHandler = null;
  }

  // Restore focus
  if (modal._previousFocus && modal._previousFocus.focus) {
    modal._previousFocus.focus();
  }
}

function handleModalKeydown(e, modalId) {
  if (e.key === 'Escape') {
    closeModal(modalId);
    return;
  }

  // Focus trap
  if (e.key === 'Tab') {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }
}

export function isModalOpen(modalId) {
  return activeModals.has(modalId);
}

// ── Mobile touch interactions init ─────────────────────────────────────────
// Call this from app.js after DOM is ready
export function initMobileInteractions() {
  initTapDelay();
  initKeyboardHandling();
}
