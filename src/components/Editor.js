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

const Editor = ({ socketRef, roomId, onCodeChange, isClientCollapsed = false, isPreviewCollapsed = false, value = '' }) => {
  const editorRef = useRef(null);
  const wrapperRef = useRef(null);

  // const computeWidth = () => {
  //   const screenW = typeof window !== 'undefined' ? window.innerWidth : 1920;
  //   const scale = (base) => Math.round((base / 1920) * screenW);

  //   const px = (() => {
  //     if (isClientCollapsed && isPreviewCollapsed) return scale(1740);
  //     if (isClientCollapsed) return scale(1140);
  //     if (isPreviewCollapsed) return scale(1500);
  //     return scale(990);
  //   })();

  //   return `${Math.max(px, 300)}px`; // enforce min width
  // };

  // const [width, setWidth] = useState(computeWidth);

  // useEffect(() => {
  //   const onResize = () => setWidth(computeWidth());
  //   window.addEventListener('resize', onResize);
  //   setWidth(computeWidth());
  //   return () => window.removeEventListener('resize', onResize);
  // }, [isClientCollapsed, isPreviewCollapsed]);

  useEffect(() => {
    let mounted = true;

    function init() {
      if (!mounted) return;

      editorRef.current = Codemirror.fromTextArea(document.getElementById('jsEditor'), {
        mode: { name: 'javascript', json: true },
        theme: 'dracula',
        autoCloseTags: true,
        autoCloseBrackets: true,
        lineNumbers: true,
        viewportMargin: Infinity,
        scrollbarStyle: 'simple',
      });

      if (value) editorRef.current.setValue(value);

      editorRef.current.on('change', (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code);

        if (origin !== 'setValue' && socketRef?.current) {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
           code, // ✅ correct key
          });
        }
      });

      editorRef.current.setSize('100%', '100%');
    }

    init();

    return () => {
      mounted = false;
      if (editorRef.current) {
        editorRef.current.toTextArea?.();
        editorRef.current = null;
      }
    };
  }, []); // run once

  useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
    if (typeof code === "string") {
        editorRef.current.setValue(code);
    }
});

        }

        return () => {
            socketRef.current.off(ACTIONS.CODE_CHANGE);
        };
    }, [socketRef.current]);

  return (
    <div
      ref={wrapperRef}
      style={{
        height: '100%',
        // width,
        overflow: 'auto',
        borderRadius: '6px',
        border: '1px solid rgba(255,255,255,0.1)',
        transition: 'width 200ms ease',
      }}
    >
      <textarea id="jsEditor" />
    </div>
  );
};

export default Editor;
