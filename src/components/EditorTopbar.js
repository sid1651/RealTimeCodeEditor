import React from 'react';
import { History, UserPlus } from 'lucide-react';

const EditorTopbar = ({
  roomId,
  eyebrow = 'Collaborative Workspace',
  onOpenHistory,
  onOpenInvite,
  inviteLabel = 'Invite Email',
}) => {
  return (
    <div className="editorTopbar">
      <div className="editorTopbarMeta">
        <p className="editorTopbarEyebrow">{eyebrow}</p>
        <h2>{roomId}</h2>
      </div>

      <div className="editorTopbarActions">
        <button
          type="button"
          className="btn-outline editorTopbarBtn"
          onClick={onOpenHistory}
        >
          <History size={16} /> History
        </button>
        <button
          type="button"
          className="btn-primary editorTopbarBtn editorInviteTopbarBtn"
          onClick={onOpenInvite}
        >
          <UserPlus size={16} /> {inviteLabel}
        </button>
      </div>
    </div>
  );
};

export default EditorTopbar;
