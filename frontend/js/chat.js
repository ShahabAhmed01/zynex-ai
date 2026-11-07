/**
 * Chat — chat state, streaming, conversations, and the export modal.
 */

import { getSelectedModel } from './config.js';
import { escHtml, renderMarkdown } from './markdown.js';
import { loadConversations, saveConversations } from './storage.js';
import { streamChat } from './streaming.js';
import {
  appendMessage,
  closeModal,
  hideProgress,
  openModal,
  renderMessages,
  scrollToBottom,
  showProgress,
  showToast,
} from './ui.js';

// ── State ──────────────────────────────────────────────────────────────────
export const state = {
  conversations: loadConversations(),
  currentId: null,
  messages: [],
  isStreaming: false,
  controller: null,
  sidebarOpen: window.innerWidth > 768,
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const $welcome = document.getElementById('welcomeScreen');
const $messages = document.getElementById('messages');
const $input = document.getElementById('messageInput');
const $sendBtn = document.getElementById('sendBtn');
const $sidebar = document.getElementById('sidebar');
const $overlay = document.getElementById('sidebarOverlay');
const $histList = document.getElementById('conversationList');
const $headerTitle = document.getElementById('conversationTitle');

const SEND_ICON = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>`;
const STOP_ICON = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="2"></rect>
  </svg>`;

// ── Sidebar ────────────────────────────────────────────────────────────────
export function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  updateSidebar();
}

