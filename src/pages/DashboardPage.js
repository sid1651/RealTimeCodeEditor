import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Clock3, Code2, Compass, FolderOpen, MoreHorizontal, Plus, Search, Settings, Share2, Sparkles, Star, Trash2, LogOut, PencilLine, UploadCloud } from 'lucide-react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { deleteRoom as deleteRoomRequest, getUserRooms, updateRoom } from '../utils/roomApi';
import { updatePassword as updatePasswordRequest } from '../utils/accountApi';
import { getRoomAnalytics } from '../utils/analyticsApi';
import { getNotifications, markNotificationsRead } from '../utils/notificationApi';
import { updateCommunityProject } from '../utils/communityApi';

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
  { id: 'community', label: 'Community', icon: Compass },
  { id: 'recent', label: 'Recent Rooms', icon: Clock3 },
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'shared', label: 'Shared', icon: Share2 },
  { id: 'trash', label: 'Trash', icon: Trash2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

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

const DashboardPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [publishingRoom, setPublishingRoom] = useState(null);
  const [publishForm, setPublishForm] = useState({ description: '', tags: '' });
  const [isPublishing, setIsPublishing] = useState(false);
  const [typedGreeting, setTypedGreeting] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalProjects: 0,
    totalOpens: 0,
    totalActiveUsers: 0,
    lastActiveAt: null,
    mostEditedLanguage: null,
  });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const greetingName = user?.name?.split(' ')[0] || 'Builder';
  const greetingText = `welcome_back --user ${greetingName.toLowerCase()}`;

  const fetchRooms = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setIsLoading(true);
    try {
      const data = await getUserRooms(user.id);
      setRooms(data.rooms || []);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Unable to load your rooms.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user?.id) {
        return;
      }

      try {
        const data = await getRoomAnalytics(user.id);
        setAnalytics(data.analytics || {});
      } catch (error) {
        console.error('Unable to load analytics', error);
      }
    };

    fetchAnalytics();
  }, [user?.id, rooms.length]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) {
        return;
      }

      try {
        const data = await getNotifications();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch (error) {
        console.error('Unable to load notifications', error);
      }
    };

    fetchNotifications();
  }, [user?.id]);

  useEffect(() => {
    if (location.state?.createdRoomId) {
      toast.success('Room created and added to your dashboard.');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    setTypedGreeting('');

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedGreeting(greetingText.slice(0, index));

      if (index >= greetingText.length) {
        window.clearInterval(timer);
      }
    }, 45);

    return () => window.clearInterval(timer);
  }, [greetingText]);

  const filteredRooms = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    let source = [...rooms];

    if (activeSection === 'recent') {
      source = source.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } else if (activeSection === 'favorites') {
      source = source.filter((room) => room.isStarred);
    } else if (activeSection === 'shared') {
      source = source.filter((room) => room.privacy === 'shared');
    } else if (activeSection === 'trash') {
      source = [];
    }

    if (!normalized) {
      return source;
    }

    return source.filter((room) =>
      room.title.toLowerCase().includes(normalized)
      || room.language.toLowerCase().includes(normalized)
      || room.privacy.toLowerCase().includes(normalized)
    );
  }, [activeSection, rooms, searchQuery]);

  const favoriteCount = rooms.filter((room) => room.isStarred).length;
  const sharedCount = rooms.filter((room) => room.privacy === 'shared').length;
  const publishedCount = rooms.filter((room) => room.community?.isPublished).length;

  const openRoom = async (room) => {
    const destination = room.language === 'react' ? `/react-studio/${room.roomId}` : `/editor/${room.roomId}`;
    navigate(destination, {
      state: {
        username: user?.name || 'Anonymous',
        role: 'editor',
        participantId: uuidV4(),
      },
    });
  };

  const openNotificationRoom = (notification) => {
    if (!notification.roomId) {
      return;
    }

    const roomLanguage = notification.metadata?.roomLanguage === 'react' ? 'react' : 'vanilla';
    const destination = roomLanguage === 'react'
      ? `/react-studio/${notification.roomId}`
      : `/editor/${notification.roomId}`;

    setIsNotificationsOpen(false);
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

  const submitRename = async (event) => {
    event.preventDefault();
    if (!editingRoom || !editingTitle.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await handleRoomUpdate(editingRoom.roomId, { title: editingTitle.trim() });
      setEditingRoom(null);
      setEditingTitle('');
      toast.success('Project renamed.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to rename project.');
    } finally {
      setIsSaving(false);
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

  const openPublishModal = (room) => {
    setPublishingRoom(room);
    setPublishForm({
      description: room.community?.description || '',
      tags: (room.community?.tags || []).join(', '),
    });
  };

  const submitPublishUpdate = async (event) => {
    event.preventDefault();

    if (!publishingRoom) {
      return;
    }

    setIsPublishing(true);

    try {
      const data = await updateCommunityProject(publishingRoom.roomId, {
        isPublished: true,
        description: publishForm.description,
        tags: publishForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });

      setRooms((current) => current.map((room) => (
        room.roomId === publishingRoom.roomId ? data.room : room
      )));
      toast.success(data.message || 'Community settings updated.');
      setPublishingRoom(null);
      setPublishForm({ description: '', tags: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update community project.');
    } finally {
      setIsPublishing(false);
    }
  };

  const unpublishProject = async () => {
    if (!publishingRoom) {
      return;
    }

    setIsPublishing(true);
    try {
      const data = await updateCommunityProject(publishingRoom.roomId, {
        isPublished: false,
        description: publishForm.description,
        tags: publishForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });

      setRooms((current) => current.map((room) => (
        room.roomId === publishingRoom.roomId ? data.room : room
      )));
      toast.success(data.message || 'Project unpublished.');
      setPublishingRoom(null);
      setPublishForm({ description: '', tags: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to unpublish project.');
    } finally {
      setIsPublishing(false);
    }
  };

  const roomMetrics = [
    {
      label: 'Active Projects',
      value: analytics.totalProjects || rooms.length,
      tone: 'cyan',
    },
    {
      label: 'Total Opens',
      value: analytics.totalOpens || 0,
      tone: 'purple',
    },
    {
      label: 'Most Edited',
      value: analytics.mostEditedLanguage === 'react' ? 'React' : analytics.mostEditedLanguage === 'vanilla' ? 'Vanilla' : 'N/A',
      tone: 'blue',
    },
  ];

  const toggleNotifications = async () => {
    const nextOpen = !isNotificationsOpen;
    setIsNotificationsOpen(nextOpen);

    if (nextOpen && unreadCount > 0) {
      try {
        await markNotificationsRead();
        setUnreadCount(0);
        setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      } catch (error) {
        console.error('Unable to mark notifications as read', error);
      }
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const submitPasswordUpdate = async (event) => {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirm password must match.');
      return;
    }

    setIsPasswordSaving(true);

    try {
      await updatePasswordRequest({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update password.');
    } finally {
      setIsPasswordSaving(false);
    }
  };

  return (
    <div className="dashboardPage">
      <aside className="dashboardSidebar">
        <div className="dashboardBrand">
          <img src="/logo-dark.png" alt="Kodikos logo" />
          <div>
            <p className="dashboardBrandEyebrow">Workspace OS</p>
            <h2>Kodikos</h2>
          </div>
        </div>

        <nav className="dashboardNav">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const count = item.id === 'favorites'
              ? favoriteCount
              : item.id === 'community'
                ? publishedCount
              : item.id === 'shared'
                ? sharedCount
                : item.id === 'recent'
                  ? rooms.length
                  : undefined;

            return (
              <button
                key={item.id}
                type="button"
                className={`dashboardNavItem ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => {
                  if (item.id === 'community') {
                    navigate('/community');
                    return;
                  }
                  setActiveSection(item.id);
                }}
              >
                <span className="dashboardNavLabel">
                  <Icon size={17} />
                  {item.label}
                </span>
                {typeof count === 'number' ? <span className="dashboardNavCount">{count}</span> : null}
              </button>
            );
          })}
        </nav>

        <div className="dashboardSidebarFoot">
          <div className="dashboardUserCard">
            <div className="dashboardUserAvatar">{user?.name?.[0] || 'K'}</div>
            <div>
              <p>{user?.name || 'Kodikos User'}</p>
              <span>{user?.email}</span>
            </div>
          </div>
          <button type="button" className="dashboardLogout" onClick={() => { logout(); navigate('/signin'); }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <div className="dashboardShell">
        <header className="dashboardTopbar">
          <label className="dashboardSearch">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search rooms, languages, privacy..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <div className="dashboardTopbarActions">
            <button type="button" className="dashboardIconBtn notificationTrigger" onClick={toggleNotifications}>
              <Bell size={18} />
              {unreadCount > 0 ? <span className="notificationBadge">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
            </button>
            <button type="button" className="btn-primary dashboardCreateBtn" onClick={() => navigate('/home')}>
              <Plus size={18} /> Create Room
            </button>
          </div>
        </header>

        {isNotificationsOpen && (
          <div className="notificationPanel">
            <div className="dashboardPanelHead">
              <div>
                <h3>Notifications</h3>
                <span>{notifications.length ? `${notifications.length} updates` : 'No notifications yet'}</span>
              </div>
            </div>

            <div className="notificationList">
              {notifications.length ? notifications.map((notification) => (
                <article key={notification.id} className={`notificationItem ${notification.readAt ? 'read' : 'unread'}`}>
                  <div className="notificationItemTop">
                    <strong>{notification.title}</strong>
                    <span>{formatRelativeTime(notification.createdAt)}</span>
                  </div>
                  <p>{notification.message}</p>
                  {notification.roomTitle ? <small>{notification.roomTitle}</small> : null}
                  {notification.type === 'invite' && notification.roomId ? (
                    <div className="notificationItemActions">
                      <button
                        type="button"
                        className="dashboardMiniBtn notificationActionBtn"
                        onClick={() => openNotificationRoom(notification)}
                      >
                        Join Room
                      </button>
                    </div>
                  ) : null}
                </article>
              )) : (
                <div className="emptyPanelState">You are all caught up.</div>
              )}
            </div>
          </div>
        )}

        <main className="dashboardContent">
          <section className="dashboardHero">
            <div>
              <p className="dashboardEyebrow">Developer Workspace</p>
              <div className="dashboardTerminalGreeting" aria-hidden="true">
                <span className="dashboardTerminalPrompt">$</span>
                <span className="dashboardTerminalText">{typedGreeting}</span>
                <span className="dashboardTerminalCursor" />
              </div>
              <h1>Welcome back, {greetingName}.</h1>
              <p>
                Spin up collaborative rooms, reopen recent sessions, and keep momentum across vanilla web and React projects.
              </p>
              {analytics.lastActiveAt ? (
                <p className="dashboardActivityNote">
                  Last workspace activity {formatRelativeTime(analytics.lastActiveAt)}.
                </p>
              ) : null}
              <div className="dashboardHeroActions">
                <button type="button" className="btn-primary" onClick={() => navigate('/home')}>
                  <Plus size={18} /> New Room
                </button>
                <button type="button" className="btn-outline" onClick={() => setActiveSection('recent')}>
                  <FolderOpen size={18} /> Browse Recent
                </button>
              </div>
            </div>
            <div className="dashboardStatsGrid">
              {roomMetrics.map((metric) => (
                <article key={metric.label} className={`dashboardStatCard ${metric.tone}`}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </article>
              ))}
            </div>
          </section>

          {activeSection === 'settings' ? (
            <section className="dashboardRoomsSection settingsSection">
              <div className="dashboardPanelHead">
                <div>
                  <h3>Settings</h3>
                  <span>Manage your account security.</span>
                </div>
              </div>

              <div className="settingsGrid">
                <article className="settingsCard">
                  <div className="settingsCardHead">
                    <div>
                      <h4>Security</h4>
                      <span>Change your password and keep your account protected.</span>
                    </div>
                  </div>

                  <form className="settingsForm" onSubmit={submitPasswordUpdate}>
                    <label className="dashboardFieldLabel">
                      Current Password
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Current password"
                      />
                    </label>

                    <label className="dashboardFieldLabel">
                      New Password
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="New password"
                      />
                    </label>

                    <label className="dashboardFieldLabel">
                      Confirm New Password
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirm new password"
                      />
                    </label>

                    <button type="submit" className="btn-primary settingsSubmitBtn" disabled={isPasswordSaving}>
                      {isPasswordSaving ? 'Updating Password...' : 'Update Password'}
                    </button>
                  </form>
                </article>
              </div>
            </section>
          ) : (
          <section className="dashboardRoomsSection">
            <div className="dashboardPanelHead">
              <div>
                <h3>Projects</h3>
                <span>{filteredRooms.length} room{filteredRooms.length === 1 ? '' : 's'} in view</span>
              </div>
              <button type="button" className="btn-outline" onClick={fetchRooms}>
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="roomGrid">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="roomCard skeletonCard" />
                ))}
              </div>
            ) : filteredRooms.length ? (
              <div className="roomGrid">
                {filteredRooms.map((room) => (
                  <article key={room.roomId} className="roomCard">
                    <div className="roomCardGlow" />
                    <div className="roomCardHeader">
                      <div>
                        <span className={`roomLanguagePill ${room.language}`}>{room.language === 'react' ? 'React Studio' : 'Vanilla Web'}</span>
                        <h4>{room.title}</h4>
                      </div>
                      <button type="button" className="roomMenuBtn" onClick={() => setEditingRoom(room) || setEditingTitle(room.title)}>
                        <MoreHorizontal size={18} />
                      </button>
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
                      <button type="button" className="dashboardMiniBtn" onClick={() => openPublishModal(room)}>
                        <UploadCloud size={16} /> {room.community?.isPublished ? 'Update Publish' : 'Publish'}
                      </button>
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
              <div className="emptyDashboardState">
                <Code2 size={28} />
                <h4>No rooms match this view yet.</h4>
                <p>Create a project or change filters to surface your collaborative workspaces.</p>
                <button type="button" className="btn-primary" onClick={() => navigate('/home')}>
                  <Plus size={18} /> Create your first room
                </button>
              </div>
            )}
          </section>
          )}
        </main>
      </div>

      {editingRoom && <div className="dashboardModalBackdrop" onClick={() => setEditingRoom(null)} />}
      {publishingRoom && <div className="dashboardModalBackdrop" onClick={() => setPublishingRoom(null)} />}

      {editingRoom && (
        <div className="dashboardModal renameModal">
          <div className="dashboardModalHead">
            <div>
              <p className="dashboardEyebrow">Project</p>
              <h3>Rename Room</h3>
            </div>
            <button type="button" className="dashboardIconBtn" onClick={() => setEditingRoom(null)}>×</button>
          </div>
          <form className="dashboardModalForm" onSubmit={submitRename}>
            <label>
              New Title
              <input
                type="text"
                value={editingTitle}
                onChange={(event) => setEditingTitle(event.target.value)}
                placeholder="Refine project name"
              />
            </label>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              <PencilLine size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {publishingRoom && (
        <div className="dashboardModal publishModal">
          <div className="dashboardModalHead">
            <div>
              <p className="dashboardEyebrow">Community</p>
              <h3>{publishingRoom.community?.isPublished ? 'Update Published Project' : 'Publish Project'}</h3>
            </div>
            <button type="button" className="dashboardIconBtn" onClick={() => setPublishingRoom(null)}>×</button>
          </div>

          <form className="dashboardModalForm" onSubmit={submitPublishUpdate}>
            <label>
              Description
              <textarea
                className="dashboardModalTextarea"
                value={publishForm.description}
                onChange={(event) => setPublishForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Tell the community what makes this project interesting."
                rows={4}
              />
            </label>

            <label>
              Tags
              <input
                type="text"
                value={publishForm.tags}
                onChange={(event) => setPublishForm((current) => ({ ...current, tags: event.target.value }))}
                placeholder="portfolio, animation, ui"
              />
            </label>

            <button type="submit" className="btn-primary" disabled={isPublishing}>
              <UploadCloud size={16} /> {isPublishing
                ? 'Saving...'
                : publishingRoom.community?.isPublished
                  ? 'Save Community Details'
                  : 'Publish To Community'}
            </button>
            {publishingRoom.community?.isPublished ? (
              <button type="button" className="btn-outline dashboardDangerOutline" onClick={unpublishProject} disabled={isPublishing}>
                Unpublish
              </button>
            ) : null}
          </form>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
