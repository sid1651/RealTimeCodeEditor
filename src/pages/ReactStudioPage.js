import React, { useEffect, useMemo, useRef, useState } from 'react';
import CollaborativeCodeEditor from '../components/CollaborativeCodeEditor';
import Chat from '../components/Chat';
import EditorSidebar from '../components/EditorSidebar';
import EditorTopbar from '../components/EditorTopbar';
import RoomCodeLoader from '../components/RoomCodeLoader';
import { initSocketJS, initSocketCSS } from '../socket';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ACTIONS from '../Actions';
import { ChevronDown, ChevronUp, Code2, LayoutTemplate, TerminalSquare, Save, RotateCcw, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRoomById, inviteUserToRoom, updateRoom } from '../utils/roomApi';
import { checkoutRoomSnapshot, createRoomSnapshot, getRoomSnapshots } from '../utils/snapshotApi';

const DEFAULT_REACT_CODE = `function App() {
  const [loveCount, setLoveCount] = useState(128);
  const features = [
    "Real-time editing with your team",
    "Fast JSX and CSS experiments",
    "A workspace that keeps your ideas together"
  ];

  return (
    <main className="love-shell">
      <section className="love-hero">
        <div className="love-copy">
          <p className="love-kicker">Made with love in Kodikos</p>
          <h1>Build together, ship together, and enjoy the process.</h1>
          <p className="love-lede">
            This project is made with love for collaborative builders who want a beautiful place to sketch, test, and refine React ideas live.
          </p>

          <div className="love-actions">
            <button className="love-button" onClick={() => setLoveCount((value) => value + 1)}>
              Send more love
            </button>
            <span className="love-pill">{loveCount} creators inspired</span>
          </div>

          <div className="love-metrics">
            <article>
              <strong>Live</strong>
              <span>Edit React and CSS side by side with instant feedback.</span>
            </article>
            <article>
              <strong>Shared</strong>
              <span>Create together without losing the flow of the idea.</span>
            </article>
            <article>
              <strong>Loved</strong>
              <span>A starter page that feels crafted instead of empty.</span>
            </article>
          </div>
        </div>

        <aside className="love-panel">
          <div className="panel-orbit panel-orbit-one"></div>
          <div className="panel-orbit panel-orbit-two"></div>

          <div className="panel-badge">Project starter</div>

          <div className="panel-card">
            <p className="panel-label">Why this exists</p>
            <h2>A collaborative studio for ideas that deserve a nicer beginning.</h2>
            <p className="panel-text">
              Start with a thoughtful default, then remix every part of it into your own product, landing page, or experiment.
            </p>
          </div>

          <div className="feature-list">
            {features.map((item, index) => (
              <div className="feature-tile" key={item}>
                <span>0{index + 1}</span>
                <div>
                  <strong>{item}</strong>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}`;

