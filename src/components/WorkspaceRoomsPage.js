import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock3, MoreHorizontal, Plus, RefreshCw, Share2, Star, Trash2 } from 'lucide-react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { deleteRoom as deleteRoomRequest, getUserRooms, updateRoom } from '../utils/roomApi';
import { getRoomLanguageLabel, getRoomRoute } from '../utils/roomLanguage';

const iconMap = {
  recent: Clock3,
  favorites: Star,
  shared: Share2,
};

const formatRelativeTime = (timestamp) => {
  const value = new Date(timestamp).getTime();
  const deltaMinutes = Math.max(1, Math.floor((Date.now() - value) / 60000));

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }

  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}d ago`;
};

const WorkspaceRoomsPage = ({
  pageKey,
  title,
  description,
  filterRooms,
  emptyTitle,
  emptyDescription,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const PageIcon = iconMap[pageKey] || Clock3;

  const fetchRooms = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setIsLoading(true);
    try {
      const data = await getUserRooms(user.id);
      setRooms(data.rooms || []);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Unable to load rooms.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const visibleRooms = useMemo(() => {
    const filteredBySection = filterRooms ? filterRooms([...rooms]) : [...rooms];
    const normalized = searchQuery.trim().toLowerCase();

    if (!normalized) {
      return filteredBySection;
    }

    return filteredBySection.filter((room) =>
      room.title.toLowerCase().includes(normalized)
      || room.language.toLowerCase().includes(normalized)
      || room.privacy.toLowerCase().includes(normalized)
    );
  }, [filterRooms, rooms, searchQuery]);

  const openRoom = (room) => {
    const destination = getRoomRoute(room.language, room.roomId);
    navigate(destination, {
      state: {
        username: user?.name || 'Anonymous',
        role: 'editor',
        participantId: uuidV4(),
      },
    });
  };

  const handleRoomUpdate = async (roomId, payload) => {
    const data = await updateRoom(roomId, payload);
    setRooms((current) => current.map((room) => (room.roomId === roomId ? data.room : room)));
    return data.room;
  };

  const toggleStar = async (room) => {
    try {
      await handleRoomUpdate(room.roomId, { isStarred: !room.isStarred });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update favorite.');
    }
  };

  const deleteRoom = async (room) => {
    const shouldDelete = window.confirm(`Delete "${room.title}"?`);
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteRoomRequest(room.roomId);
      setRooms((current) => current.filter((item) => item.roomId !== room.roomId));
      toast.success('Project deleted.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete project.');
    }
  };

  return (
    <div className="workspaceStandalonePage">
      <div className="workspaceStandaloneShell">
        <header className="workspaceStandaloneTopbar">
          <button type="button" className="btn-outline workspaceBackBtn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} /> Back To Dashboard
          </button>

          <button type="button" className="btn-primary" onClick={() => navigate('/home')}>
            <Plus size={18} /> Create Room
          </button>
        </header>

        <section className="workspaceStandaloneHero">
          <div className="workspaceStandaloneCopy">
            <div className="workspaceStandaloneIcon">
              <PageIcon size={20} />
            </div>
            <p className="workspaceStandaloneEyebrow">Workspace Page</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <div className="workspaceStandaloneActions">
            <label className="dashboardSearch workspaceStandaloneSearch">
              <MoreHorizontal size={18} />
              <input
                type="text"
                placeholder="Search rooms, languages, privacy..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>

            <div className="workspaceStandaloneStat">
              <span>Visible Rooms</span>
              <strong>{visibleRooms.length}</strong>
            </div>
          </div>
        </section>

        <section className="workspaceStandaloneContent">
          <div className="dashboardPanelHead">
            <div>
              <h3>{title}</h3>
              <span>{visibleRooms.length} room{visibleRooms.length === 1 ? '' : 's'} available</span>
            </div>
            <button type="button" className="btn-outline" onClick={fetchRooms}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="roomGrid">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="roomCard skeletonCard" />
              ))}
            </div>
          ) : visibleRooms.length ? (
            <div className="roomGrid">
              {visibleRooms.map((room) => (
                <article key={room.roomId} className="roomCard">
                  <div className="roomCardGlow" />
                  <div className="roomCardHeader">
                    <div>
                      <span className={`roomLanguagePill ${room.language}`}>{getRoomLanguageLabel(room.language)}</span>
                      <h4>{room.title}</h4>
                    </div>
                  </div>

                  <p className="roomMetaText">
                    Last edited {formatRelativeTime(room.updatedAt)} · {room.privacy === 'shared' ? 'Shared access' : 'Private room'}
                  </p>

                  <div className="roomCardCollaborators">
                    <div className="collaboratorCluster">
                      {room.collaborators.slice(0, 3).map((collaborator, index) => (
                        <span
                          key={`${room.roomId}-${index}`}
                          className="collaboratorDot"
                          title={collaborator.name || collaborator.email}
                        >
                          {(collaborator.name || collaborator.email || 'K')[0]}
                        </span>
                      ))}
                    </div>
                    <span className="roomLiveTag">{room.activeUsers > 0 ? `${room.activeUsers} active` : 'Idle'}</span>
                  </div>

                  <div className="roomCardFooter">
                    <button type="button" className="dashboardMiniBtn" onClick={() => toggleStar(room)}>
                      <Star size={16} fill={room.isStarred ? 'currentColor' : 'none'} /> {room.isStarred ? 'Starred' : 'Star'}
                    </button>
                    <button type="button" className="dashboardMiniBtn" onClick={() => deleteRoom(room)}>
                      <Trash2 size={16} /> Delete
                    </button>
                    <button type="button" className="btn-primary roomOpenBtn" onClick={() => openRoom(room)}>
                      Open
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="emptyDashboardState workspaceStandaloneEmpty">
              <PageIcon size={28} />
              <h4>{emptyTitle}</h4>
              <p>{emptyDescription}</p>
              <button type="button" className="btn-primary" onClick={() => navigate('/home')}>
                <Plus size={18} /> Create Room
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default WorkspaceRoomsPage;
