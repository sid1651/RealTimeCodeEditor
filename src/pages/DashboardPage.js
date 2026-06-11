import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, ChevronUp, Clock3, Code2, Compass, FolderOpen, MoreHorizontal, Plus, Search, Settings, Share2, Sparkles, Star, Trash2, LogOut, PencilLine, UploadCloud } from 'lucide-react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { deleteRoom as deleteRoomRequest, getUserRooms, updateRoom } from '../utils/roomApi';
import { completeOnboarding, updatePassword as updatePasswordRequest } from '../utils/accountApi';
import { getRoomAnalytics } from '../utils/analyticsApi';
import { getNotifications, markNotificationActionCompleted, markNotificationsRead } from '../utils/notificationApi';
import { updateCommunityProject } from '../utils/communityApi';
import { getRoomLanguageLabel, getRoomRoute } from '../utils/roomLanguage';

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Sparkles, path: '/dashboard' },
  { id: 'community', label: 'Community', icon: Compass, path: '/community' },
  { id: 'recent', label: 'Recent Rooms', icon: Clock3, path: '/recent-rooms' },
  { id: 'favorites', label: 'Favorites', icon: Star, path: '/favorites' },
  { id: 'shared', label: 'Shared', icon: Share2, path: '/shared' },
  { id: 'trash', label: 'Trash', icon: Trash2, path: '/trash' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

const ROOMS_PER_PAGE = 3;
const NOTIFICATIONS_PER_PAGE = 5;
const ONBOARDING_STEPS = [
  {
    id: 'sidebar',
    targetId: 'sidebar',
    title: 'Use the sidebar to move around',
    description: 'Dashboard, community, favorites, shared rooms, and settings all live here for quick navigation.',
  },
  {
    id: 'hero',
    targetId: 'hero',
    title: 'This is your workspace overview',
    description: 'The hero section gives you a quick read on your workspace and shortcuts to create or reopen projects.',
  },
  {
    id: 'create',
    targetId: 'create',
    title: 'Create a room from here',
    description: 'Start a new collaborative room anytime with this button. That is usually the fastest way to begin.',
  },
  {
    id: 'projects',
    targetId: 'projects',
    title: 'Your projects show up here',
    description: 'Every room you create or reopen appears in this section, along with room actions like publish, star, and open.',
  },
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

const getOnboardingCardStyle = (targetRect) => {
  const cardWidth = Math.min(360, window.innerWidth - 32);

  if (!targetRect) {
    return {
      top: Math.max(24, window.innerHeight / 2 - 140),
      left: Math.max(16, (window.innerWidth - cardWidth) / 2),
      width: cardWidth,
    };
  }

  const spacing = 18;
  const preferredTop = targetRect.bottom + spacing;
  const fallbackTop = targetRect.top - 220;
  const top = preferredTop + 220 < window.innerHeight
    ? preferredTop
    : Math.max(24, fallbackTop);
  const left = Math.min(
    Math.max(16, targetRect.left),
    Math.max(16, window.innerWidth - cardWidth - 16),
  );

  return {
    top,
    left,
    width: cardWidth,
  };
};

const DashboardPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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
  const notificationPopoverRef = useRef(null);
  const [visibleNotificationCount, setVisibleNotificationCount] = useState(NOTIFICATIONS_PER_PAGE);
  const [roomPage, setRoomPage] = useState(0);
  const [roomPageDirection, setRoomPageDirection] = useState('down');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);
  const [onboardingTargetRect, setOnboardingTargetRect] = useState(null);

  const greetingName = user?.name?.split(' ')[0] || 'Builder';
  const greetingText = `welcome_back --user ${greetingName.toLowerCase()}`;
  const currentSection = useMemo(() => {
    switch (location.pathname) {
      case '/':
      case '/dashboard':
        return 'dashboard';
      case '/recent-rooms':
        return 'recent';
      case '/favorites':
        return 'favorites';
      case '/shared':
        return 'shared';
      case '/trash':
        return 'trash';
      case '/settings':
        return 'settings';
      default:
        return 'dashboard';
    }
  }, [location.pathname]);

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
    if (!isNotificationsOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!notificationPopoverRef.current?.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    setVisibleNotificationCount(NOTIFICATIONS_PER_PAGE);
  }, [notifications.length, isNotificationsOpen]);

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

  useEffect(() => {
    if (user?.hasCompletedOnboarding === false && currentSection !== 'dashboard') {
      navigate('/dashboard', { replace: true });
    }
  }, [currentSection, navigate, user?.hasCompletedOnboarding]);

  useEffect(() => {
    if (user?.hasCompletedOnboarding === false && currentSection === 'dashboard') {
      setIsOnboardingOpen(true);
      setOnboardingStepIndex(0);
      return;
    }

    setIsOnboardingOpen(false);
  }, [currentSection, user?.hasCompletedOnboarding]);

  const filteredRooms = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    let source = [...rooms];

    if (currentSection === 'recent') {
      source = source.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } else if (currentSection === 'favorites') {
      source = source.filter((room) => room.isStarred);
    } else if (currentSection === 'shared') {
      source = source.filter((room) => room.privacy === 'shared');
    } else if (currentSection === 'trash') {
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
  }, [currentSection, rooms, searchQuery]);

  const favoriteCount = rooms.filter((room) => room.isStarred).length;
  const sharedCount = rooms.filter((room) => room.privacy === 'shared').length;
  const publishedCount = rooms.filter((room) => room.community?.isPublished).length;
  const visibleNotifications = notifications.slice(0, visibleNotificationCount);
  const hasMoreNotifications = notifications.length > visibleNotificationCount;
  const totalRoomPages = Math.max(1, Math.ceil(filteredRooms.length / ROOMS_PER_PAGE));
  const hasRoomCarousel = filteredRooms.length > ROOMS_PER_PAGE;
  const visibleRooms = hasRoomCarousel
    ? filteredRooms.slice(roomPage * ROOMS_PER_PAGE, (roomPage + 1) * ROOMS_PER_PAGE)
    : filteredRooms;
  const currentOnboardingStep = ONBOARDING_STEPS[onboardingStepIndex];
  const onboardingCardStyle = useMemo(
    () => getOnboardingCardStyle(onboardingTargetRect),
    [onboardingTargetRect],
  );

  useEffect(() => {
    setRoomPage((current) => Math.min(current, totalRoomPages - 1));
  }, [totalRoomPages]);

  useEffect(() => {
    if (!isOnboardingOpen || !currentOnboardingStep) {
      setOnboardingTargetRect(null);
      return undefined;
    }

    const updateSpotlight = () => {
      const target = document.querySelector(`[data-tour-id="${currentOnboardingStep.targetId}"]`);

      if (!target) {
        setOnboardingTargetRect(null);
        return;
      }

      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const rect = target.getBoundingClientRect();
      setOnboardingTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      });
    };

    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);

    return () => {
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [currentOnboardingStep, isOnboardingOpen, rooms.length]);

  const finishOnboarding = useCallback(async () => {
    if (isCompletingOnboarding) {
      return;
    }

    setIsCompletingOnboarding(true);
    try {
      const data = await completeOnboarding();
      updateUser(data.user);
      setIsOnboardingOpen(false);
      toast.success('You are all set. Enjoy building in Kodikos.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save onboarding progress.');
    } finally {
      setIsCompletingOnboarding(false);
    }
  }, [isCompletingOnboarding, updateUser]);

  const goToNextOnboardingStep = () => {
    if (onboardingStepIndex >= ONBOARDING_STEPS.length - 1) {
      finishOnboarding();
      return;
    }

    setOnboardingStepIndex((current) => current + 1);
  };

  const goToPreviousOnboardingStep = () => {
    setOnboardingStepIndex((current) => Math.max(0, current - 1));
  };

  const showPreviousRoomPage = () => {
    setRoomPageDirection('up');
    setRoomPage((current) => Math.max(0, current - 1));
  };

  const showNextRoomPage = () => {
    setRoomPageDirection('down');
    setRoomPage((current) => Math.min(totalRoomPages - 1, current + 1));
  };

  const openRoom = async (room) => {
    const destination = getRoomRoute(room.language, room.roomId);
    navigate(destination, {
      state: {
        username: user?.name || 'Anonymous',
        role: 'editor',
        participantId: uuidV4(),
      },
    });
  };

  const openNotificationRoom = async (notification) => {
    if (!notification.roomId) {
      return;
    }

    try {
      const data = await markNotificationActionCompleted(notification.id);
      if (data.notification) {
        setNotifications((current) => current.map((item) => (
          item.id === notification.id ? data.notification : item
        )));
      }
    } catch (error) {
      console.error('Unable to mark notification action as completed', error);
    }

    const roomLanguage = notification.metadata?.roomLanguage || 'vanilla';
    const destination = getRoomRoute(roomLanguage, notification.roomId);

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

  const sectionMeta = useMemo(() => {
    switch (currentSection) {
      case 'recent':
        return {
          title: 'Recent Rooms',
          subtitle: `${filteredRooms.length} recently active room${filteredRooms.length === 1 ? '' : 's'}`,
          emptyTitle: 'No recent rooms yet.',
          emptyDescription: 'Open a room and it will appear here for quick access.',
        };
      case 'favorites':
        return {
          title: 'Favorites',
          subtitle: `${filteredRooms.length} starred room${filteredRooms.length === 1 ? '' : 's'}`,
          emptyTitle: 'No favorites yet.',
          emptyDescription: 'Star projects from your dashboard to keep them close.',
        };
      case 'shared':
        return {
          title: 'Shared Rooms',
          subtitle: `${filteredRooms.length} shared room${filteredRooms.length === 1 ? '' : 's'}`,
          emptyTitle: 'No shared rooms yet.',
          emptyDescription: 'Invite collaborators to a room and it will show up here.',
        };
      case 'trash':
        return {
          title: 'Trash',
          subtitle: 'Deleted rooms will appear here when trash support is added.',
          emptyTitle: 'Trash is empty.',
          emptyDescription: 'There are no deleted rooms to review right now.',
        };
      default:
        return {
          title: 'Projects',
          subtitle: `${filteredRooms.length} room${filteredRooms.length === 1 ? '' : 's'} in view`,
          emptyTitle: 'No rooms match this view yet.',
          emptyDescription: 'Create a project or change filters to surface your collaborative workspaces.',
        };
    }
  }, [currentSection, filteredRooms.length]);

  return (
    <div className="dashboardPage">
      <aside className="dashboardSidebar" data-tour-id="sidebar">
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
                className={`dashboardNavItem ${currentSection === item.id ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
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
            <div className="notificationPopover" ref={notificationPopoverRef}>
              <button type="button" className="dashboardIconBtn notificationTrigger" onClick={toggleNotifications}>
                <Bell size={18} />
                {unreadCount > 0 ? <span className="notificationBadge">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
              </button>

              {isNotificationsOpen && (
                <div className="notificationPanel">
                  <div className="dashboardPanelHead">
                    <div>
                      <h3>Notifications</h3>
                      <span>{notifications.length ? `${notifications.length} updates` : 'No notifications yet'}</span>
                    </div>
                  </div>

                  <div className="notificationList">
                    {notifications.length ? visibleNotifications.map((notification) => (
                      <article key={notification.id} className={`notificationItem ${notification.readAt ? 'read' : 'unread'}`}>
                        <div className="notificationItemTop">
                          <strong>{notification.title}</strong>
                          <span>{formatRelativeTime(notification.createdAt)}</span>
                        </div>
                        <p>{notification.message}</p>
                        {notification.roomTitle ? <small>{notification.roomTitle}</small> : null}
                        {notification.type === 'invite' && notification.roomId && !notification.actionCompletedAt ? (
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

                  {hasMoreNotifications ? (
                    <button
                      type="button"
                      className="btn-outline notificationShowMoreBtn"
                      onClick={() => setVisibleNotificationCount((current) => current + NOTIFICATIONS_PER_PAGE)}
                    >
                      Show More
                    </button>
                  ) : null}
                </div>
              )}
            </div>
            <button type="button" className="btn-primary dashboardCreateBtn" onClick={() => navigate('/home')} data-tour-id="create">
              <Plus size={18} /> Create Room
            </button>
          </div>
        </header>

        <main className="dashboardContent">
          <section className="dashboardHero" data-tour-id="hero">
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
                <button type="button" className="btn-outline" onClick={() => navigate('/recent-rooms')}>
                  <FolderOpen size={18} /> Browse Recent
                </button>
              </div>
            </div>
          </section>

          {currentSection === 'settings' ? (
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
          <section className="dashboardRoomsSection" data-tour-id="projects">
            <div className="dashboardPanelHead">
              <div>
                <h3>{sectionMeta.title}</h3>
                <span>{sectionMeta.subtitle}</span>
              </div>
              <div className="dashboardPanelActions">
                {hasRoomCarousel ? (
                  <div className="roomCarouselControls" aria-label="Project rows navigation">
                    <button
                      type="button"
                      className="dashboardIconBtn roomCarouselBtn"
                      onClick={showPreviousRoomPage}
                      disabled={roomPage === 0}
                      aria-label="Show previous project row"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <span className="roomCarouselStatus">{roomPage + 1}/{totalRoomPages}</span>
                    <button
                      type="button"
                      className="dashboardIconBtn roomCarouselBtn"
                      onClick={showNextRoomPage}
                      disabled={roomPage >= totalRoomPages - 1}
                      aria-label="Show next project row"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                ) : null}
                <button type="button" className="btn-outline" onClick={fetchRooms}>
                  Refresh
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="roomGrid">
                {Array.from({ length: ROOMS_PER_PAGE }).map((_, index) => (
                  <div key={index} className="roomCard skeletonCard" />
                ))}
              </div>
            ) : filteredRooms.length ? (
              <div
                key={`room-page-${roomPage}`}
                className={`roomGrid roomGridCarousel roomGridCarousel-${roomPageDirection}`}
              >
                {visibleRooms.map((room) => (
                  <article key={room.roomId} className="roomCard">
                    <div className="roomCardGlow" />
                    <div className="roomCardHeader">
                      <div>
                        <span className={`roomLanguagePill ${room.language}`}>{getRoomLanguageLabel(room.language)}</span>
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
                <h4>{sectionMeta.emptyTitle}</h4>
                <p>{sectionMeta.emptyDescription}</p>
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

      {isOnboardingOpen && currentOnboardingStep ? (
        <div className="onboardingOverlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
          <div className="onboardingBackdrop" />
          {onboardingTargetRect ? (
            <div
              className="onboardingSpotlight"
              style={{
                top: Math.max(8, onboardingTargetRect.top - 8),
                left: Math.max(8, onboardingTargetRect.left - 8),
                width: onboardingTargetRect.width + 16,
                height: onboardingTargetRect.height + 16,
              }}
            />
          ) : null}
          <div className="onboardingCard" style={onboardingCardStyle}>
            <div className="onboardingStepLabel">
              Step {onboardingStepIndex + 1} of {ONBOARDING_STEPS.length}
            </div>
            <h3 id="onboarding-title">{currentOnboardingStep.title}</h3>
            <p>{currentOnboardingStep.description}</p>
            <div className="onboardingActions">
              <button type="button" className="btn-outline" onClick={finishOnboarding} disabled={isCompletingOnboarding}>
                Skip Tour
              </button>
              <div className="onboardingPrimaryActions">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={goToPreviousOnboardingStep}
                  disabled={onboardingStepIndex === 0 || isCompletingOnboarding}
                >
                  Back
                </button>
                <button type="button" className="btn-primary" onClick={goToNextOnboardingStep} disabled={isCompletingOnboarding}>
                  {onboardingStepIndex === ONBOARDING_STEPS.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DashboardPage;
