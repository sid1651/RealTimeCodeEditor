import React, { useCallback, useEffect, useRef, useState } from 'react';
import ACTIONS from '../Actions';
import CodeEditor from './CodeEditor';
import { mapLanguageToMonaco } from '../editor/monacoSetup';

const cursorToMonacoRange = (cursor) => {
  const anchor = cursor?.anchor;
  const head = cursor?.head;

  if (anchor && head) {
    return {
      startLineNumber: anchor.lineNumber,
      startColumn: anchor.column,
      endLineNumber: head.lineNumber,
      endColumn: head.column,
    };
  }

  if (
    !cursor?.selectionStartLineNumber
    || !cursor?.selectionStartColumn
    || !cursor?.positionLineNumber
    || !cursor?.positionColumn
  ) {
    return null;
  }

  return {
    startLineNumber: cursor.selectionStartLineNumber,
    startColumn: cursor.selectionStartColumn,
    endLineNumber: cursor.positionLineNumber,
    endColumn: cursor.positionColumn,
  };
};

const CollaborativeCodeEditor = ({
  socketRef,
  roomId,
  onCodeChange,
  value = '',
  username = 'Anonymous',
  readOnly = false,
  editorType,
  mode,
}) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const remoteCursors = useRef({});
  const readOnlyRef = useRef(readOnly);
  const onChangeRef = useRef(onCodeChange);
  const isRemoteChangeRef = useRef(false);
  const [myColor] = useState(() => {
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F033FF', '#FF33A8', '#FFC733', '#00BCD4', '#8BC34A', '#9C27B0', '#E91E63'];
    return colors[Math.floor(Math.random() * colors.length)];
  });

  useEffect(() => {
    onChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  useEffect(() => {
    readOnlyRef.current = readOnly;
    editorRef.current?.updateOptions({ readOnly });
  }, [readOnly]);

  const updateRemoteCursor = useCallback((socketId, remoteUser, color, cursor) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const range = cursorToMonacoRange(cursor);

    if (!editor || !monaco || !socketId || !range) {
      return;
    }

    const cursorData = remoteCursors.current[socketId] || {};
    clearTimeout(cursorData.timeout);

    const decorations = [];
    const isSelection = range.startLineNumber !== range.endLineNumber || range.startColumn !== range.endColumn;

    if (isSelection) {
      decorations.push({
        range: new monaco.Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn),
        options: {
          className: 'remoteCursorSelection',
          inlineClassName: 'remoteCursorSelectionInline',
          hoverMessage: { value: remoteUser || 'Collaborator' },
        },
      });
    }

    decorations.push({
      range: new monaco.Range(range.endLineNumber, range.endColumn, range.endLineNumber, range.endColumn),
      options: {
        afterContentClassName: 'remoteCursorCaret',
        hoverMessage: { value: remoteUser || 'Collaborator' },
      },
    });

    const nextDecorations = editor.deltaDecorations(cursorData.decorations || [], decorations);
    remoteCursors.current[socketId] = {
      decorations: nextDecorations,
      timeout: setTimeout(() => {
        const current = remoteCursors.current[socketId];
        if (current?.decorations) {
          editor.deltaDecorations(current.decorations, []);
        }
      }, 4000),
    };
  }, []);

  const handleMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorSelection((event) => {
      if (!socketRef.current || readOnlyRef.current) return;

      socketRef.current.emit('cursor-change', {
        roomId,
        username,
        color: myColor,
        cursor: {
          selectionStartLineNumber: event.selection.selectionStartLineNumber,
          selectionStartColumn: event.selection.selectionStartColumn,
          positionLineNumber: event.selection.positionLineNumber,
          positionColumn: event.selection.positionColumn,
        },
        editorType,
      });
    });
  }, [editorType, myColor, roomId, socketRef, username]);

  const handleCodeChange = useCallback((code) => {
    onChangeRef.current?.(code);

    if (!readOnlyRef.current && !isRemoteChangeRef.current && socketRef?.current) {
      socketRef.current.emit(ACTIONS.CODE_CHANGE, {
        roomId,
        code,
        editorType,
      });
    }
  }, [editorType, roomId, socketRef]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return undefined;

    const handleIncomingCodeChange = ({ code, editorType: incomingEditorType }) => {
      if ((!incomingEditorType || incomingEditorType === editorType) && typeof code === 'string') {
        isRemoteChangeRef.current = true;
        onChangeRef.current?.(code);
        setTimeout(() => {
          isRemoteChangeRef.current = false;
        }, 0);
      }
    };

    const handleCursorChange = ({ socketId, username: remoteUser, color, cursor, editorType: incomingEditorType }) => {
      if (incomingEditorType && incomingEditorType !== editorType) {
        return;
      }

      updateRemoteCursor(socketId, remoteUser, color, cursor);
    };

    const handleUserDisconnected = ({ socketId }) => {
      const editor = editorRef.current;
      const cursorData = remoteCursors.current[socketId];

      if (editor && cursorData?.decorations) {
        editor.deltaDecorations(cursorData.decorations, []);
      }

      if (cursorData?.timeout) {
        clearTimeout(cursorData.timeout);
      }

      delete remoteCursors.current[socketId];
    };

    socket.on(ACTIONS.CODE_CHANGE, handleIncomingCodeChange);
    socket.on('cursor-change', handleCursorChange);
    socket.on(ACTIONS.DISCONNECTED, handleUserDisconnected);

    return () => {
      socket.off(ACTIONS.CODE_CHANGE, handleIncomingCodeChange);
      socket.off('cursor-change', handleCursorChange);
      socket.off(ACTIONS.DISCONNECTED, handleUserDisconnected);
    };
  }, [editorType, socketRef, updateRemoteCursor]);

  useEffect(() => () => {
    Object.values(remoteCursors.current).forEach((cursorData) => {
      if (cursorData?.timeout) {
        clearTimeout(cursorData.timeout);
      }
    });
  }, []);

  return (
    <div
      className="codeEditorShell monacoEditorShell"
      style={{
        height: '100%',
        width: '100%',
        minHeight: 0,
        borderRadius: '6px',
        overflow: 'hidden',
        transition: 'width 200ms ease',
      }}
    >
      <CodeEditor
        code={value || ''}
        setCode={handleCodeChange}
        language={mapLanguageToMonaco(mode || editorType)}
        readOnly={readOnly}
        onMount={handleMount}
      />
    </div>
  );
};

export default CollaborativeCodeEditor;