const DEFAULT_CSS_CODE = `:root {
  --night: #07111a;
  --navy: #10243a;
  --rose: #ff7b72;
  --peach: #ffb36b;
  --cream: #fff7ef;
  --mist: #c9d7e6;
  --glass: rgba(9, 17, 27, 0.72);
  --line: rgba(255, 255, 255, 0.1);
  --shadow: 0 30px 90px rgba(0, 0, 0, 0.34);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.love-shell {
  min-height: 100vh;
  padding: 28px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top left, rgba(255, 123, 114, 0.24), transparent 26%),
    radial-gradient(circle at 80% 20%, rgba(255, 179, 107, 0.18), transparent 20%),
    linear-gradient(145deg, var(--night) 0%, var(--navy) 55%, #050a11 100%);
  color: var(--cream);
  font-family: "Inter", "Segoe UI", sans-serif;
}

.love-hero {
  width: min(1120px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: 26px;
  align-items: center;
}

.love-copy,
.love-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 34px;
  background: var(--glass);
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow);
}

.love-copy {
  padding: 42px;
}

.love-copy::after,
.love-panel::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 30%);
  pointer-events: none;
}

.love-kicker,
.panel-label,
.panel-badge {
  margin: 0;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.78rem;
  font-weight: 700;
}

.love-kicker {
  color: #ffc9b6;
}

.love-copy h1 {
  margin: 16px 0 0;
  max-width: 11ch;
  font-family: "Avenir Next Condensed", "Arial Narrow", sans-serif;
  font-size: clamp(3rem, 7vw, 5.6rem);
  line-height: 0.92;
  letter-spacing: -0.05em;
}

.love-lede {
  max-width: 35rem;
  margin: 20px 0 0;
  color: var(--mist);
  font-size: 1.06rem;
  line-height: 1.8;
}

.love-actions {
  margin-top: 30px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
}

.love-button {
  border: none;
  border-radius: 999px;
  padding: 14px 22px;
  background: linear-gradient(135deg, var(--rose), var(--peach));
  color: #24130f;
  font-size: 0.98rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 18px 40px rgba(255, 123, 114, 0.28);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.love-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 24px 44px rgba(255, 123, 114, 0.34);
}

.love-pill {
  padding: 10px 15px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  color: #ffe7d1;
  font-weight: 700;
}

.love-metrics {
  margin-top: 30px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.love-metrics article,
.feature-tile,
.panel-card {
  border-radius: 24px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.04);
}

.love-metrics article {
  padding: 18px;
}

.love-metrics strong {
  display: block;
  font-size: 1.3rem;
  line-height: 1;
}

.love-metrics span {
  display: block;
  margin-top: 10px;
  color: var(--mist);
  line-height: 1.5;
}

.love-panel {
  min-height: 640px;
  padding: 24px;
  background: linear-gradient(180deg, rgba(13, 23, 35, 0.96), rgba(8, 13, 21, 0.92));
}

.panel-orbit {
  position: absolute;
  border-radius: 999px;
  filter: blur(6px);
}

.panel-orbit-one {
  top: 40px;
  right: 36px;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, rgba(255, 123, 114, 0.35), transparent 70%);
}

.panel-orbit-two {
  bottom: 60px;
  left: 12px;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(255, 179, 107, 0.22), transparent 72%);
}

.panel-badge {
  position: relative;
  z-index: 1;
  display: inline-flex;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #ffd8c8;
}

.panel-card {
  position: relative;
  z-index: 1;
  margin-top: 18px;
  padding: 24px;
}

.panel-label {
  color: #ffcfb9;
}

.panel-card h2 {
  margin: 14px 0 0;
  font-size: 2rem;
  line-height: 1.1;
  color: var(--cream);
}

.panel-text {
  margin: 14px 0 0;
  color: var(--mist);
  line-height: 1.7;
}

.feature-list {
  position: relative;
  z-index: 1;
  margin-top: 18px;
  display: grid;
  gap: 12px;
}

.feature-tile {
  padding: 16px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.feature-tile span {
  display: inline-flex;
  min-width: 40px;
  color: #ffc8ae;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.feature-tile strong {
  display: block;
  font-size: 1rem;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .love-shell {
    padding: 18px;
  }

  .love-hero {
    grid-template-columns: 1fr;
  }

  .love-copy {
    padding: 28px;
  }

  .love-metrics {
    grid-template-columns: 1fr;
  }

  .love-panel {
    min-height: auto;
  }
}`;

const isLegacyReactStarter = (source = '') => {
  const normalized = source.trim();
  if (!normalized) {
    return true;
  }

  const legacyMarkers = [
    'Hello from Kodikos',
    'Build React UI together.',
    'Design something people want to keep open.',
    'Build together, ship together, and enjoy the process.'
  ];

  const alreadyLatest = normalized.includes('Kodikos React Studio')
    && normalized.includes('GitHub fetcher')
    && normalized.includes('Fetch Repo');

  return !alreadyLatest && legacyMarkers.some((marker) => normalized.includes(marker));
};

const isLegacyCssStarter = (source = '') => {
  const normalized = source.trim();
  if (!normalized) {
    return true;
  }

  const legacyMarkers = [
    '.demo-shell',
    '.starter-shell',
    '.love-shell'
  ];

  const alreadyLatest = normalized.includes('.love-topbar')
    && normalized.includes('.fetcher-card')
    && normalized.includes('.topbar-nav');

  return !alreadyLatest && legacyMarkers.some((marker) => normalized.includes(marker));
};

const getStarterReactCode = (source) => (
  isLegacyReactStarter(source) ? DEFAULT_REACT_CODE : source
);

const getStarterCssCode = (source) => (
  isLegacyCssStarter(source) ? DEFAULT_CSS_CODE : source
);

