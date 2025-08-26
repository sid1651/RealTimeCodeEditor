import React, { useEffect, useRef, useState } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../Actions';

const EditorHTML = ({
  socketRef,
  roomId,
  onCodeChange,
  isClientCollapsed = false,
  isPreviewCollapsed = false,
  value = '',
}) => {
  const editorRef = useRef(null);
  const wrapperRef = useRef(null);

  // ---------- Responsive width (inline) ----------
  const computeWidth = () => {
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const scale = (base) => Math.round((base / 1920) * screenW);

    const px = (() => {
      if (isClientCollapsed && isPreviewCollapsed) return scale(1740);
      if (isClientCollapsed) return scale(1140);
      if (isPreviewCollapsed) return scale(1500);
      return scale(990);
    })();

    // Mobile fallback: use full width on very small screens
    if (screenW < 420) return '100%';

    const minWidth = 300; // avoid unusably small editors
    return `${Math.max(px, minWidth)}px`;
  };

  const [width, setWidth] = useState(computeWidth);

  useEffect(() => {
    const onResize = () => setWidth(computeWidth());
    window.addEventListener('resize', onResize);

    // immediate recalc when collapse flags change
    setWidth(computeWidth());

    return () => window.removeEventListener('resize', onResize);
  }, [isClientCollapsed, isPreviewCollapsed]);

  // ---------- CodeMirror init / cleanup ----------
  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!mounted) return;

      editorRef.current = Codemirror.fromTextArea(
        document.getElementById('realtimeEditorHTML'),
        {
          mode: 'htmlmixed',
          theme: 'dracula',
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
          lineWrapping: true, // keep wrapping for HTML editor
          viewportMargin: Infinity,
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
        // ignore cleanup errors
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

  // ---------- Render (inline style for width) ----------
  return (
    <div
      ref={wrapperRef}
      style={{
        height: '200px',
        width: width,
        overflow: 'auto',
        borderRadius: '6px',
        border: '1px solid rgba(255,255,255,0.1)',
        transition: 'width 200ms ease',
      }}
    >
      <textarea id="realtimeEditorHTML"></textarea>
    </div>
  );
};

export default EditorHTML;
