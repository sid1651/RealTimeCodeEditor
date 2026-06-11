import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Copy, Eye, History, LogOut, MessageSquare, PencilLine } from 'lucide-react';
import Client from './Client';

const joinRequestShellStyle = {
  marginBottom: '18px',
  padding: '16px',
  borderRadius: '18px',
  background: 'rgba(59, 130, 246, 0.08)',
  border: '1px solid rgba(96, 165, 250, 0.18)',
};

const joinRequestTitleStyle = {
  margin: 0,
  fontSize: '13px',
  fontWeight: 700,
  color: '#bfdbfe',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const joinRequestCardStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '12px 14px',
  borderRadius: '14px',
  background: 'rgba(15, 23, 42, 0.72)',
};

const joinRequestButtonStyle = {
  width: 'auto',
  padding: '10px 12px',
};

const unreadDotStyle = {
  position: 'absolute',
  top: '8px',
  right: '10px',
  width: '10px',
  height: '10px',
  borderRadius: '999px',
  background: '#ef4444',
  boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.18)',
};

const EditorSidebar = ({
  isCollapsed,
  onToggleCollapsed,
  roomId,
  isSpectator,
  isLeader,
  pendingClients = [],
  clients = [],
  hasUnreadChatMessage = false,
  onOpenChat,
  onCopyInvite,
  onLeaveRoom,
  onOpenHistory,
  onAdmitParticipant,
  onToggleRole,
}) => {
  return (
    <aside className={`aside ${isCollapsed ? 'collapsed' : ''}`} style={{ height: '100vh' }}>
      <button className="toggle-btn" onClick={onToggleCollapsed}>
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
      <div className="asideInner">
        <div className="logo">
          <img src="/logo-dark.png" alt="logo" />
          {!isCollapsed && <h2>Kódikos</h2>}
        </div>
        {!isCollapsed && (
          <div className="roomMeta">
            <p className="roomIdLabel">Room ID</p>
            <p className="roomIdValue">{roomId}</p>
            <div className={`rolePill ${isSpectator ? 'spectator' : ''}`}>
              {isSpectator ? <Eye size={14} /> : <PencilLine size={14} />}
              <span>{isSpectator ? 'Spectator Mode' : 'Editor Mode'}</span>
            </div>
            {isLeader ? <p className="leaderHint">You can switch members between spectator and editor at any time.</p> : null}
          </div>
        )}
        {!isCollapsed && isLeader && pendingClients.length > 0 && (
          <div style={joinRequestShellStyle}>
            <p style={joinRequestTitleStyle}>Join Requests</p>
            <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
              {pendingClients.map((client) => (
                <div key={client.participantId} style={joinRequestCardStyle}>
                  <div>
                    <p style={{ margin: 0, color: '#e2e8f0', fontWeight: 600 }}>{client.username}</p>
                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '12px' }}>
                      Wants to join as {client.role === 'spectator' ? 'spectator' : 'editor'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => onAdmitParticipant(client.participantId)}
                    style={joinRequestButtonStyle}
                  >
                    Admit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {!isCollapsed && (
          <div className="clientList" style={{ padding: '20px 0' }}>
            <AnimatePresence>
              {clients.map((client) => (
                <Client
                  key={client.socketId}
                  username={client.username}
                  role={client.role}
                  isLeader={client.isLeader}
                  canManageRole={isLeader && !client.isLeader}
                  onToggleRole={() => onToggleRole(client)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
        <div className="actionButtons">
          {!isCollapsed && (
            <button
              className="btn-primary"
              style={{ marginBottom: '10px', position: 'relative' }}
              onClick={onOpenChat}
            >
              <MessageSquare size={16} /> Chat
              {hasUnreadChatMessage ? <span style={unreadDotStyle} /> : null}
            </button>
          )}
          {!isCollapsed && (
            <button className="btn-primary copyBtn" onClick={onCopyInvite}>
              <Copy size={16} /> Copy Invite
            </button>
          )}
          <button className={`btn-primary LeaveBtn ${isCollapsed ? 'collapsed-btn' : ''}`} onClick={onLeaveRoom}>
            <LogOut size={16} /> {!isCollapsed && 'Leave'}
          </button>
        </div>
      </div>
      {isCollapsed && (
        <div className="collapsedSidebarRail">
          <button
            type="button"
            className="collapsedRailBtn"
            onClick={onOpenHistory}
            title="Open history"
          >
            <History size={16} />
          </button>
          <button className="btn-primary LeaveBtn collapsed-btn" onClick={onLeaveRoom}>
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
};

export default EditorSidebar;
