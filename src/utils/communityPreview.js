const sanitizeForHtml = (value = '') => `${value}`.replace(/<\/script>/gi, '<\\/script>');

const buildVanillaSrcDoc = (room) => {
  const html = room.code?.html || '<div class="community-empty">No HTML yet</div>';
  const css = room.code?.css || '';
  const javascript = sanitizeForHtml(room.code?.javascript || '');

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        html, body { margin: 0; min-height: 100%; background: #ffffff; overflow: hidden; }
        body { font-family: Inter, system-ui, sans-serif; }
        .community-empty { min-height: 100vh; display: grid; place-items: center; color: #64748b; font-size: 18px; }
        ${css}
      </style>
    </head>
    <body>
      ${html}
      <script>${javascript}</script>
    </body>
  </html>`;
};

const buildReactSrcDoc = (room) => {
  const reactSource = sanitizeForHtml(room.code?.react || 'function App() { return <div />; }');
  const reactCss = room.code?.reactCss || '';

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <style>
        html, body, #root { margin: 0; min-height: 100%; background: #ffffff; overflow: hidden; }
        body { font-family: Inter, system-ui, sans-serif; }
        ${reactCss}
      </style>
    </head>
    <body>
      <div id="root"></div>
      <script type="text/babel">
        const { useState, useEffect, useMemo, useRef } = React;
        ${reactSource}
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
      </script>
    </body>
  </html>`;
};

const buildPythonSrcDoc = (room) => {
  const pythonCode = sanitizeForHtml(room.code?.python || 'print("Hello, World!")');
  const pythonInput = sanitizeForHtml(room.code?.pythonInput || '');

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        html, body { margin: 0; min-height: 100%; background: #020617; color: #e2e8f0; }
        body {
          font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
          padding: 20px;
          box-sizing: border-box;
          background:
            radial-gradient(circle at top right, rgba(59, 130, 246, 0.16), transparent 28%),
            linear-gradient(180deg, #020617 0%, #0f172a 100%);
        }
        .shell {
          height: calc(100vh - 40px);
          border-radius: 22px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(15, 23, 42, 0.88);
          display: grid;
          grid-template-rows: auto auto 1fr;
          overflow: hidden;
          box-shadow: 0 22px 60px rgba(2, 6, 23, 0.42);
        }
        .bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.12);
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #93c5fd;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #34d399;
          box-shadow: 0 0 0 6px rgba(52, 211, 153, 0.12);
        }
        .meta {
          padding: 10px 16px;
          display: grid;
          gap: 6px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.12);
          color: #94a3b8;
          font-size: 12px;
        }
        pre {
          margin: 0;
          padding: 16px;
          white-space: pre-wrap;
          overflow: auto;
          color: #e2e8f0;
        }
        code {
          color: #bfdbfe;
        }
      </style>
    </head>
    <body>
      <div class="shell">
        <div class="bar">
          <span class="badge"><span class="dot"></span> Python Room</span>
          <span>Terminal Preview</span>
        </div>
        <div class="meta">
          <span>Compiler: python-3.14</span>
          <span>Shared input: ${pythonInput || '(empty)'}</span>
        </div>
        <pre><code>${pythonCode}</code></pre>
      </div>
    </body>
  </html>`;
};

export const getCommunityPreviewSrcDoc = (room) => (
  room.language === 'react'
    ? buildReactSrcDoc(room)
    : room.language === 'python'
      ? buildPythonSrcDoc(room)
    : buildVanillaSrcDoc(room)
);
