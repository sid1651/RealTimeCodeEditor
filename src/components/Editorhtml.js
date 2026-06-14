import CollaborativeCodeEditor from './CollaborativeCodeEditor';

const EditorHTML = ({ socketRef, roomId, onCodeChange, value = '', username = 'Anonymous', readOnly = false }) => (
  <CollaborativeCodeEditor
    socketRef={socketRef}
    roomId={roomId}
    username={username}
    value={value}
    readOnly={readOnly}
    onCodeChange={onCodeChange}
    editorType="html"
    mode="html"
  />
);

export default EditorHTML;
