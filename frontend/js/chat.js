/**
 * Chat — chat state, send/stream, conversations, sidebar, modals
 */

import { loadConversations, saveConversations } from './storage.js';
import { renderMarkdown } from './markdown.js';
import { streamChat } from './streaming.js';
import {
  scrollToBottom,
  showToast,
  showProgress,
  hideProgress,
  appendMessage,
  renderMessages,
} from './ui.js';

// ── State ──────────────────────────────────────────────────────────────────
export const state = {
  conversations: loadConversations(),
  currentId: null,
  messages: [],
  isStreaming: false,
  controller: null,
  sidebarOpen: window.innerWidth > 768,
  models: [
    { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 (Free)' },
    { id: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (Free)' },
    { id: 'z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air (Free)' },
  ],
  modelIndex: 0,
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const $chat        = document.getElementById('chatArea');
const $welcome     = document.getElementById('welcomeScreen');
const $messages    = document.getElementById('messages');
const $input       = document.getElementById('messageInput');
const $sendBtn     = document.getElementById('sendBtn');
const $sidebar     = document.getElementById('sidebar');
const $overlay     = document.getElementById('sidebarOverlay');
const $histList    = document.getElementById('conversationList');
const $headerTitle = document.getElementById('conversationTitle');
const $modelLabel  = document.getElementById('modelName');

// ── Sidebar ────────────────────────────────────────────────────────────────
export function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  updateSidebar();
}

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

// ── Model cycling ──────────────────────────────────────────────────────────
export function cycleModel() {
  state.modelIndex = (state.modelIndex + 1) % state.models.length;
  $modelLabel.textContent = state.models[state.modelIndex].label;
  showToast(`Switched to ${state.models[state.modelIndex].label}`, 'success');
}

// ── Conversations ──────────────────────────────────────────────────────────
export function newChat() {
  state.currentId = null;
  state.messages = [];
  $messages.innerHTML = '';
  $messages.style.display = 'none';
  $welcome.style.display = 'flex';
  $headerTitle.textContent = 'New conversation';
  $input.value = '';
  $input.style.height = 'auto';
  $sendBtn.disabled = true;
  if (window.innerWidth <= 768 && state.sidebarOpen) toggleSidebar();
}

export function clearChat() {
  if (state.messages.length === 0) return;
  if (!confirm('Clear this conversation?')) return;
  newChat();
}

function loadConversation(id) {
  const conv = state.conversations.find(c => c.id === id);
  if (!conv) return;
  state.currentId = id;
  state.messages = [...conv.messages];
  renderMessages(state.messages);
  $headerTitle.textContent = conv.title;
  if (window.innerWidth <= 768 && state.sidebarOpen) toggleSidebar();
}

function saveConversation() {
  const existing = state.conversations.findIndex(c => c.id === state.currentId);
  const title = state.messages[0]?.content?.slice(0, 60) || 'New conversation';
  const conv = {
    id: state.currentId,
    title,
    messages: state.messages,
    updatedAt: Date.now(),
  };
  if (existing >= 0) {
    state.conversations[existing] = conv;
  } else {
    state.conversations.unshift(conv);
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

  const groups = groupConversations(state.conversations);

  groups.forEach(({ label, items }) => {
    const groupEl = document.createElement('div');
    groupEl.className = 'sidebar__date-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'sidebar__date-label';
    labelEl.textContent = label;
    groupEl.appendChild(labelEl);

    items.forEach(conv => {
      const el = document.createElement('div');
      el.className = 'sidebar__conversation' + (conv.id === state.currentId ? ' sidebar__conversation--active' : '');
      el.innerHTML = `
        <svg class="sidebar__conversation-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <div class="sidebar__conversation-body">
          <div class="sidebar__conversation-title">${conv.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          <div class="sidebar__conversation-time">${formatRelativeTime(conv.updatedAt)}</div>
        </div>
        <button class="sidebar__conversation-delete" aria-label="Delete conversation" data-id="${conv.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;
      el.title = conv.title;
      el.addEventListener('click', (e) => {
        if (e.target.closest('.sidebar__conversation-delete')) return;
        loadConversation(conv.id);
      });
      const deleteBtn = el.querySelector('.sidebar__conversation-delete');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteConversation(conv.id);
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

  const groups = {
    today: [],
    yesterday: [],
    previousWeek: [],
    older: [],
  };

  conversations.forEach(conv => {
    const t = conv.updatedAt || 0;
    if (t >= today) groups.today.push(conv);
    else if (t >= yesterday) groups.yesterday.push(conv);
    else if (t >= weekAgo) groups.previousWeek.push(conv);
    else groups.older.push(conv);
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
  const now = Date.now();
  const diff = now - timestamp;
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
  if (!confirm('Delete this conversation?')) return;
  state.conversations = state.conversations.filter(c => c.id !== id);
  saveConversations(state.conversations);
  if (state.currentId === id) {
    state.currentId = null;
    state.messages = [];
    $messages.innerHTML = '';
    $messages.style.display = 'none';
    $welcome.style.display = 'flex';
    $headerTitle.textContent = 'New conversation';
    $input.value = '';
    $input.style.height = 'auto';
    $sendBtn.disabled = true;
  }
  renderHistory();
}

// ── Suggestions ────────────────────────────────────────────────────────────
export function useSuggestion(text) {
  $input.value = text;
  $input.dispatchEvent(new Event('input'));
  $input.focus();
  send();
}

// ── Send / Stream ──────────────────────────────────────────────────────────
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
  $sendBtn.disabled = true;
  $input.focus();

  scrollToBottom();
  setStreaming(true);
  showProgress();

  const aiMsgEl = appendMessage({ role: 'ai', content: '' });
  const bubble = aiMsgEl.querySelector('.message__bubble');
  bubble.innerHTML = '<div class="typing-indicator"><div class="typing-dot animate-blink"></div><div class="typing-dot animate-blink"></div><div class="typing-dot animate-blink"></div></div>';

  state.controller = new AbortController();

  const messagesPayload = [
    {
      role: 'system',
      content: 'You are Zynex, a helpful AI assistant. Answer ONLY the most recent user question directly and concisely. Do NOT repeat, summarize, or reference any previous questions or answers in the conversation. Go straight to the answer for the current question.'
    },
    ...state.messages
  ];

  await streamChat({
    messages: messagesPayload,
    model: state.models[state.modelIndex].id,
    signal: state.controller.signal,
    onChunk(fullContent) {
      bubble.innerHTML = renderMarkdown(fullContent) + '<span class="stream-cursor animate-cursor-blink"></span>';
      scrollToBottom();
    },
    onDone(fullContent) {
      bubble.innerHTML = renderMarkdown(fullContent);

      const followUp = document.createElement('div');
      followUp.style.cssText = 'margin-top:10px;font-size:12.5px;color:var(--color-text-muted);font-style:italic;';
      followUp.textContent = 'Is there anything else you would like to know?';
      aiMsgEl.querySelector('.message__inner').appendChild(followUp);

      state.messages.push({ role: 'assistant', content: fullContent });
      saveConversation();
    },
    onError(err) {
      if (err.name === 'AbortError') {
        bubble.innerHTML = renderMarkdown(bubble.textContent.replace('▊', '') || '*Response stopped.*');
      } else {
        bubble.innerHTML = `
          <div style="color:#fca5a5;padding:10px 0;">
            ⚠ <strong>Search failed.</strong> Could not get a response from the AI.<br>
            <span style="font-size:13px;color:var(--color-text-secondary);margin-top:4px;display:block;">
              Please try again. If the problem continues, reload the page.
            </span>
          </div>
        `;
        showToast('Search failed — please try again', 'error');
      }
    },
  });

  hideProgress();
  setStreaming(false);
  renderHistory();
  scrollToBottom();
}

export function stopStream() {
  state.controller?.abort();
}

function setStreaming(val) {
  state.isStreaming = val;
  $sendBtn.classList.toggle('input-area__send--loading', val);
  $sendBtn.disabled = false;
}

// ── Modal Wiring ───────────────────────────────────────────────────────────
export function bindModals() {
  const $settingsBtn = document.getElementById('settingsBtn');
  const $settingsModal = document.getElementById('settingsModal');
  const $closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const $cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  const $saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const $settingsBackdrop = document.getElementById('settingsBackdrop');

  function openSettings() {
    $settingsModal.classList.add('modal--visible');
  }
  function closeSettings() {
    $settingsModal.classList.remove('modal--visible');
  }

  $settingsBtn?.addEventListener('click', openSettings);
  $closeSettingsBtn?.addEventListener('click', closeSettings);
  $cancelSettingsBtn?.addEventListener('click', closeSettings);
  $settingsBackdrop?.addEventListener('click', closeSettings);
  $saveSettingsBtn?.addEventListener('click', () => {
    showToast('Settings saved', 'success');
    closeSettings();
  });

  const $exportModal = document.getElementById('exportModal');
  const $closeExportBtn = document.getElementById('closeExportBtn');
  const $cancelExportBtn = document.getElementById('cancelExportBtn');
  const $confirmExportBtn = document.getElementById('confirmExportBtn');
  const $exportBackdrop = document.getElementById('exportBackdrop');
  let selectedFormat = null;

  function openExport() {
    selectedFormat = null;
    $exportModal.classList.add('modal--visible');
  }
  function closeExport() {
    $exportModal.classList.remove('modal--visible');
  }

  $closeExportBtn?.addEventListener('click', closeExport);
  $cancelExportBtn?.addEventListener('click', closeExport);
  $exportBackdrop?.addEventListener('click', closeExport);

  document.querySelectorAll('.export-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.export-option').forEach(b => b.classList.remove('button--primary'));
      btn.classList.add('button--primary');
      selectedFormat = btn.dataset.format;
    });
  });

  $confirmExportBtn?.addEventListener('click', () => {
    if (!selectedFormat) {
      showToast('Select an export format', 'error');
      return;
    }
    if (state.messages.length === 0) {
      showToast('No messages to export', 'error');
      return;
    }
    exportConversation(selectedFormat);
    closeExport();
  });
}

// ── Export ─────────────────────────────────────────────────────────────────
function exportConversation(format) {
  let content = '';
  const title = $headerTitle.textContent || 'conversation';

  if (format === 'markdown') {
    content = `# ${title}\n\n`;
    state.messages.forEach(m => {
      const role = m.role === 'user' ? '**You**' : '**Zynex**';
      content += `${role}\n\n${m.content}\n\n---\n\n`;
    });
  } else if (format === 'json') {
    content = JSON.stringify({ title, messages: state.messages }, null, 2);
  } else {
    content = `${title}\n\n`;
    state.messages.forEach(m => {
      const role = m.role === 'user' ? 'You' : 'Zynex';
      content += `${role}: ${m.content}\n\n`;
    });
  }

  const ext = format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'txt';
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported as ${format}`, 'success');
}
