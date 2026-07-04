/**
 * UI — DOM utilities, toast, progress, message rendering
 */

import { renderMarkdown, escHtml } from './markdown.js';

// ── DOM refs ───────────────────────────────────────────────────────────────
const $chat        = document.getElementById('chatArea');
const $welcome     = document.getElementById('welcomeScreen');
const $messages    = document.getElementById('messages');
const $progressBar = document.getElementById('progressBar');

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

  $messages.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

export function copyMessage(btn) {
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
