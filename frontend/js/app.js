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
const $histList    = document.getElementById('conversationList');
const $headerTitle = document.getElementById('conversationTitle');
const $modelLabel  = document.getElementById('modelName');
const $progressBar = document.getElementById('progressBar');

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

// ── Sidebar ────────────────────────────────────────────────────────────────
function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  updateSidebar();
}

function updateSidebar() {
  if (state.sidebarOpen) {
    $sidebar.classList.remove('sidebar--collapsed');
    if (window.innerWidth <= 768) $sidebar.classList.add('sidebar--open');
  } else {
    $sidebar.classList.add('sidebar--collapsed');
    $sidebar.classList.remove('sidebar--open');
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
    $histList.innerHTML = '<div style="padding:10px 10px;font-size:13px;color:var(--color-text-muted)">No conversations yet</div>';
    return;
  }
  state.conversations.forEach(conv => {
    const el = document.createElement('div');
    el.className = 'history-item' + (conv.id === state.currentId ? ' history-item--active' : '');
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
  const bubble = aiMsgEl.querySelector('.message__bubble');
  bubble.innerHTML = '<div class="typing-indicator"><div class="typing-dot animate-blink"></div><div class="typing-dot animate-blink"></div><div class="typing-dot animate-blink"></div></div>';

  state.controller = new AbortController();

  try {
    const messagesPayload = [
      {
        role: 'system',
        content: 'You are Zynex, a helpful AI assistant. Answer ONLY the most recent user question directly and concisely. Do NOT repeat, summarize, or reference any previous questions or answers in the conversation. Go straight to the answer for the current question.'
      },
      ...state.messages
    ];

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messagesPayload,
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
              bubble.innerHTML = renderMarkdown(fullContent) + '<span class="stream-cursor animate-cursor-blink"></span>';
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

    // Append a "done" follow-up hint below the bubble
    const followUp = document.createElement('div');
    followUp.style.cssText = 'margin-top:10px;font-size:12.5px;color:var(--color-text-muted);font-style:italic;';
    followUp.textContent = 'Is there anything else you would like to know?';
    aiMsgEl.querySelector('.message__inner').appendChild(followUp);

    state.messages.push({ role: 'assistant', content: fullContent });
    saveConversation();

  } catch (err) {
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
  $sendBtn.classList.toggle('input-area__send--loading', val);
  $sendBtn.disabled = false;
}

// ── Progress bar ───────────────────────────────────────────────────────────
let progressInterval = null;
let progressVal = 0;

function showProgress() {
  $progressBar.classList.add('progress-bar--active');
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
    $progressBar.classList.remove('progress-bar--active');
    $progressBar.style.width = '0%';
  }, 400);
}

// ── Rendering ──────────────────────────────────────────────────────────────
function appendMessage({ role, content }) {
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
          <button class="copy-btn" onclick="copyMessage(this)" title="Copy response">
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

  $messages.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

function copyMessage(btn) {
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

  // Strip LaTeX delimiters and clean up broken LaTeX
  // Handle both escaped \\( and unescaped \( patterns
  html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    return `<div style="background:var(--color-surface-alt);padding:12px;border-radius:8px;margin:10px 0;font-family:'JetBrains Mono',monospace;font-size:13px;overflow-x:auto;border:1px solid var(--color-border);">${formatLatex(math)}</div>`;
  });

  html = html.replace(/\\\(([^)]+?)\\\)/g, (_, math) => {
    return `<code style="background:var(--color-surface-alt);padding:2px 6px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:13px;">${formatLatex(math)}</code>`;
  });

  // Handle unescaped \( ... \) patterns
  html = html.replace(/\(([^)]*\\[a-zA-Z]+[^)]*)\)/g, (_, math) => {
    return `<code style="background:var(--color-surface-alt);padding:2px 6px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:13px;">${formatLatex(math)}</code>`;
  });

  // Handle any remaining \( or \) patterns (both escaped and unescaped)
  html = html.replace(/\\\(/g, '').replace(/\\\)/g, '');
  html = html.replace(/\(\\[^)]*\)/g, ''); // Remove any remaining LaTeX in parentheses

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
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:8px;margin:3px 0"><span style="color:var(--color-text-muted);min-width:18px">$1.</span><span>$2</span></div>');

  // Unordered list
  html = html.replace(/^[-*] (.+)$/gm, '<div style="display:flex;gap:8px;margin:3px 0"><span style="color:var(--color-primary);min-width:12px">•</span><span>$1</span></div>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--color-border);margin:12px 0">');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  // Clean up double-brs after block elements
  html = html.replace(/<\/pre><br>/g, '</pre>');
  html = html.replace(/<\/h[1-3]><br>/g, '</h1>');
  html = html.replace(/<\/div><br>/g, '</div>');

  return html;
}

// Format LaTeX math to readable HTML - simplified to handle broken LaTeX
function formatLatex(latex) {
  // Clean up malformed LaTeX by stripping commands and keeping symbols
  let cleaned = latex
    .replace(/\\frac\{[^}]*\}\{[^}]*\}/g, '(fraction)')  // Remove complex fractions
    .replace(/\\frac\{[^}]*\{[^}]*\}/g, '(fraction)')   // Handle missing closing brace
    .replace(/\\frac\{[^}]+\}/g, '(fraction)')          // Handle incomplete fractions
    .replace(/\\frac/g, '/')                             // Replace remaining \frac
    .replace(/\\partial/g, '∂')
    .replace(/\\hat\{[^}]*\}/g, '')                     // Remove hat notation
    .replace(/\\hat/g, '')
    .replace(/\\leftarrow/g, '←')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\ldots/g, '...')
    .replace(/\\dots/g, '...')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\neq/g, '≠')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\approx/g, '≈')
    .replace(/\\infty/g, '∞')
    .replace(/\\sum/g, '∑')
    .replace(/\\prod/g, '∏')
    .replace(/\\int/g, '∫')
    .replace(/\\sqrt\{[^}]*\}/g, '√')                 // Remove sqrt content
    .replace(/\\sqrt/g, '√')
    .replace(/\\delta/g, 'δ')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\eta/g, 'η')
    .replace(/\\mathcal\{[^}]*\}/g, 'L')                // Replace mathcal with L
    .replace(/\\mathcal/g, 'L')
    .replace(/\\odot/g, '·')
    .replace(/\\big/g, '')                             // Remove big commands
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '')              // Remove other LaTeX commands with args
    .replace(/\\[a-zA-Z]+/g, '')                        // Remove remaining LaTeX commands
    .replace(/\^\{?[^{\\}]*\}?/g, '')                   // Remove superscripts
    .replace(/_\{?[^{\\}]*\}?/g, '')                    // Remove subscripts
    .replace(/[{}]/g, '')                              // Remove remaining braces
    .replace(/\s+/g, ' ')                               // Clean up whitespace
    .trim();
  
  return cleaned || '(math expression)';
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
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── Modal Wiring ───────────────────────────────────────────────────────────
function bindModals() {
  // Settings modal
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

  // Export modal
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

  // Export is available for programmatic use; modal close/option/confirm buttons are wired above
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
