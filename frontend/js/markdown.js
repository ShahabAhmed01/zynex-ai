/**
 * Markdown — renderer with LaTeX support
 */

export function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatLatex(latex) {
  let cleaned = latex
    .replace(/\\frac\{[^}]*\}\{[^}]*\}/g, '(fraction)')
    .replace(/\\frac\{[^}]*\{[^}]*\}/g, '(fraction)')
    .replace(/\\frac\{[^}]+\}/g, '(fraction)')
    .replace(/\\frac/g, '/')
    .replace(/\\partial/g, '∂')
    .replace(/\\hat\{[^}]*\}/g, '')
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
    .replace(/\\sqrt\{[^}]*\}/g, '√')
    .replace(/\\sqrt/g, '√')
    .replace(/\\delta/g, 'δ')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\eta/g, 'η')
    .replace(/\\mathcal\{[^}]*\}/g, 'L')
    .replace(/\\mathcal/g, 'L')
    .replace(/\\odot/g, '·')
    .replace(/\\big/g, '')
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/\^\{?[^{\\}]*\}?/g, '')
    .replace(/_\{?[^{\\}]*\}?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || '(math expression)';
}

export function renderMarkdown(text) {
  if (!text) return '';
  let html = escHtml(text);

  // LaTeX display mode
  html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    return `<div style="background:var(--color-surface-alt);padding:12px;border-radius:8px;margin:10px 0;font-family:'JetBrains Mono',monospace;font-size:13px;overflow-x:auto;border:1px solid var(--color-border);">${formatLatex(math)}</div>`;
  });

  // LaTeX inline mode (escaped)
  html = html.replace(/\\\(([^)]+?)\\\)/g, (_, math) => {
    return `<code style="background:var(--color-surface-alt);padding:2px 6px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:13px;">${formatLatex(math)}</code>`;
  });

  // LaTeX inline mode (unescaped)
  html = html.replace(/\(([^)]*\\[a-zA-Z]+[^)]*)\)/g, (_, math) => {
    return `<code style="background:var(--color-surface-alt);padding:2px 6px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:13px;">${formatLatex(math)}</code>`;
  });

  // Clean up remaining LaTeX delimiters
  html = html.replace(/\\\(/g, '').replace(/\\\)/g, '');
  html = html.replace(/\(\\[^)]*\)/g, '');

  // Code blocks
  html = html.replace(/\`\`\`(\w*)\n?([\s\S]*?)\`\`\`/g, (_, lang, code) => {
    const language = lang || 'text';
    const codeContent = code.trim();
    const lines = codeContent.split('\n');
    const lineNums = lines.map((_, i) => `<span class="code-block__line-num">${i + 1}</span>`).join('');
    // Escape for HTML attribute context only
    const safeCode = codeContent.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return `<div class="code-block">
      <div class="code-block__header">
        <span class="code-block__lang">${language}</span>
        <button class="code-block__copy" data-code="${safeCode}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy
        </button>
      </div>
      <div class="code-block__body">
        <div class="code-block__lines">${lineNums}</div>
        <code class="code-block__code language-${language}">${codeContent}</code>
      </div>
    </div>`;
  });

  // Inline code
  html = html.replace(/\`([^\n\`]+)\`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Ordered list
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="list-item ordered">$2</li>');

  // Unordered list
  html = html.replace(/^[-*] (.+)$/gm, '<li class="list-item">$1</li>');

  // Wrap consecutive list items
  html = html.replace(/((?:<li class="list-item[^"]*">.*?<\/li>\n?)+)/g, (match) => {
    if (match.includes('ordered')) {
      return '<ol>' + match.replace(/ class="list-item ordered"/g, '') + '</ol>';
    }
    return '<ul>' + match.replace(/ class="list-item"/g, '') + '</ul>';
  });

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--color-border);margin:12px 0">');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  // Clean up double-brs after block elements
  html = html.replace(/<\/pre><br>/g, '</pre>');
  html = html.replace(/<\/h([1-3])><br>/g, '</h$1>');
  html = html.replace(/<\/div><br>/g, '</div>');

  return html;
}
