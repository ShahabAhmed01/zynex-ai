/**
 * Markdown — small, dependency-free renderer with LaTeX fallback support.
 *
 * The input is escaped before any formatting is applied. Fenced code blocks
 * and inline code are swapped for placeholders so later formatting passes
 * cannot alter their contents, and links are restricted to HTTP(S).
 */

export function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatLatex(latex) {
  const cleaned = latex
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

function sanitizeLanguage(language) {
  return (
    String(language || 'text')
      .toLowerCase()
      .replace(/[^a-z0-9+#.-]/g, '') || 'text'
  );
}

function buildCodeBlock(language, code) {
  const safeLanguage = sanitizeLanguage(language);
  const lineNumbers = code
    .split('\n')
    .map((_, index) => `<span class="code-block__line-num">${index + 1}</span>`)
    .join('');

  return `<div class="code-block">
      <div class="code-block__header">
        <span class="code-block__lang">${safeLanguage}</span>
        <button class="code-block__copy" type="button" data-code="${code}" aria-label="Copy code">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy
        </button>
      </div>
      <div class="code-block__body">
        <div class="code-block__lines">${lineNumbers}</div>
        <code class="code-block__code language-${safeLanguage}">${code}</code>
      </div>
    </div>`;
}

export function renderMarkdown(text) {
  if (!text) return '';

  let html = escHtml(text).replace(/\r\n/g, '\n');

  // Protect fenced code blocks from every later formatting pass.
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, language, code) => {
    const token = `\u0000CB${codeBlocks.length}\u0000`;
    codeBlocks.push({ language, code: code.replace(/\n$/, '') });
    return token;
  });

  // Protect inline code as well.
  const inlineCode = [];
  html = html.replace(/`([^`\n]+)`/g, (_, code) => {
    const token = `\u0000IC${inlineCode.length}\u0000`;
    inlineCode.push(code);
    return token;
  });

  // LaTeX display mode.
  html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    return `<div class="math-block">${formatLatex(math)}</div>`;
  });

  // LaTeX inline mode (escaped delimiters).
  html = html.replace(/\\\(([^)]+?)\\\)/g, (_, math) => {
    return `<code class="math-inline">${formatLatex(math)}</code>`;
  });

  // LaTeX inline mode (unescaped delimiters).
  html = html.replace(/\(([^)]*\\[a-zA-Z]+[^)]*)\)/g, (_, math) => {
    return `<code class="math-inline">${formatLatex(math)}</code>`;
  });

  html = html.replace(/\\\(/g, '').replace(/\\\)/g, '');
  html = html.replace(/\(\\[^)]*\)/g, '');

  // Markdown links (HTTP/S only).
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
  );

  // Bare URLs become links, with trailing punctuation kept outside the anchor.
  html = html.replace(/(^|[\s>])(https?:\/\/[^\s<]+)/g, (match, prefix, url) => {
    let clean = url;
    let trailing = '';
    const punctuation = /[.,;:!?)\]]+$/;
    const matchTrailing = clean.match(punctuation);
    if (matchTrailing) {
      trailing = matchTrailing[0];
      clean = clean.slice(0, -trailing.length);
    }
    return `${prefix}<a href="${clean}" target="_blank" rel="noopener noreferrer">${clean}</a>${trailing}`;
  });

  // Inline formatting.
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>');

  // Headings.
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Lists.
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="list-item ordered">$2</li>');
  html = html.replace(/^[-*] (.+)$/gm, '<li class="list-item">$1</li>');
  html = html.replace(/((?:<li class="list-item[^"]*">.*?<\/li>\n?)+)/g, (match) => {
    if (match.includes('ordered')) {
      return '<ol>' + match.replace(/ class="list-item ordered"/g, '') + '</ol>';
    }
    return '<ul>' + match.replace(/ class="list-item"/g, '') + '</ul>';
  });

  // Horizontal rule.
  html = html.replace(/^---$/gm, '<hr class="markdown-rule">');

  // Line breaks, then tidy block boundaries.
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/(<\/(?:h[1-3]|ul|ol|blockquote)>)<br>/g, '$1');
  html = html.replace(/<br>(<(?:h[1-3]|ul|ol|blockquote)[ >])/g, '$1');
  html = html.replace(/(?:<br>\s*)+(\u0000CB\d+\u0000)(?:\s*<br>)+/g, '$1');

  // Restore protected code.
  html = html.replace(/\u0000IC(\d+)\u0000/g, (_, index) => {
    return `<code>${inlineCode[Number(index)]}</code>`;
  });
  html = html.replace(/\u0000CB(\d+)\u0000/g, (_, index) => {
    const block = codeBlocks[Number(index)];
    return buildCodeBlock(block.language, block.code);
  });

  return html;
}
