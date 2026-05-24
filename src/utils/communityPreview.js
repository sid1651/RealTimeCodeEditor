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

export const getCommunityPreviewSrcDoc = (room) => (
  room.language === 'react'
    ? buildReactSrcDoc(room)
    : buildVanillaSrcDoc(room)
);
