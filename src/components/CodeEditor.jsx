import Editor from '@monaco-editor/react';
import { mapLanguageToMonaco, setupMonaco } from '../editor/monacoSetup';

export default function CodeEditor({
  code,
  setCode,
  language,
  theme = 'vs-dark',
  onMount,
  onBeforeMount,
  readOnly = false,
  options = {},
}) {
  const monacoLanguage = mapLanguageToMonaco(language);

  return (
    <Editor
      height="100%"
      language={monacoLanguage}
      value={code}
      theme={theme}
      beforeMount={(monaco) => {
        setupMonaco(monaco);
        onBeforeMount?.(monaco);
      }}
      onMount={onMount}
      onChange={(value) => setCode(value || '')}
      options={{
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        tabSize: 2,
        wordWrap: 'on',
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions: 'allDocuments',
        acceptSuggestionOnEnter: 'on',
        bracketPairColorization: { enabled: true },
        formatOnPaste: true,
        formatOnType: true,
        scrollBeyondLastLine: false,
        readOnly,
        renderLineHighlight: 'line',
        padding: { top: 12, bottom: 12 },
        ...options,
      }}
    />
  );
}
