const { v4: uuidV4 } = require('uuid');
const Room = require('../models/Room');
const User = require('../models/User');
const { createNotification, createNotifications } = require('../utils/notificationService');

const roomTemplates = {
  blank: {
    vanilla: {
      javascript: '',
      html: '',
      css: '',
    },
    react: {
      react: `function App() {\n  return (\n    <div className="app-shell">\n      <h1>Hello from Kodikos</h1>\n      <p>Start building your React experience here.</p>\n    </div>\n  );\n}`,
      reactCss: `.app-shell {\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: linear-gradient(160deg, #07111f 0%, #111827 52%, #030712 100%);\n  color: #e5eefc;\n  font-family: Inter, system-ui, sans-serif;\n}`,
    },
  },
  playground: {
    vanilla: {
      javascript: `const app = document.getElementById('app');\napp.innerHTML = '<h2>Kodikos Playground</h2><p>Edit HTML, CSS, and JS together.</p>';`,
      html: `<div id="app"></div>`,
      css: `body {\n  font-family: Inter, system-ui, sans-serif;\n  background: #0f172a;\n  color: #e2e8f0;\n  padding: 32px;\n}`,
    },
    react: {
      react: `function App() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <main className="app-shell">\n      <section className="card">\n        <h1>React Playground</h1>\n        <p>Craft shared interfaces with your team.</p>\n        <button onClick={() => setCount((value) => value + 1)}>\n          Count: {count}\n        </button>\n      </section>\n    </main>\n  );\n}`,
      reactCss: `.app-shell {\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: radial-gradient(circle at top, rgba(34, 211, 238, 0.18), transparent 24%), linear-gradient(160deg, #07111f 0%, #111827 52%, #030712 100%);\n  color: #e5eefc;\n  font-family: Inter, system-ui, sans-serif;\n}\n\n.card {\n  width: min(520px, 100%);\n  padding: 32px;\n  border-radius: 24px;\n  background: rgba(15, 23, 42, 0.82);\n  border: 1px solid rgba(148, 163, 184, 0.22);\n}\n\nbutton {\n  border: none;\n  border-radius: 999px;\n  padding: 12px 18px;\n  background: linear-gradient(135deg, #22d3ee, #6366f1);\n  color: white;\n  font-weight: 700;\n  cursor: pointer;\n}`,
    },
  },
};

const formatRoom = (room) => ({
  id: room._id,
  roomId: room.roomId,
  title: room.title,
  owner: room.owner,
  collaborators: room.collaborators,
  language: room.language,
  code: room.code,
  template: room.template,
  thumbnail: room.thumbnail,
  isStarred: room.isStarred,
  privacy: room.privacy,
  activeUsers: room.activeUsers,
  openCount: room.openCount,
  editCount: room.editCount,
  lastOpenedAt: room.lastOpenedAt,
  community: {
    isPublished: Boolean(room.community?.isPublished),
    description: room.community?.description || '',
    tags: room.community?.tags || [],
    publishedAt: room.community?.publishedAt || null,
    viewCount: room.community?.viewCount || 0,
    likeCount: room.community?.likedBy?.length || 0,
    likedBy: room.community?.likedBy || [],
  },
  createdAt: room.createdAt,
  updatedAt: room.updatedAt,
});