const normalizeReactSource = (source) => {
  const withoutImports = source
    .replace(/^\s*import\s.+?;?\s*$/gm, '')
    .replace(/^\s*export\s+default\s+/gm, '');

  const trimmed = withoutImports.trim();
  const runtimePrelude = `const {
  Fragment,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition
} = React;
const { createRoot } = ReactDOM;`;

  if (!trimmed) {
    return `${runtimePrelude}\nfunction App() { return <div />; }\ncreateRoot(document.getElementById('root')).render(<App />);`;
  }

  const hasRenderCall = /ReactDOM\.createRoot|ReactDOM\.render|createRoot\s*\(/.test(trimmed);

  if (hasRenderCall) {
    return `${runtimePrelude}\n${trimmed}`;
  }

  return `${runtimePrelude}\n${trimmed}\n\nconst __reactStudioRoot = createRoot(document.getElementById('root'));\n__reactStudioRoot.render(<App />);`;
};

const buildPreviewDocument = (reactCode, cssCode) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React Studio Preview</title>
    <style>
      html, body, #root {
        margin: 0;
        min-height: 100%;
      }

      body {
        background: #020617;
      }

      ${cssCode}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      const emitMessage = (payload) => {
        window.parent.postMessage({ source: 'react-studio-preview', ...payload }, '*');
      };

      const formatConsoleValue = (value) => {
        if (typeof value === 'string') return value;
        try {
          return JSON.stringify(value, null, 2);
        } catch (error) {
          return String(value);
        }
      };

      ['log', 'warn', 'error', 'info'].forEach((method) => {
        const original = console[method];
        console[method] = (...args) => {
          emitMessage({
            type: method === 'log' ? 'console' : method,
            payload: args.map(formatConsoleValue).join(' ')
          });
          original.apply(console, args);
        };
      });

      window.addEventListener('error', (event) => {
        emitMessage({
          type: 'runtime-error',
          payload: event.message
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        emitMessage({
          type: 'runtime-error',
          payload: event.reason?.message || String(event.reason)
        });
      });

      emitMessage({
        type: 'status',
        payload: 'Preview refreshed successfully.'
      });
    </script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script type="text/babel" data-presets="react">
      ${normalizeReactSource(reactCode)}
    </script>
  </body>
</html>`;

const ReactStudioPage = () => {
  const socketReactRef = useRef(null);
  const socketCssRef = useRef(null);
  const codeRef = useRef({ react: '', reactCss: '' });
  const iframeRef = useRef(null);
  const roomLoadedRef = useRef(false);
  const latestCodeRef = useRef({ react: '', reactCss: '' });

  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryRole = new URLSearchParams(location.search).get('role');
  const username = location.state?.username || user?.name || 'Anonymous';
  const initialRoleRef = useRef(location.state?.role === 'spectator' || queryRole === 'spectator' ? 'spectator' : 'editor');
  const participantIdRef = useRef(location.state?.participantId || `participant-${Date.now()}`);
  const [userRole, setUserRole] = useState(initialRoleRef.current);
  const userRoleRef = useRef(initialRoleRef.current);
  const isSpectator = userRole === 'spectator';

  const [reactCode, setReactCode] = useState(() => getStarterReactCode(localStorage.getItem(`reactCode_${roomId}`) || DEFAULT_REACT_CODE));
  const [cssCode, setCssCode] = useState(() => getStarterCssCode(localStorage.getItem(`reactStudioCss_${roomId}`) || DEFAULT_CSS_CODE));
  const [clients, setClients] = useState([]);
  const [pendingClients, setPendingClients] = useState([]);
  const [socketsReady, setSocketsReady] = useState(false);
  const [joinStatus, setJoinStatus] = useState('connecting');
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [roomLoadError, setRoomLoadError] = useState('');
  const [roomLoadRetryKey, setRoomLoadRetryKey] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [Colaps] = useState(false);
  const [collapseEditor, setCollapseEditor] = useState({
    react: false,
    css: false,
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasUnreadChatMessage, setHasUnreadChatMessage] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [consoleLines, setConsoleLines] = useState(['Preview ready.']);
  const [snapshots, setSnapshots] = useState([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [isSnapshotsLoading, setIsSnapshotsLoading] = useState(false);
  const [isSnapshotSaving, setIsSnapshotSaving] = useState(false);
  const [isCheckingOutSnapshot, setIsCheckingOutSnapshot] = useState(false);
  const [currentSnapshotId, setCurrentSnapshotId] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviteSending, setIsInviteSending] = useState(false);
  const reactEditorMode = useMemo(() => ({ name: 'javascript', json: false, jsx: true }), []);

  useEffect(() => {
    if (isChatOpen) {
      setHasUnreadChatMessage(false);
    }
  }, [isChatOpen]);

  const applyRoomCode = (nextCode = {}) => {
    const nextReact = nextCode.react || DEFAULT_REACT_CODE;
    const nextCss = nextCode.reactCss || DEFAULT_CSS_CODE;

    codeRef.current.react = nextReact;
    codeRef.current.reactCss = nextCss;
    latestCodeRef.current = {
      react: nextReact,
      reactCss: nextCss,
    };

    setReactCode(nextReact);
    setCssCode(nextCss);
  };

  useEffect(() => {
    localStorage.setItem(`reactCode_${roomId}`, reactCode);
    codeRef.current.react = reactCode;
    latestCodeRef.current.react = reactCode;
  }, [reactCode, roomId]);

  useEffect(() => {
    localStorage.setItem(`reactStudioCss_${roomId}`, cssCode);
    codeRef.current.reactCss = cssCode;
    latestCodeRef.current.reactCss = cssCode;
  }, [cssCode, roomId]);

  useEffect(() => {
    userRoleRef.current = userRole;
  }, [userRole]);

  useEffect(() => {
    let cancelled = false;

    const loadRoom = async () => {
      roomLoadedRef.current = false;
      setRoomLoadError('');
      setIsRoomLoading(true);

      try {
        const data = await getRoomById(roomId);
        if (cancelled) {
          return;
        }

        const room = data.room;
        if (!room) {
          setRoomLoadError('This room could not be found. Please check the link or go back to the dashboard.');
          return;
        }

        const nextCode = room.code || {};
        const nextReact = getStarterReactCode(nextCode.react || DEFAULT_REACT_CODE);
        const nextCss = getStarterCssCode(nextCode.reactCss || DEFAULT_CSS_CODE);

        applyRoomCode({
          react: nextReact,
          reactCss: nextCss,
        });
        roomLoadedRef.current = true;

        if (nextReact !== nextCode.react || nextCss !== nextCode.reactCss) {
          await updateRoom(roomId, {
            code: {
              ...nextCode,
              react: nextReact,
              reactCss: nextCss,
            },
          });
        }
      } catch (error) {
        if (!cancelled) {
          const message = error.response?.data?.message || 'Unable to load room data.';
          setRoomLoadError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setIsRoomLoading(false);
        }
      }
    };

    loadRoom();

    return () => {
      cancelled = true;
    };
  }, [roomId, roomLoadRetryKey]);

  useEffect(() => {
    const loadSnapshots = async () => {
      setIsSnapshotsLoading(true);
      try {
        const data = await getRoomSnapshots(roomId);
        setSnapshots(data.snapshots || []);
        setCurrentSnapshotId(data.headSnapshotId || null);
      } catch (error) {
        console.error('Failed to load React room snapshots', error);
      } finally {
        setIsSnapshotsLoading(false);
      }
    };

    loadSnapshots();
  }, [roomId]);

  useEffect(() => {
    if (!roomLoadedRef.current) {
      return undefined;
    }

    const timeout = setTimeout(async () => {
      try {
        await updateRoom(roomId, {
          lastOpenedAt: new Date().toISOString(),
          code: {
            react: reactCode,
            reactCss: cssCode,
          },
        });
      } catch (error) {
        console.error('Failed to persist React room', error);
      }
    }, 900);

    return () => clearTimeout(timeout);
  }, [cssCode, reactCode, roomId]);

  useEffect(() => {
    const flushRoomState = async () => {
      if (!roomLoadedRef.current) {
        return;
      }

      try {
        await updateRoom(roomId, {
          lastOpenedAt: new Date().toISOString(),
          code: {
            react: latestCodeRef.current.react,
            reactCss: latestCodeRef.current.reactCss,
          },
        });
      } catch (error) {
        console.error('Failed to flush React room state on exit', error);
      }
    };

    const handlePageHide = () => {
      flushRoomState();
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      flushRoomState();
    };
  }, [roomId]);

  useEffect(() => {
    if (isRoomLoading || !roomLoadedRef.current) {
      return undefined;
    }

    let cancelled = false;

    const initSecondarySocket = async () => {
      if (socketCssRef.current) {
        setSocketsReady(true);
        return;
      }

      socketCssRef.current = await initSocketCSS();
      if (cancelled) {
        return;
      }

      const handleErrors = (err) => {
        console.error('Socket connection error:', err);
        toast.error('Socket connection failed. Please try again.');
        navigate('/');
      };

      socketCssRef.current.on('connect_error', handleErrors);
      socketCssRef.current.on(ACTIONS.SYNC_CODE, (payload) => {
        if (payload?.editorType === 'react-css' && typeof payload?.code === 'string') {
          codeRef.current.reactCss = payload.code;
          setCssCode(payload.code);
        }
      });
      socketCssRef.current.on(ACTIONS.CODE_CHANGE, (payload) => {
        if (payload?.editorType === 'react-css' && typeof payload?.code === 'string') {
          setCssCode(payload.code);
        }
      });

      const joinPayload = { roomId, username, role: userRoleRef.current, participantId: participantIdRef.current, userId: user?.id || null };
      socketCssRef.current.emit(ACTIONS.JOIN, joinPayload);
      setSocketsReady(true);
    };

    const initAll = async () => {
      try {
        socketReactRef.current = await initSocketJS();

        const handleErrors = (err) => {
          console.error('Socket connection error:', err);
          toast.error('Socket connection failed. Please try again.');
          navigate('/');
        };

        socketReactRef.current.on('connect_error', handleErrors);
        socketReactRef.current.on(ACTIONS.JOIN_ERROR, ({ message }) => {
          toast.error(message || 'Unable to join this room.');
          navigate('/home');
        });
        socketReactRef.current.on(ACTIONS.JOIN_PENDING, ({ pendingClients: incomingPendingClients }) => {
          setJoinStatus('pending');
          setPendingClients(incomingPendingClients || []);
        });
        socketReactRef.current.on(ACTIONS.JOIN_REQUEST, ({ pendingClients: incomingPendingClients }) => {
          setPendingClients(incomingPendingClients || []);
        });
        socketReactRef.current.on(ACTIONS.JOIN_APPROVED, async () => {
          setJoinStatus('approved');
          await initSecondarySocket();
        });

        const joinPayload = { roomId, username, role: initialRoleRef.current, participantId: participantIdRef.current, userId: user?.id || null };
        socketReactRef.current.emit(ACTIONS.JOIN, joinPayload);

        socketReactRef.current.on(ACTIONS.JOINED, async ({ clients: joinedClients, pendingClients: incomingPendingClients, username: joinedUsername, socketId, participantId }) => {
          if (joinedUsername && joinedUsername !== username) {
            toast.success(`${joinedUsername} has joined the room!`);
          }
          setClients(joinedClients);
          setPendingClients(incomingPendingClients || []);

          if (joinedClients.some((client) => client.participantId === participantIdRef.current)) {
            setJoinStatus('approved');
            await initSecondarySocket();
          }

          socketReactRef.current.emit(ACTIONS.SYNC_CODE, { code: codeRef.current.react, socketId, participantId, editorType: 'react' });
          if (socketCssRef.current) {
            socketCssRef.current.emit(ACTIONS.SYNC_CODE, { code: codeRef.current.reactCss, socketId, participantId, editorType: 'react-css' });
          }
        });

        socketReactRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username: leftUsername, clients: updatedClients, pendingClients: incomingPendingClients }) => {
          toast.success(`${leftUsername} has left the room`);
          setPendingClients(incomingPendingClients || []);
          if (updatedClients) {
            setClients(updatedClients);
          } else {
            setClients((prev) => prev.filter((client) => client.socketId !== socketId));
          }
        });

        socketReactRef.current.on(ACTIONS.ROLE_CHANGED, ({ clients: updatedClients, pendingClients: incomingPendingClients, participantId, role, username: changedUsername }) => {
          setClients(updatedClients);
          setPendingClients(incomingPendingClients || []);

          if (participantId === participantIdRef.current) {
            setUserRole(role);
            toast.success(`You are now an ${role}.`);
            return;
          }

          toast.success(`${changedUsername} is now an ${role}.`);
        });

        socketReactRef.current.on(ACTIONS.SYNC_CODE, (payload) => {
          if (payload?.editorType === 'react' && typeof payload?.code === 'string') {
            codeRef.current.react = payload.code;
            setReactCode(payload.code);
          }
        });

        socketReactRef.current.on(ACTIONS.CODE_CHANGE, (payload) => {
          if (payload?.editorType === 'react' && typeof payload?.code === 'string') {
            setReactCode(payload.code);
          }
        });
      } catch (err) {
        console.error('Failed to init sockets', err);
        toast.error('Failed to connect to collaboration servers.');
        navigate('/');
      }
    };

    initAll();

    return () => {
      cancelled = true;
      setSocketsReady(false);
      setJoinStatus('connecting');
      socketReactRef.current?.disconnect();
      socketCssRef.current?.disconnect();
      socketReactRef.current = null;
      socketCssRef.current = null;
    };
  }, [isRoomLoading, navigate, roomId, username, user?.id]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.source !== 'react-studio-preview') {
        return;
      }

      const prefixMap = {
        console: '[log]',
        info: '[info]',
        warn: '[warn]',
        error: '[error]',
        'runtime-error': '[runtime-error]',
        status: '[status]',
      };

      const nextLine = `${prefixMap[event.data.type] || '[preview]'} ${event.data.payload}`;
      setConsoleLines((current) => [...current.slice(-24), nextLine]);

      if (event.data.type === 'runtime-error' || event.data.type === 'error') {
        setActiveTab('terminal');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const previewDocument = useMemo(() => buildPreviewDocument(reactCode, cssCode), [reactCode, cssCode]);

  useEffect(() => {
    setConsoleLines(['Preview rebuilding...']);
  }, [previewDocument]);

  const isLeader = clients.some((client) => client.participantId === participantIdRef.current && client.isLeader);

  const handleRoleChange = (targetParticipantId, nextRole) => {
    if (!socketReactRef.current || !isLeader) {
      return;
    }

    socketReactRef.current.emit(ACTIONS.UPDATE_ROLE, {
      roomId,
      participantId: targetParticipantId,
      role: nextRole,
    });
  };

  const admitParticipant = (targetParticipantId) => {
    if (!socketReactRef.current || !isLeader) {
      return;
    }

    socketReactRef.current.emit(ACTIONS.ADMIT_PARTICIPANT, {
      roomId,
      participantId: targetParticipantId,
    });
  };

  const saveSnapshot = async () => {
    const nextMessage = commitMessage.trim();

    if (isSpectator) {
      toast.error('Spectators can review history, but cannot create snapshots.');
      return;
    }

    if (!nextMessage) {
      toast.error('Write a commit message before saving a snapshot.');
      return;
    }

    setIsSnapshotSaving(true);

    try {
      const payload = {
        message: nextMessage,
        authorName: username,
        code: {
          react: latestCodeRef.current.react,
          reactCss: latestCodeRef.current.reactCss,
        },
      };

      const data = await createRoomSnapshot(roomId, payload);
      setSnapshots((current) => [data.snapshot, ...current]);
      setCurrentSnapshotId(data.snapshot.snapshotId);
      setCommitMessage('');
      toast.success('Snapshot saved.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save snapshot.');
    } finally {
      setIsSnapshotSaving(false);
    }
  };

  const checkoutSnapshot = async (snapshot) => {
    setIsCheckingOutSnapshot(true);

    try {
      const data = await checkoutRoomSnapshot(roomId, snapshot.snapshotId);
      applyRoomCode(data.room.code || snapshot.code || {});
      setCurrentSnapshotId(snapshot.snapshotId);

      if (socketReactRef.current) {
        socketReactRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code: data.room.code?.react || snapshot.code?.react || '',
          editorType: 'react',
        });
      }

      if (socketCssRef.current) {
        socketCssRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code: data.room.code?.reactCss || snapshot.code?.reactCss || '',
          editorType: 'react-css',
        });
      }

      toast.success(`Checked out "${snapshot.message}".`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to checkout snapshot.');
    } finally {
      setIsCheckingOutSnapshot(false);
    }
  };

  const openInviteModal = () => {
    if (!user?.email) {
      toast.error('Sign in to send room invites.');
      return;
    }

    if (isSpectator) {
      toast.error('Spectators can view the room, but cannot send invites.');
      return;
    }

    setIsInviteModalOpen(true);
  };

  const submitEmailInvite = async (event) => {
    event.preventDefault();

    const nextEmail = inviteEmail.trim().toLowerCase();

    if (!nextEmail) {
      toast.error('Enter an email address to invite.');
      return;
    }

    setIsInviteSending(true);

    try {
      const data = await inviteUserToRoom(roomId, { email: nextEmail });
      setInviteEmail('');
      setIsInviteModalOpen(false);
      toast.success(data.message || 'Invite sent successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to send invite.');
    } finally {
      setIsInviteSending(false);
    }
  };

  const leaveRoom = () => {
    localStorage.removeItem(`reactCode_${roomId}`);
    localStorage.removeItem(`reactStudioCss_${roomId}`);
    navigate('/');
  };

  const copySpectatorInvite = async () => {
    try {
      const link = `${window.location.origin}/react-studio/${roomId}?role=spectator`;
      await navigator.clipboard.writeText(link);
      toast.success('Spectator Invite copied!');
    } catch {
      toast.error('Failed to copy invite');
    }
  };

  if (isRoomLoading || roomLoadError) {
    return (
      <RoomCodeLoader
        title="Opening React room"
        subtitle="Restoring the saved workspace before live collaboration starts."
        status="Loading saved room state"
        error={roomLoadError}
        onRetry={() => setRoomLoadRetryKey((key) => key + 1)}
        onBack={() => navigate('/dashboard')}
      />
    );
  }

  if (joinStatus !== 'approved') {
    const isWaitingForHost = joinStatus === 'pending';

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #111827 55%, #1e293b 100%)',
        padding: '24px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '520px',
          background: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          borderRadius: '24px',
          padding: '32px',
          color: '#e2e8f0',
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.45)',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '18px',
            background: isWaitingForHost ? 'rgba(59, 130, 246, 0.18)' : 'rgba(16, 185, 129, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <UserPlus size={24} color={isWaitingForHost ? '#60a5fa' : '#34d399'} />
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', lineHeight: 1.2 }}>
            {isWaitingForHost ? 'Waiting for the room leader' : 'Joining room'}
          </h1>
          <p style={{ margin: '14px 0 0', color: '#94a3b8', lineHeight: 1.6 }}>
            {isWaitingForHost
              ? `${username}, your request to join room ${roomId} has been sent. The room leader needs to admit you before the React studio opens.`
              : `Connecting you to room ${roomId}. This should only take a moment.`}
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={leaveRoom}
            style={{ marginTop: '24px', width: '100%' }}
          >
            Cancel And Go Back
          </button>
        </div>
      </div>
    );
  }

  const visibleEditors = Object.values(collapseEditor).filter((collapsed) => !collapsed).length;
  const formatSnapshotTime = (timestamp) => {
    const created = new Date(timestamp).getTime();
    const diffMinutes = Math.max(1, Math.floor((Date.now() - created) / 60000));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className={`mainWrape ${isCollapsed ? 'collapsed' : ''}`}>
      <EditorSidebar
        isCollapsed={isCollapsed}
        onToggleCollapsed={() => setIsCollapsed((prev) => !prev)}
        roomId={roomId}
        isSpectator={isSpectator}
        isLeader={isLeader}
        pendingClients={pendingClients}
        clients={clients}
        hasUnreadChatMessage={hasUnreadChatMessage}
        onOpenChat={() => setIsChatOpen(true)}
        onCopyInvite={copySpectatorInvite}
        onLeaveRoom={leaveRoom}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onAdmitParticipant={admitParticipant}
        onToggleRole={(client) => handleRoleChange(client.participantId, client.role === 'spectator' ? 'editor' : 'spectator')}
      />

      <div className="workspacePane">
        <EditorTopbar
          roomId={roomId}
          eyebrow="Collaborative React Workspace"
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenInvite={openInviteModal}
        />

        <div className="editorWrap">
          <div className="editorholder">
            {!collapseEditor.react && (
              <div style={{ flex: visibleEditors > 0 ? '1 1 0' : '0 0 auto' }} className="editorContainer">
                <div className="editorHeader">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Code2 size={16} color="#67e8f9" /> React JSX</span>
                  <button className="collapse-editor-btn" onClick={() => setCollapseEditor((prev) => ({ ...prev, react: true }))}><ChevronUp size={18} /></button>
                </div>
                {socketsReady && (
                  <CollaborativeCodeEditor
                    socketRef={socketReactRef}
                    roomId={roomId}
                    username={username}
                    value={reactCode}
                    readOnly={isSpectator}
                    editorType="react"
                    mode={reactEditorMode}
                    enableCloseTags
                    enableCloseBrackets
                    onCodeChange={setReactCode}
                  />
                )}
              </div>
            )}
            {collapseEditor.react && (
              <div className="collapsed-tab" onClick={() => setCollapseEditor((prev) => ({ ...prev, react: false }))}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Code2 size={16} color="#67e8f9" /> React</span> <ChevronDown size={18} />
              </div>
            )}

            {!collapseEditor.css && (
              <div style={{ flex: visibleEditors > 0 ? '1 1 0' : '0 0 auto' }} className="editorContainer">
                <div className="editorHeader">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Code2 size={16} color="#3b82f6" /> CSS</span>
                  <button className="collapse-editor-btn" onClick={() => setCollapseEditor((prev) => ({ ...prev, css: true }))}><ChevronUp size={18} /></button>
                </div>
                {socketsReady && (
                  <CollaborativeCodeEditor
                    socketRef={socketCssRef}
                    roomId={roomId}
                    username={username}
                    value={cssCode}
                    readOnly={isSpectator}
                    editorType="react-css"
                    mode="css"
                    enableCloseBrackets
                    onCodeChange={setCssCode}
                  />
                )}
              </div>
            )}
            {collapseEditor.css && (
              <div className="collapsed-tab" onClick={() => setCollapseEditor((prev) => ({ ...prev, css: false }))}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Code2 size={16} color="#3b82f6" /> CSS</span> <ChevronDown size={18} />
              </div>
            )}
          </div>

          <div className={`previwcolapsstyle ${Colaps ? 'collapsed' : ''}`}>
            <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  onClick={() => setActiveTab('preview')}
                  style={{ background: 'none', border: 'none', color: activeTab === 'preview' ? '#fff' : '#6272a4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
                >
                  <LayoutTemplate size={18} /> Live Preview
                </button>
                <button
                  onClick={() => setActiveTab('terminal')}
                  style={{ background: 'none', border: 'none', color: activeTab === 'terminal' ? '#fff' : '#6272a4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
                >
                  <TerminalSquare size={18} /> Console
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 700 }}>
                <Code2 size={14} /> Live React
              </div>
            </h3>
            {!Colaps && activeTab === 'preview' && (
              <iframe
                ref={iframeRef}
                title="React Live Preview"
                style={{ width: '100%', height: 'calc(100% - 50px)', border: 'none', backgroundColor: '#fff' }}
                srcDoc={previewDocument}
                sandbox="allow-scripts"
              />
            )}
            {!Colaps && activeTab === 'terminal' && (
              <div style={{ padding: '16px', backgroundColor: '#1e1e2e', color: '#f8f8f2', fontFamily: 'monospace', height: 'calc(100% - 50px)', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {consoleLines.join('\n')}
              </div>
            )}
          </div>
        </div>
      </div>

      {socketsReady && (
        <Chat
          socketRef={socketReactRef}
          roomId={roomId}
          username={username}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onUnreadMessage={setHasUnreadChatMessage}
        />
      )}

      {isInviteModalOpen && <div className="dashboardModalBackdrop" onClick={() => setIsInviteModalOpen(false)} />}
      {isInviteModalOpen && (
        <div className="dashboardModal inviteRoomModal">
          <div className="dashboardModalHead">
            <div>
              <p className="dashboardEyebrow">Room Access</p>
              <h3>Invite By Email</h3>
            </div>
            <button type="button" className="dashboardIconBtn" onClick={() => setIsInviteModalOpen(false)}>×</button>
          </div>

          <form className="dashboardModalForm" onSubmit={submitEmailInvite}>
            <label>
              Account Email
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="teammate@example.com"
                autoFocus
              />
            </label>

            <p className="editorInviteHint">
              If this email already has a Kodikos account, they will get a dashboard notification to join this room.
            </p>

            <button type="submit" className="btn-primary" disabled={isInviteSending}>
              <UserPlus size={16} /> {isInviteSending ? 'Sending Invite...' : 'Send Invite'}
            </button>
          </form>
        </div>
      )}

      {isHistoryOpen && <div className="historyDrawerBackdrop" onClick={() => setIsHistoryOpen(false)} />}
      {isHistoryOpen && (
        <aside className="historyDrawer">
          <div className="historyDrawerHead">
            <div>
              <p className="snapshotPanelEyebrow">Version Control</p>
              <h3>React Room History</h3>
            </div>
            <button type="button" className="dashboardIconBtn historyCloseBtn" onClick={() => setIsHistoryOpen(false)}>×</button>
          </div>

          <div className="snapshotComposer historyComposer">
            <textarea
              className="snapshotMessageInput"
              value={commitMessage}
              onChange={(event) => setCommitMessage(event.target.value)}
              placeholder="Write a commit message for this snapshot..."
              rows={3}
              disabled={isSpectator || isSnapshotSaving}
            />
            <button
              type="button"
              className="btn-primary snapshotSaveBtn"
              onClick={saveSnapshot}
              disabled={isSpectator || isSnapshotSaving}
            >
              <Save size={16} /> {isSnapshotSaving ? 'Saving...' : 'Save Snapshot'}
            </button>
          </div>

          <div className="historyTimeline">
            {isSnapshotsLoading ? (
              <div className="snapshotEmptyState">Loading history...</div>
            ) : snapshots.length ? snapshots.map((snapshot, index) => (
              <div key={snapshot.snapshotId} className="historyTimelineItem">
                <button
                  type="button"
                  className={`historyTimelineDot ${currentSnapshotId === snapshot.snapshotId ? 'active' : ''}`}
                  onClick={() => checkoutSnapshot(snapshot)}
                >
                  <span className="historyDotTooltip">
                    <strong>{snapshot.message}</strong>
                    <span>{snapshot.authorName} · {formatSnapshotTime(snapshot.createdAt)}</span>
                  </span>
                </button>
                {index < snapshots.length - 1 ? <div className="historyTimelineConnector" /> : null}
                <div className={`historyTimelineCard ${currentSnapshotId === snapshot.snapshotId ? 'active' : ''}`}>
                  <div className="snapshotTreeTopline">
                    <p>{snapshot.message}</p>
                    <span>{formatSnapshotTime(snapshot.createdAt)}</span>
                  </div>
                  <div className="snapshotTreeMeta">
                    <span>{snapshot.authorName}</span>
                    {currentSnapshotId === snapshot.snapshotId ? <strong>Current</strong> : null}
                  </div>
                  <button
                    type="button"
                    className="snapshotCheckoutBtn"
                    onClick={() => checkoutSnapshot(snapshot)}
                    disabled={isCheckingOutSnapshot}
                  >
                    <RotateCcw size={14} /> Checkout
                  </button>
                </div>
              </div>
            )) : (
              <div className="snapshotEmptyState">
                Save your first snapshot to build a Git-like room history.
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};

export default ReactStudioPage;
