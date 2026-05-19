import React, { useEffect, useRef, useState } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/css/css';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/scroll/simplescrollbars';
import 'codemirror/addon/scroll/simplescrollbars.css';
import ACTIONS from '../Actions';

const CollaborativeCodeEditor = ({
  socketRef,
  roomId,
  onCodeChange,
  value = '',
  username = 'Anonymous',
  readOnly = false,
  editorType,
  mode,
  enableCloseTags = false,
  enableCloseBrackets = true,
}) => {
  const editorRef = useRef(null);
  const textAreaRef = useRef(null);
  const remoteCursors = useRef({});
  const readOnlyRef = useRef(readOnly);
  const onChangeRef = useRef(onCodeChange);
  const initialValueRef = useRef(value);
  const [myColor] = useState(() => {
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F033FF', '#FF33A8', '#FFC733', '#00BCD4', '#8BC34A', '#9C27B0', '#E91E63'];
    return colors[Math.floor(Math.random() * colors.length)];
  });

  useEffect(() => {
    onChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  useEffect(() => {
    readOnlyRef.current = readOnly;
    if (editorRef.current) {
      editorRef.current.setOption('readOnly', readOnly);
    }
  }, [readOnly]);

  useEffect(() => {
    editorRef.current = Codemirror.fromTextArea(textAreaRef.current, {
      mode,
      theme: 'dracula',
      autoCloseTags: enableCloseTags,
      autoCloseBrackets: enableCloseBrackets,
      lineNumbers: true,
      readOnly,
      scrollbarStyle: 'simple',
      lineWrapping: true,
      tabSize: 2,
      indentUnit: 2,
    });

    if (initialValueRef.current) {
      editorRef.current.setValue(initialValueRef.current);
    }

    editorRef.current.on('change', (instance, changes) => {
      const { origin } = changes;
      const code = instance.getValue();
      onChangeRef.current?.(code);

      if (!readOnlyRef.current && origin !== 'setValue' && socketRef?.current) {
        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code,
          editorType,
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
        cursor: selection,
        editorType,
      });
    });

    editorRef.current.setSize('100%', '100%');

    return () => {
      if (editorRef.current) {
        editorRef.current.toTextArea?.();
        editorRef.current = null;
      }
    };
  }, [editorType, enableCloseBrackets, enableCloseTags, mode, myColor, readOnly, roomId, socketRef, username]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    if (editor.getValue() !== (value || '')) {
      const cursor = editor.getCursor();
      editor.setValue(value || '');
      editor.setCursor(cursor);
    }
  }, [value]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !editorRef.current) return;

    const handleCodeChange = ({ code, editorType: incomingEditorType }) => {
      if ((!incomingEditorType || incomingEditorType === editorType) && typeof code === 'string') {
        editorRef.current.setValue(code);
      }
    };

    const handleCursorChange = ({ socketId, username: remoteUser, color, cursor, editorType: incomingEditorType }) => {
      if (incomingEditorType && incomingEditorType !== editorType) {
        return;
      }

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

    socket.on(ACTIONS.CODE_CHANGE, handleCodeChange);
    socket.on('cursor-change', handleCursorChange);
    socket.on(ACTIONS.DISCONNECTED, handleUserDisconnected);

    return () => {
      socket.off(ACTIONS.CODE_CHANGE, handleCodeChange);
      socket.off('cursor-change', handleCursorChange);
      socket.off(ACTIONS.DISCONNECTED, handleUserDisconnected);
    };
  }, [editorType, socketRef]);

  return (
    <div
      className="codeEditorShell"
      style={{
        height: '100%',
        minHeight: 0,
        borderRadius: '6px',
        transition: 'width 200ms ease',
      }}
    >
      <textarea ref={textAreaRef} />
    </div>
  );
};

export default CollaborativeCodeEditor;