const formatCommunityRoom = (room, currentUserId = null) => ({
  ...formatRoom(room),
  ownerProfile: {
    id: room.owner?._id || room.owner,
    name: room.owner?.name || room.collaborators?.[0]?.name || 'Kodikos Creator',
    email: room.owner?.email || '',
  },
  community: {
    isPublished: Boolean(room.community?.isPublished),
    description: room.community?.description || '',
    tags: room.community?.tags || [],
    publishedAt: room.community?.publishedAt || null,
    viewCount: room.community?.viewCount || 0,
    likeCount: room.community?.likedBy?.length || 0,
    isLikedByViewer: currentUserId
      ? room.community?.likedBy?.some((userId) => userId.toString() === currentUserId.toString())
      : false,
  },
  communityComments: [...(room.communityComments || [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((comment) => ({
      commentId: comment.commentId,
      user: comment.user,
      authorName: comment.authorName,
      authorEmail: comment.authorEmail,
      kind: comment.kind,
      body: comment.body,
      createdAt: comment.createdAt,
    })),
});

const formatSnapshot = (snapshot, room) => ({
  snapshotId: snapshot.snapshotId,
  roomId: room.roomId,
  message: snapshot.message,
  authorName: snapshot.authorName,
  authorUser: snapshot.authorUser,
  createdAt: snapshot.createdAt,
  code: snapshot.code,
});

const getTemplateCode = (language, template) => {
  const safeTemplate = roomTemplates[template] ? template : 'blank';
  return roomTemplates[safeTemplate][language] || roomTemplates.blank[language];
};

const getRequestUserId = (req) => req.user?.id?.toString?.() || req.user?._id?.toString?.() || null;

const isRoomOwner = (room, userId) => room.owner.toString() === userId.toString();

const isRoomCollaborator = (room, userId) => room.collaborators.some(
  (collaborator) => collaborator.user?.toString() === userId.toString()
);

const canAccessRoom = (room, userId) => (
  isRoomOwner(room, userId)
  || room.privacy === 'shared'
  || isRoomCollaborator(room, userId)
);

const resolveRoomAccess = (room, req) => {
  const requestUserId = getRequestUserId(req);
  const isAnonymousSharedEditor = !requestUserId && room.privacy === 'shared';
  const userIsOwner = requestUserId ? isRoomOwner(room, requestUserId) : false;
  const userCanAccess = requestUserId ? canAccessRoom(room, requestUserId) : isAnonymousSharedEditor;

  return {
    requestUserId,
    isAnonymousSharedEditor,
    userIsOwner,
    userCanAccess,
  };
};

const createRoom = async (req, res) => {
  try {
    const {
      title,
      language = 'vanilla',
      privacy = 'private',
      template = 'blank',
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: 'Room title is required.' });
    }

    const room = await Room.create({
      roomId: uuidV4(),
      title: title.trim(),
      owner: req.user._id,
      collaborators: [{
        user: req.user._id,
        name: req.user.name,
        email: req.user.email,
      }],
      language,
      privacy,
      template,
      code: getTemplateCode(language, template),
    });

    return res.status(201).json({
      message: 'Room created successfully.',
      room: formatRoom(room),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create room.', details: error.message });
  }
};

const getUserRooms = async (req, res) => {
  try {
    if (req.params.userId !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You are not allowed to access these rooms.' });
    }

    const rooms = await Room.find({
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id },
      ],
    }).sort({ updatedAt: -1 });

    return res.status(200).json({
      rooms: rooms.map(formatRoom),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch rooms.', details: error.message });
  }
};

const getUserRoomAnalytics = async (req, res) => {
  try {
    if (req.params.userId !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You are not allowed to access these analytics.' });
    }

    const rooms = await Room.find({
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id },
      ],
    });

    const analytics = rooms.reduce((result, room) => {
      result.totalProjects += 1;
      result.totalOpens += room.openCount || 0;
      result.totalActiveUsers += room.activeUsers || 0;

      if (!result.lastActiveAt || new Date(room.lastOpenedAt) > new Date(result.lastActiveAt)) {
        result.lastActiveAt = room.lastOpenedAt;
      }

      result.languageEdits[room.language] = (result.languageEdits[room.language] || 0) + (room.editCount || 0);
      return result;
    }, {
      totalProjects: 0,
      totalOpens: 0,
      totalActiveUsers: 0,
      lastActiveAt: null,
      languageEdits: {
        vanilla: 0,
        react: 0,
      },
    });

    const mostEditedLanguage = analytics.languageEdits.react > analytics.languageEdits.vanilla
      ? 'react'
      : analytics.languageEdits.vanilla > 0
        ? 'vanilla'
        : null;

    return res.status(200).json({
      analytics: {
        totalProjects: analytics.totalProjects,
        totalOpens: analytics.totalOpens,
        totalActiveUsers: analytics.totalActiveUsers,
        lastActiveAt: analytics.lastActiveAt,
        mostEditedLanguage,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch room analytics.', details: error.message });
  }
};

const getRoomById = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    const requestUserId = getRequestUserId(req);
    const hasAccess = requestUserId
      ? canAccessRoom(room, requestUserId)
      : room.privacy === 'shared';

    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this room.' });
    }

    const alreadyCollaborating = requestUserId ? isRoomCollaborator(room, requestUserId) : false;
    if (requestUserId && !alreadyCollaborating) {
      room.collaborators.push({
        user: req.user._id,
        name: req.user.name,
        email: req.user.email,
      });

      await createNotification({
        recipientUser: req.user._id,
        actorUser: room.owner,
        actorName: 'Workspace Access',
        roomId: room.roomId,
        roomTitle: room.title,
        type: 'invite',
        title: 'Workspace access granted',
        message: `You can now collaborate in ${room.title}.`,
      });
    }

    room.openCount += 1;
    room.lastOpenedAt = new Date();
    await room.save();

    return res.status(200).json({
      room: formatRoom(room),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch room.', details: error.message });
  }
};

const updateRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    const { requestUserId, userIsOwner, userCanAccess } = resolveRoomAccess(room, req);

    if (!userCanAccess) {
      return res.status(403).json({ message: 'You do not have access to update this room.' });
    }

    const {
      title,
      language,
      code,
      thumbnail,
      isStarred,
      privacy,
      activeUsers,
      lastOpenedAt,
      template,
    } = req.body;

    const isCodeOnlyUpdate = (
      typeof code === 'object'
      && code !== null
      && Object.keys(req.body).every((key) => ['code', 'lastOpenedAt', 'activeUsers'].includes(key))
    );

    if (!userIsOwner && !isCodeOnlyUpdate) {
      return res.status(403).json({
        message: 'Only the room owner can update room settings. Collaborators can only save code and activity.',
      });
    }

    if (typeof title === 'string' && title.trim()) {
      room.title = title.trim();
    }
    if (language === 'vanilla' || language === 'react') {
      room.language = language;
    }
    if (typeof thumbnail === 'string') {
      room.thumbnail = thumbnail;
    }
    if (typeof isStarred === 'boolean') {
      room.isStarred = isStarred;
    }
    if (privacy === 'private' || privacy === 'shared') {
      room.privacy = privacy;
    }
    if (typeof activeUsers === 'number') {
      room.activeUsers = activeUsers;
    }
    if (lastOpenedAt) {
      room.lastOpenedAt = new Date(lastOpenedAt);
    }
    if (typeof template === 'string' && template.trim()) {
      room.template = template.trim();
    }
    if (code && typeof code === 'object') {
      room.code = {
        ...room.code,
        ...code,
      };
      room.editCount += 1;
    }

    await room.save();

    return res.status(200).json({
      message: 'Room updated successfully.',
      room: formatRoom(room),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update room.', details: error.message });
  }
};

const updateRoomCommunity = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    if (room.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Only the room owner can publish this room.' });
    }

    const {
      isPublished,
      description = '',
      tags = [],
    } = req.body || {};

    const normalizedTags = Array.isArray(tags)
      ? [...new Set(tags.map((tag) => `${tag}`.trim().toLowerCase()).filter(Boolean))].slice(0, 6)
      : [];

    if (!room.community) {
      room.community = {
        isPublished: false,
        description: '',
        tags: [],
        publishedAt: null,
        viewCount: 0,
        likedBy: [],
      };
    }

    if (typeof isPublished === 'boolean') {
      room.community.isPublished = isPublished;
      room.community.publishedAt = isPublished
        ? room.community.publishedAt || new Date()
        : null;
    }

    room.community.description = typeof description === 'string' ? description.trim() : room.community.description;
    room.community.tags = normalizedTags;

    if (room.community.isPublished) {
      room.privacy = 'shared';
    }

    await room.save();

    return res.status(200).json({
      message: room.community.isPublished
        ? 'Project published to the community.'
        : 'Project removed from the community.',
      room: formatRoom(room),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update community settings.', details: error.message });
  }
};

const getCommunityRooms = async (req, res) => {
  try {
    const query = `${req.query.q || ''}`.trim();
    const filter = {
      'community.isPublished': true,
    };

    if (query) {
      const regex = new RegExp(query, 'i');
      filter.$or = [
        { title: regex },
        { 'community.description': regex },
        { 'community.tags': regex },
      ];
    }

    const rooms = await Room.find(filter)
      .populate('owner', 'name email')
      .sort({ 'community.publishedAt': -1, updatedAt: -1 })
      .limit(48);

    const currentUserId = getRequestUserId(req);

    return res.status(200).json({
      projects: rooms.map((room) => formatCommunityRoom(room, currentUserId)),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch community projects.', details: error.message });
  }
};

const getCommunityRoomDetail = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId, 'community.isPublished': true })
      .populate('owner', 'name email');

    if (!room) {
      return res.status(404).json({ message: 'Published project not found.' });
    }

    room.community.viewCount = (room.community?.viewCount || 0) + 1;
    await room.save();

    return res.status(200).json({
      project: formatCommunityRoom(room, getRequestUserId(req)),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch community project.', details: error.message });
  }
};

const trackCommunityView = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId, 'community.isPublished': true })
      .populate('owner', 'name email');

    if (!room) {
      return res.status(404).json({ message: 'Published project not found.' });
    }

    room.community.viewCount = (room.community?.viewCount || 0) + 1;
    await room.save();

    return res.status(200).json({
      message: 'Project view tracked.',
      project: formatCommunityRoom(room, getRequestUserId(req)),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to track project view.', details: error.message });
  }
};

const addCommunityComment = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId, 'community.isPublished': true })
      .populate('owner', 'name email');

    if (!room) {
      return res.status(404).json({ message: 'Published project not found.' });
    }

    const body = req.body?.body?.trim();
    const kind = req.body?.kind === 'question' ? 'question' : 'comment';

    if (!body) {
      return res.status(400).json({ message: 'Write a comment before posting.' });
    }

    room.communityComments.push({
      commentId: uuidV4(),
      user: req.user._id,
      authorName: req.user.name,
      authorEmail: req.user.email,
      kind,
      body,
    });

    await room.save();

    return res.status(201).json({
      message: kind === 'question' ? 'Question posted.' : 'Comment posted.',
      project: formatCommunityRoom(room, req.user._id),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to post comment.', details: error.message });
  }
};

