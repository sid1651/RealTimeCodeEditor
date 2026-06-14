import CollaborativeCodeEditor from './CollaborativeCodeEditor';

const EditorCSS = ({ socketRef, roomId, onCodeChange, value = '', username = 'Anonymous', readOnly = false }) => (
  <CollaborativeCodeEditor
    socketRef={socketRef}
    roomId={roomId}
    username={username}
    value={value}
    readOnly={readOnly}
    onCodeChange={onCodeChange}
    editorType="css"
    mode="css"
  />
);

export default EditorCSS;
