import React, { useEffect, useRef, useState } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/scroll/simplescrollbars';
import 'codemirror/addon/scroll/simplescrollbars.css';
import ACTIONS from '../Actions';

const Editor = ({
  socketRef,
  roomId,
  onCodeChange,
  isClientCollapsed = false,
  isPreviewCollapsed = false,
  value = '',
}) => {
  const editorRef = useRef(null);
  const wrapperRef = useRef(null);

  // ---------- Responsive width logic (inline style) ----------
  const computeWidth = () => {
    // scale base widths relative to a 1920px design
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const scale = (base) => Math.round((base / 1920) * screenW);

    // compute scaled pixel value and guard for tiny screens
    const px = (() => {
      if (isClientCollapsed && isPreviewCollapsed) return scale(1740);
      if (isClientCollapsed) return scale(1140);
      if (isPreviewCollapsed) return scale(1500);
      return scale(990);
    })();

    // keep a minimum usable width (avoid tiny unusable editors)
    const minWidth = 300;
    if (px < minWidth) return `${Math.max(px, minWidth)}px`;
    return `${px}px`;
  };

  const [width, setWidth] = useState(computeWidth);

  useEffect(() => {
    // recalc on resize and when collapse flags change
    const onResize = () => setWidth(computeWidth());
    window.addEventListener('resize', onResize);

    // also recalc immediately for initial render / when deps change
    setWidth(computeWidth());

    return () => {
      window.removeEventListener('resize', onResize);
    };
    // recompute when collapse states change
  }, [isClientCollapsed, isPreviewCollapsed]);

  // ---------- CodeMirror init / cleanup ----------
  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!mounted) return;

      editorRef.current = Codemirror.fromTextArea(
        document.getElementById('realtimeEditor'),
        {
          mode: { name: 'javascript', json: true },
          theme: 'dracula',
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
          lineWrapping: false,
          viewportMargin: Infinity,
          scrollbarStyle: 'simple',
        }
      );

      if (value) editorRef.current.setValue(value);

      editorRef.current.on('change', (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code);

        if (origin !== 'setValue' && socketRef?.current) {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
          });
        }
      });

      editorRef.current.setSize('100%', '100%');
    }

    init();

    return () => {
      mounted = false;
      try {
        if (editorRef.current) {
          editorRef.current.toTextArea && editorRef.current.toTextArea();
          editorRef.current = null;
        }
      } catch (e) {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  useEffect(() => {
    if (!socketRef?.current) return;
    const handler = ({ code }) => {
      if (typeof code === 'string' && editorRef.current) editorRef.current.setValue(code);
    };
    socketRef.current.on(ACTIONS.CODE_CHANGE, handler);
    return () => socketRef.current?.off(ACTIONS.CODE_CHANGE, handler);
  }, [socketRef]);

  // ---------- Render (inline styles used) ----------
  return (
    <div
      ref={wrapperRef}
      style={{
        height: '200px', // fixed height
        width: width, // responsive pixel width computed above
        overflow: 'auto',
        borderRadius: '6px',
        border: '1px solid rgba(255,255,255,0.1)',
        transition: 'width 200ms ease', // smooth resize
      }}
    >
      <textarea id="realtimeEditor" />
    </div>
  );
};

export default Editor;