const remixCommunityProject = async (req, res) => {
  try {
    const sourceRoom = await Room.findOne({ roomId: req.params.roomId, 'community.isPublished': true });

    if (!sourceRoom) {
      return res.status(404).json({ message: 'Published project not found.' });
    }

    const clonedTitle = `${sourceRoom.title} Remix`;
    const clonedCode = {
      javascript: sourceRoom.code?.javascript || '',
      html: sourceRoom.code?.html || '',
      css: sourceRoom.code?.css || '',
      react: sourceRoom.code?.react || '',
      reactCss: sourceRoom.code?.reactCss || '',
    };

    const remixedRoom = await Room.create({
      roomId: uuidV4(),
      title: clonedTitle,
      owner: req.user._id,
      collaborators: [{
        user: req.user._id,
        name: req.user.name,
        email: req.user.email,
      }],
      language: sourceRoom.language,
      privacy: 'private',
      template: sourceRoom.template,
      code: clonedCode,
      thumbnail: sourceRoom.thumbnail || '',
      snapshots: [],
      community: {
        isPublished: false,
        description: '',
        tags: [],
        publishedAt: null,
        viewCount: 0,
        likedBy: [],
      },
      communityComments: [],
    });

    return res.status(201).json({
      message: 'Remix created successfully.',
      room: formatRoom(remixedRoom),
      sourceRoomId: sourceRoom.roomId,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to remix project.', details: error.message });
  }
};

const toggleCommunityLike = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId, 'community.isPublished': true })
      .populate('owner', 'name email');

    if (!room) {
      return res.status(404).json({ message: 'Published project not found.' });
    }

    if (!Array.isArray(room.community?.likedBy)) {
      room.community.likedBy = [];
    }

    const existingIndex = room.community.likedBy.findIndex(
      (userId) => userId.toString() === req.user._id.toString()
    );

    let isLikedByViewer = false;

    if (existingIndex >= 0) {
      room.community.likedBy.splice(existingIndex, 1);
    } else {
      room.community.likedBy.push(req.user._id);
      isLikedByViewer = true;
    }

    await room.save();

    return res.status(200).json({
      message: isLikedByViewer ? 'Project liked.' : 'Project unliked.',
      project: formatCommunityRoom(room, req.user._id),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update project like.', details: error.message });
  }
};

const inviteUserToRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    const { userCanAccess } = resolveRoomAccess(room, req);

    if (!userCanAccess) {
      return res.status(403).json({ message: 'You do not have access to invite people to this room.' });
    }

    const email = req.body?.email?.trim()?.toLowerCase();

    if (!email) {
      return res.status(400).json({ message: 'Invite email is required.' });
    }

    if (req.user.email?.toLowerCase?.() === email) {
      return res.status(400).json({ message: 'You are already in this room.' });
    }

    const invitedUser = await User.findOne({ email }).select('-password');

    if (!invitedUser) {
      return res.status(404).json({ message: 'No account found for that email address.' });
    }

    const alreadyHasAccess = isRoomOwner(room, invitedUser._id) || isRoomCollaborator(room, invitedUser._id);

    if (!alreadyHasAccess) {
      room.collaborators.push({
        user: invitedUser._id,
        name: invitedUser.name,
        email: invitedUser.email,
      });
      await room.save();
    }

    await createNotification({
      recipientUser: invitedUser._id,
      actorUser: req.user._id,
      actorName: req.user.name,
      roomId: room.roomId,
      roomTitle: room.title,
      type: 'invite',
      title: alreadyHasAccess ? 'Room reminder' : 'Room invitation',
      message: alreadyHasAccess
        ? `${req.user.name} shared ${room.title} with you again.`
        : `${req.user.name} invited you to join ${room.title}.`,
      metadata: {
        invitedEmail: invitedUser.email,
        roomLanguage: room.language,
      },
    });

    return res.status(200).json({
      message: alreadyHasAccess
        ? 'Invite reminder sent successfully.'
        : 'Invite sent successfully.',
      alreadyHasAccess,
      invitedUser: {
        id: invitedUser._id,
        name: invitedUser.name,
        email: invitedUser.email,
      },
      room: formatRoom(room),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to send room invite.', details: error.message });
  }
};

