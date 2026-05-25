/**
 * Zynex — Frontend Application
 * Streaming chat interface with conversation history
 */

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  conversations: JSON.parse(localStorage.getItem('conversations') || '[]'),
  currentId: null,
  messages: [],
  isStreaming: false,
  controller: null,
  sidebarOpen: window.innerWidth > 768,
  models: [
    { id: 'google/gemini-2.0-flash-lite-preview-02-05:free', label: 'Gemini 2.0 (Free)' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 (Free)' },
    { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (Free)' }
  ],
  modelIndex: 0,
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const $chat       = document.getElementById('chat');
const $welcome    = document.getElementById('welcome');
const $messages   = document.getElementById('messages');
const $input      = document.getElementById('input');
const $sendBtn    = document.getElementById('send-btn');
const $sidebar    = document.getElementById('sidebar');
const $histList   = document.getElementById('history-list');
const $headerTitle = document.getElementById('header-title');
const $modelLabel  = document.getElementById('model-label');
const $progressBar = document.getElementById('progress-bar');

// ── Init ───────────────────────────────────────────────────────────────────
(function init() {
  renderHistory();
  updateSidebar();

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
      if (!$sidebar.contains(e.target) && e.target.id !== 'toggle-sidebar') {
        toggleSidebar();
      }
    }
  });
})();

// ── Sidebar ────────────────────────────────────────────────────────────────
function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  updateSidebar();
}

function updateSidebar() {
  if (state.sidebarOpen) {
    $sidebar.classList.remove('collapsed');
    if (window.innerWidth <= 768) $sidebar.classList.add('open');
  } else {
    $sidebar.classList.add('collapsed');
    $sidebar.classList.remove('open');
  }
}

// ── Model cycling ──────────────────────────────────────────────────────────
function cycleModel() {
  state.modelIndex = (state.modelIndex + 1) % state.models.length;
  $modelLabel.textContent = state.models[state.modelIndex].label;
  showToast(`Switched to ${state.models[state.modelIndex].label}`, 'success');
}

// ── Conversations ──────────────────────────────────────────────────────────
function newChat() {
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

function clearChat() {
  if (state.messages.length === 0) return;
  if (!confirm('Clear this conversation?')) return;
  newChat();
}

function loadConversation(id) {
  const conv = state.conversations.find(c => c.id === id);
  if (!conv) return;
  state.currentId = id;
  state.messages = [...conv.messages];
  renderMessages();
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
  localStorage.setItem('conversations', JSON.stringify(state.conversations.slice(0, 50)));
  renderHistory();
}

function renderHistory() {
  $histList.innerHTML = '';
  if (state.conversations.length === 0) {
    $histList.innerHTML = '<div style="padding:10px 10px;font-size:13px;color:var(--text-mute)">No conversations yet</div>';
    return;
  }
  state.conversations.forEach(conv => {
    const el = document.createElement('div');
    el.className = 'history-item' + (conv.id === state.currentId ? ' active' : '');
    el.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      ${escHtml(conv.title)}
    `;
    el.title = conv.title;
    el.addEventListener('click', () => loadConversation(conv.id));
    $histList.appendChild(el);
  });
}

// ── Suggestions ────────────────────────────────────────────────────────────
function useSuggestion(text) {
  $input.value = text;
  $input.dispatchEvent(new Event('input'));
  $input.focus();
  send();
}

// ── Send / Stream ──────────────────────────────────────────────────────────
async function send() {
  const text = $input.value.trim();
  if (!text || state.isStreaming) return;

  // Init new conversation if needed
  if (!state.currentId) {
    state.currentId = 'conv_' + Date.now();
    $welcome.style.display = 'none';
    $messages.style.display = 'flex';
  }

  // Add user message
  state.messages.push({ role: 'user', content: text });
  appendMessage({ role: 'user', content: text });
  $headerTitle.textContent = text.slice(0, 50);

  // Reset input
  $input.value = '';
  $input.style.height = 'auto';
  $sendBtn.disabled = true;
  $input.focus();

  // Scroll
  scrollToBottom();

  // Start streaming
  setStreaming(true);
  showProgress();

  // Add AI message placeholder
  const aiMsgEl = appendMessage({ role: 'ai', content: '' });
  const bubble = aiMsgEl.querySelector('.message-bubble');
  bubble.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';

  state.controller = new AbortController();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.messages,
        model: state.models[state.modelIndex].id,
        stream: true,
      }),
      signal: state.controller.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Server error ${response.status}`);
    }

    // Stream response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    bubble.innerHTML = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // Handle SSE format
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content
                       || json.content
                       || json.text
                       || '';
            if (delta) {
              fullContent += delta;
              bubble.innerHTML = renderMarkdown(fullContent) + '<span class="stream-cursor"></span>';
              scrollToBottom();
            }
          } catch {
            // Ignore parse errors on partial chunks
          }
        }
      }
    }

    // Final render without cursor
    bubble.innerHTML = renderMarkdown(fullContent);
    state.messages.push({ role: 'assistant', content: fullContent });
    saveConversation();

  } catch (err) {
    if (err.name === 'AbortError') {
      bubble.innerHTML = renderMarkdown(bubble.textContent.replace('▊', '') || '*Response stopped.*');
    } else {
      bubble.innerHTML = `<span style="color:#fca5a5">⚠ ${escHtml(err.message)}</span>`;
      showToast(err.message, 'error');
    }
  } finally {
    hideProgress();
    setStreaming(false);
    renderHistory();
    scrollToBottom();
  }
}