export function updateSidebar() {
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

// ── Conversations ──────────────────────────────────────────────────────────
export function newChat() {
  state.currentId = null;
  state.messages = [];
  $messages.innerHTML = '';
  $messages.style.display = 'none';
  $welcome.style.display = 'flex';
  $headerTitle.textContent = 'New Conversation';
  $input.value = '';
  $input.style.height = 'auto';
  $sendBtn.disabled = true;
  closeSidebarOnMobile();
}

export function clearChat() {
  if (state.messages.length === 0) return;
  if (!window.confirm('Clear this conversation?')) return;
  if (state.currentId) {
    state.conversations = state.conversations.filter((conversation) => conversation.id !== state.currentId);
    saveConversations(state.conversations);
  }
  newChat();
}

function loadConversation(id) {
  const conversation = state.conversations.find((item) => item.id === id);
  if (!conversation) return;
  state.currentId = id;
  state.messages = [...conversation.messages];
  renderMessages(state.messages);
  $headerTitle.textContent = conversation.title;
  closeSidebarOnMobile();
}

function saveConversation() {
  const existing = state.conversations.findIndex((item) => item.id === state.currentId);
  const title = state.messages[0]?.content?.slice(0, 60) || 'New conversation';
  const conversation = {
    id: state.currentId,
    title,
    messages: state.messages,
    updatedAt: Date.now(),
  };
  if (existing >= 0) {
    state.conversations[existing] = conversation;
  } else {
    state.conversations.unshift(conversation);
  }
  saveConversations(state.conversations);
  renderHistory();
}

export function renderHistory() {
  $histList.innerHTML = '';
  if (state.conversations.length === 0) {
    $histList.innerHTML = '<div class="sidebar__empty">No conversations yet</div>';
    return;
  }

  groupConversations(state.conversations).forEach(({ label, items }) => {
    const groupEl = document.createElement('div');
    groupEl.className = 'sidebar__date-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'sidebar__date-label';
    labelEl.textContent = label;
    groupEl.appendChild(labelEl);

    items.forEach((conversation) => {
      const el = document.createElement('div');
      el.className =
        'sidebar__conversation' +
        (conversation.id === state.currentId ? ' sidebar__conversation--active' : '');
      el.title = conversation.title;
      el.innerHTML = `
        <svg class="sidebar__conversation-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <div class="sidebar__conversation-body">
          <div class="sidebar__conversation-title">${escHtml(conversation.title)}</div>
          <div class="sidebar__conversation-time">${formatRelativeTime(conversation.updatedAt)}</div>
        </div>
        <button class="sidebar__conversation-delete" type="button" aria-label="Delete conversation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;
      el.addEventListener('click', (event) => {
        if (event.target.closest('.sidebar__conversation-delete')) return;
        loadConversation(conversation.id);
      });
      el.querySelector('.sidebar__conversation-delete').addEventListener('click', (event) => {
        event.stopPropagation();
        deleteConversation(conversation.id);
      });
      groupEl.appendChild(el);
    });

    $histList.appendChild(groupEl);
  });
}

function groupConversations(conversations) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;

  const groups = { today: [], yesterday: [], previousWeek: [], older: [] };

  conversations.forEach((conversation) => {
    const timestamp = conversation.updatedAt || 0;
    if (timestamp >= today) groups.today.push(conversation);
    else if (timestamp >= yesterday) groups.yesterday.push(conversation);
    else if (timestamp >= weekAgo) groups.previousWeek.push(conversation);
    else groups.older.push(conversation);
  });

  const result = [];
  if (groups.today.length) result.push({ label: 'Today', items: groups.today });
  if (groups.yesterday.length) result.push({ label: 'Yesterday', items: groups.yesterday });
  if (groups.previousWeek.length) result.push({ label: 'Previous 7 Days', items: groups.previousWeek });
  if (groups.older.length) result.push({ label: 'Older', items: groups.older });
  return result;
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

function deleteConversation(id) {
  if (!window.confirm('Delete this conversation?')) return;
  state.conversations = state.conversations.filter((conversation) => conversation.id !== id);
  saveConversations(state.conversations);
  if (state.currentId === id) {
    newChat();
  }
  renderHistory();
}

function closeSidebarOnMobile() {
  if (window.innerWidth <= 768 && state.sidebarOpen) toggleSidebar();
}

// ── Suggestions ────────────────────────────────────────────────────────────
export function useSuggestion(text) {
  $input.value = text;
  $input.dispatchEvent(new Event('input'));
  $input.focus();
  send();
}

// ── Send / stream ──────────────────────────────────────────────────────────
export async function send() {
  const text = $input.value.trim();
  if (!text || state.isStreaming) return;

  if (!state.currentId) {
    state.currentId = 'conv_' + Date.now();
    $welcome.style.display = 'none';
    $messages.style.display = 'flex';
  }

  state.messages.push({ role: 'user', content: text });
  appendMessage({ role: 'user', content: text });
  $headerTitle.textContent = text.slice(0, 50);

  $input.value = '';
  $input.style.height = 'auto';
  setStreaming(true);
  showProgress();

  const aiMsgEl = appendMessage({ role: 'ai', content: '' });
  const bubble = aiMsgEl.querySelector('.message__bubble');
  bubble.innerHTML =
    '<div class="typing-indicator"><div class="typing-dot animate-blink"></div><div class="typing-dot animate-blink"></div><div class="typing-dot animate-blink"></div></div>';

  state.controller = new AbortController();
  let streamed = '';

  const handleError = (error) => {
    if (error.name === 'AbortError') {
      if (streamed.trim()) {
        bubble.innerHTML =
          renderMarkdown(streamed) + '<div class="message__stopped">Stopped</div>';
        state.messages.push({ role: 'assistant', content: streamed });
        saveConversation();
      } else {
        aiMsgEl.remove();
      }
      return;
    }

    bubble.innerHTML = `
      <div class="message__error">
        <strong>The AI request failed.</strong>
        <span>${escHtml(error.message || 'Check the server logs and try again.')}</span>
      </div>
    `;
    showToast('The AI request failed.', 'error');
  };

  const messagesPayload = [
    {
      role: 'system',
      content:
        'You are Zynex, a helpful AI assistant. Answer the most recent user question directly and concisely. Do not repeat or summarize previous questions and answers. Go straight to the answer for the current question.',
    },
    ...state.messages,
  ];

  await streamChat({
    messages: messagesPayload,
    model: getSelectedModel(),
    signal: state.controller.signal,
    onChunk(fullContent) {
      streamed = fullContent;
      bubble.innerHTML =
        renderMarkdown(fullContent) + '<span class="stream-cursor animate-cursor-blink"></span>';
      scrollToBottom();
    },
    onDone(fullContent) {
      streamed = fullContent;
      if (!fullContent.trim()) {
        handleError(new Error('The model returned an empty response.'));
        return;
      }
      bubble.innerHTML = renderMarkdown(fullContent);
      state.messages.push({ role: 'assistant', content: fullContent });
      saveConversation();
    },
    onError: handleError,
  });

  hideProgress();
  setStreaming(false);
  renderHistory();
  scrollToBottom();
}

export function stopStream() {
  state.controller?.abort();
}

function setStreaming(value) {
  state.isStreaming = value;
  $sendBtn.classList.toggle('input-area__send--loading', value);
  $sendBtn.innerHTML = value ? STOP_ICON : SEND_ICON;
  $sendBtn.setAttribute('aria-label', value ? 'Stop generating' : 'Send message');
  $sendBtn.disabled = value ? false : !$input.value.trim();
}

// ── Export modal ───────────────────────────────────────────────────────────
export function bindModals() {
  const modalId = 'exportModal';
  const $exportBtn = document.getElementById('exportBtn');
  const $closeExportBtn = document.getElementById('closeExportBtn');
  const $cancelExportBtn = document.getElementById('cancelExportBtn');
  const $confirmExportBtn = document.getElementById('confirmExportBtn');
  const $exportBackdrop = document.getElementById('exportBackdrop');

  let selectedFormat = null;

  function openExport() {
    selectedFormat = null;
    document.querySelectorAll('.export-option').forEach((button) => {
      button.classList.remove('button--primary');
    });
    openModal(modalId);
  }

  function closeExport() {
    closeModal(modalId);
  }

  $exportBtn?.addEventListener('click', openExport);
  $closeExportBtn?.addEventListener('click', closeExport);
  $cancelExportBtn?.addEventListener('click', closeExport);
  $exportBackdrop?.addEventListener('click', closeExport);

  document.querySelectorAll('.export-option').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.export-option').forEach((item) => {
        item.classList.remove('button--primary');
      });
      button.classList.add('button--primary');
      selectedFormat = button.dataset.format;
    });
  });

  $confirmExportBtn?.addEventListener('click', () => {
    if (!selectedFormat) {
      showToast('Select an export format.', 'error');
      return;
    }
    if (state.messages.length === 0) {
      showToast('No messages to export.', 'error');
      return;
    }
    exportConversation(selectedFormat);
    closeExport();
  });
}

function exportConversation(format) {
  let content = '';
  const title = $headerTitle.textContent || 'conversation';

  if (format === 'markdown') {
    content = `# ${title}\n\n`;
    state.messages.forEach((message) => {
      const role = message.role === 'user' ? '**You**' : '**Zynex**';
      content += `${role}\n\n${message.content}\n\n---\n\n`;
    });
  } else if (format === 'json') {
    content = JSON.stringify({ title, messages: state.messages }, null, 2);
  } else {
    content = `${title}\n\n`;
    state.messages.forEach((message) => {
      const role = message.role === 'user' ? 'You' : 'Zynex';
      content += `${role}: ${message.content}\n\n`;
    });
  }

  const extension = format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'txt';
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${title.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}.${extension}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  showToast(`Exported as ${format}`, 'success');
}
