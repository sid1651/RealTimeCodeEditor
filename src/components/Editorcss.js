import React, { useEffect, useRef, useState } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/css/css';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/scroll/simplescrollbars';
import 'codemirror/addon/scroll/simplescrollbars.css';
import ACTIONS from '../Actions';

const EditorCSS = ({ socketRef, roomId, onCodeChange, isClientCollapsed = false, isPreviewCollapsed = false, value = '', username = 'Anonymous' }) => {
  const editorRef = useRef(null);
  const wrapperRef = useRef(null);
  const remoteCursors = useRef({});
  const [myColor] = useState(() => {
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F033FF', '#FF33A8', '#FFC733', '#00BCD4', '#8BC34A', '#9C27B0', '#E91E63'];
    return colors[Math.floor(Math.random() * colors.length)];
  });

  // const computeWidth = () => {
  //   const screenW = typeof window !== 'undefined' ? window.innerWidth : 1920;
  //   const scale = (base) => Math.round((base / 1920) * screenW);
  //   const px = (() => {
  //     if (isClientCollapsed && isPreviewCollapsed) return scale(1740);
  //     if (isClientCollapsed) return scale(1140);
  //     if (isPreviewCollapsed) return scale(1500);
  //     return scale(990);
  //   })();
  //   return `${Math.max(px, 300)}px`;
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

      editorRef.current = Codemirror.fromTextArea(document.getElementById('cssEditor'), {
        mode: 'css',
        theme: 'dracula',
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
            editorType: 'css',
          });
        }
      });

      editorRef.current.on('cursorActivity', (instance) => {
        if (!socketRef.current) return;
        const selection = instance.listSelections()[0];
        socketRef.current.emit('cursor-change', {
          roomId,
          username,
          color: myColor,
          cursor: selection
        });
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
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code, editorType }) => {
      if ((!editorType || editorType === 'css') && typeof code === "string") {
        editorRef.current.setValue(code);
      }
    });

    const handleCursorChange = ({ socketId, username: remoteUser, color, cursor }) => {
      const cm = editorRef.current;
      if (!cm) return;

      const cursorData = remoteCursors.current[socketId] || {};

      if (cursorData.bookmark) cursorData.bookmark.clear();
      if (cursorData.selectionMark) cursorData.selectionMark.clear();
      clearTimeout(cursorData.timeout);

      const newCursorData = {};
      const { anchor, head } = cursor;
      const isSelection = anchor.line !== head.line || anchor.ch !== head.ch;

      if (isSelection) {
        const isForward = cm.indexFromPos(anchor) < cm.indexFromPos(head);
        const start = isForward ? anchor : head;
        const end = isForward ? head : anchor;
        newCursorData.selectionMark = cm.markText(start, end, {
          css: `background-color: ${color}40;`,
        });
      }

      const cursorEl = document.createElement('div');
      cursorEl.style.borderLeftColor = color;
      cursorEl.style.borderLeftWidth = '2px';
      cursorEl.style.borderLeftStyle = 'solid';
      cursorEl.style.position = 'relative';
      cursorEl.style.display = 'inline-block';
      cursorEl.style.height = '1.2em';
      cursorEl.style.marginLeft = '-1px';
      cursorEl.style.zIndex = '10';
      cursorEl.style.pointerEvents = 'none';

      const nameEl = document.createElement('div');
      nameEl.style.backgroundColor = color;
      nameEl.innerText = remoteUser;
      nameEl.style.position = 'absolute';
      nameEl.style.top = '-1.4em';
      nameEl.style.left = '-2px';
      nameEl.style.padding = '2px 6px';
      nameEl.style.borderRadius = '4px';
      nameEl.style.fontSize = '11px';
      nameEl.style.fontWeight = '600';
      nameEl.style.color = 'white';
      nameEl.style.whiteSpace = 'nowrap';
      nameEl.style.pointerEvents = 'none';
      nameEl.style.transition = 'opacity 0.3s ease';
      nameEl.style.boxShadow = '0px 2px 4px rgba(0,0,0,0.2)';
      nameEl.style.zIndex = '11';

      cursorEl.appendChild(nameEl);

      newCursorData.bookmark = cm.setBookmark(head, {
        widget: cursorEl,
        insertLeft: true,
      });

      newCursorData.timeout = setTimeout(() => {
        if (nameEl) nameEl.style.opacity = '0';
      }, 2000);

      remoteCursors.current[socketId] = newCursorData;
    };

    const handleUserDisconnected = ({ socketId }) => {
      const cursorData = remoteCursors.current[socketId];
      if (cursorData) {
        if (cursorData.bookmark) cursorData.bookmark.clear();
        if (cursorData.selectionMark) cursorData.selectionMark.clear();
        clearTimeout(cursorData.timeout);
        delete remoteCursors.current[socketId];
      }
    };

    socketRef.current.on('cursor-change', handleCursorChange);
    socketRef.current.on(ACTIONS.DISCONNECTED, handleUserDisconnected);

    return () => {
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off('cursor-change', handleCursorChange);
        socketRef.current.off(ACTIONS.DISCONNECTED, handleUserDisconnected);
      }
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
      <textarea id="cssEditor" />
    </div>
  );
};

export default EditorCSS;
