import CollaborativeCodeEditor from './CollaborativeCodeEditor';

const Editor = ({ socketRef, roomId, onCodeChange, value = '', username = 'Anonymous', readOnly = false }) => (
  <CollaborativeCodeEditor
    socketRef={socketRef}
    roomId={roomId}
    username={username}
    value={value}
    readOnly={readOnly}
    onCodeChange={onCodeChange}
    editorType="js"
    mode="javascript"
  />
);

export default Editor;
