import CodeEditor from './CodeEditor';
import { mapLanguageToMonaco } from '../editor/monacoSetup';

const ReactFileEditor = ({ mode, value = '', onCodeChange, readOnly = false }) => (
  <div className="codeEditorShell monacoEditorShell" style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
    <CodeEditor
      code={value || ''}
      setCode={(code) => onCodeChange?.(code)}
      language={mapLanguageToMonaco(mode)}
      readOnly={readOnly}
    />
  </div>
);

export default ReactFileEditor;