function stopStream() {
  state.controller?.abort();
}

function setStreaming(val) {
  state.isStreaming = val;
  $sendBtn.classList.toggle('loading', val);
  $sendBtn.disabled = false;
}

// ── Progress bar ───────────────────────────────────────────────────────────
let progressInterval = null;
let progressVal = 0;

function showProgress() {
  $progressBar.classList.add('active');
  progressVal = 0;
  $progressBar.style.width = '0%';
  progressInterval = setInterval(() => {
    // Asymptotically approach 90%
    progressVal += (90 - progressVal) * 0.06;
    $progressBar.style.width = progressVal + '%';
  }, 100);
}

function hideProgress() {
  clearInterval(progressInterval);
  $progressBar.style.width = '100%';
  setTimeout(() => {
    $progressBar.classList.remove('active');
    $progressBar.style.width = '0%';
  }, 400);
}

// ── Rendering ──────────────────────────────────────────────────────────────
function appendMessage({ role, content }) {
  const isUser = role === 'user';
  const isAi   = role === 'ai' || role === 'assistant';

  const wrap = document.createElement('div');
  wrap.className = `message ${isUser ? 'user' : 'ai'}`;

  wrap.innerHTML = `
    <div class="message-inner">
      <div class="message-meta">
        <div class="message-avatar ${isUser ? 'user-avatar' : 'ai-avatar'}">
          ${isUser ? '👤' : '✦'}
        </div>
        <span class="message-role">${isUser ? 'You' : 'Zynex'}</span>
      </div>
      <div class="message-bubble">${isUser ? escHtml(content) : renderMarkdown(content)}</div>
    </div>
  `;

  $messages.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

function renderMessages() {
  $messages.innerHTML = '';
  $welcome.style.display = 'none';
  $messages.style.display = 'flex';
  state.messages.forEach(m => appendMessage({ role: m.role, content: m.content }));
  scrollToBottom();
}

function scrollToBottom() {
  $chat.scrollTop = $chat.scrollHeight;
}

// ── Simple Markdown renderer ───────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return '';
  let html = escHtml(text);

  // Code blocks (``` ... ```)
  html = html.replace(/\`\`\`(\w*)\n?([\s\S]*?)\`\`\`/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/\`([^\n\`]+)\`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:600;margin:12px 0 4px;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:17px;font-weight:600;margin:14px 0 6px;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:700;margin:16px 0 8px;">$1</h1>');

  // Ordered list
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:8px;margin:3px 0"><span style="color:var(--text-mute);min-width:18px">$1.</span><span>$2</span></div>');

  // Unordered list
  html = html.replace(/^[-*] (.+)$/gm, '<div style="display:flex;gap:8px;margin:3px 0"><span style="color:var(--accent2);min-width:12px">•</span><span>$1</span></div>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:12px 0">');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  // Clean up double-brs after block elements
  html = html.replace(/<\/pre><br>/g, '</pre>');
  html = html.replace(/<\/h[1-3]><br>/g, '</h1>');

  return html;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Toasts ─────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