const listRoomSnapshots = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    const { userCanAccess } = resolveRoomAccess(room, req);

    if (!userCanAccess) {
      return res.status(403).json({ message: 'You do not have access to this room history.' });
    }

    const snapshots = [...room.snapshots]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((snapshot) => formatSnapshot(snapshot, room));

    return res.status(200).json({
      snapshots,
      headSnapshotId: snapshots[0]?.snapshotId || null,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch room history.', details: error.message });
  }
};

const createRoomSnapshot = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    const { requestUserId, userCanAccess } = resolveRoomAccess(room, req);

    if (!userCanAccess) {
      return res.status(403).json({ message: 'You do not have access to create snapshots for this room.' });
    }

    const { message, code, authorName } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ message: 'Commit message is required.' });
    }

    if (!code || typeof code !== 'object') {
      return res.status(400).json({ message: 'Snapshot code payload is required.' });
    }

    const snapshotAuthorName = req.user?.name || authorName?.trim() || 'Anonymous';
    const normalizedCode = {
      javascript: code.javascript || '',
      html: code.html || '',
      css: code.css || '',
      react: code.react || '',
      reactCss: code.reactCss || '',
    };

    const latestSnapshot = room.snapshots[room.snapshots.length - 1];
    const isDuplicateSnapshot = latestSnapshot
      && JSON.stringify(latestSnapshot.code || {}) === JSON.stringify(normalizedCode);

    if (isDuplicateSnapshot) {
      return res.status(409).json({ message: 'No code changes detected since the latest snapshot.' });
    }

    const snapshot = {
      snapshotId: uuidV4(),
      message: message.trim(),
      authorUser: requestUserId || null,
      authorName: snapshotAuthorName,
      code: normalizedCode,
    };

    room.snapshots.push(snapshot);
    room.lastOpenedAt = new Date();
    room.code = {
      ...room.code,
      ...normalizedCode,
    };
    await room.save();

    return res.status(201).json({
      message: 'Snapshot saved successfully.',
      snapshot: formatSnapshot(room.snapshots[room.snapshots.length - 1], room),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to save snapshot.', details: error.message });
  }
};

