import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/css/css';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/scroll/simplescrollbars';
import 'codemirror/addon/scroll/simplescrollbars.css';

const ReactFileEditor = ({ mode, value = '', onCodeChange, readOnly = false }) => {
  const textAreaRef = useRef(null);
  const editorRef = useRef(null);
  const readOnlyRef = useRef(readOnly);
  const onChangeRef = useRef(onCodeChange);
  const initialValueRef = useRef(value);
  const initialReadOnlyRef = useRef(readOnly);

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
      lineNumbers: true,
      autoCloseBrackets: true,
      autoCloseTags: true,
      readOnly: initialReadOnlyRef.current,
      scrollbarStyle: 'simple',
      tabSize: 2,
      indentUnit: 2,
      lineWrapping: true,
    });

    editorRef.current.setValue(initialValueRef.current || '');
    editorRef.current.setSize('100%', '100%');

    editorRef.current.on('change', (instance, change) => {
      if (change.origin === 'setValue') {
        return;
      }

      onChangeRef.current?.(instance.getValue());
    });

    return () => {
      editorRef.current?.toTextArea?.();
      editorRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const nextValue = value || '';
    if (editor.getValue() !== nextValue) {
      const cursor = editor.getCursor();
      editor.setValue(nextValue);
      editor.setCursor(cursor);
    }
  }, [value]);

  return <textarea ref={textAreaRef} />;
};

export default ReactFileEditor;