const checkoutRoomSnapshot = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    const { userCanAccess } = resolveRoomAccess(room, req);

    if (!userCanAccess) {
      return res.status(403).json({ message: 'You do not have access to restore this snapshot.' });
    }

    const snapshot = room.snapshots.find((item) => item.snapshotId === req.params.snapshotId);

    if (!snapshot) {
      return res.status(404).json({ message: 'Snapshot not found.' });
    }

    room.code = {
      ...room.code,
      ...snapshot.code,
    };
    room.lastOpenedAt = new Date();
    await room.save();

    const collaboratorRecipients = room.collaborators
      .map((collaborator) => collaborator.user)
      .filter(Boolean);

    await createNotifications(collaboratorRecipients.map((recipientUser) => ({
      recipientUser,
      actorUser: req.user?._id || null,
      actorName: req.user?.name || 'Anonymous',
      roomId: room.roomId,
      roomTitle: room.title,
      type: 'snapshot_restore',
      title: 'Snapshot restored',
      message: `${req.user?.name || 'Someone'} restored "${snapshot.message}" in ${room.title}.`,
      metadata: {
        snapshotId: snapshot.snapshotId,
        snapshotMessage: snapshot.message,
      },
    })));

    return res.status(200).json({
      message: 'Snapshot restored successfully.',
      room: formatRoom(room),
      snapshot: formatSnapshot(snapshot, room),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to restore snapshot.', details: error.message });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    if (room.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Only the room owner can delete this room.' });
    }

    const collaboratorRecipients = room.collaborators
      .map((collaborator) => collaborator.user)
      .filter(Boolean);

    await createNotifications(collaboratorRecipients.map((recipientUser) => ({
      recipientUser,
      actorUser: req.user._id,
      actorName: req.user.name,
      roomId: room.roomId,
      roomTitle: room.title,
      type: 'project_delete',
      title: 'Project deleted',
      message: `${req.user.name} deleted ${room.title}.`,
    })));

    await room.deleteOne();

    return res.status(200).json({
      message: 'Room deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete room.', details: error.message });
  }
};

module.exports = {
  createRoom,
  getUserRooms,
  getUserRoomAnalytics,
  getCommunityRooms,
  getCommunityRoomDetail,
  getRoomById,
  updateRoom,
  updateRoomCommunity,
  trackCommunityView,
  addCommunityComment,
  remixCommunityProject,
  toggleCommunityLike,
  inviteUserToRoom,
  deleteRoom,
  listRoomSnapshots,
  createRoomSnapshot,
  checkoutRoomSnapshot,
};
