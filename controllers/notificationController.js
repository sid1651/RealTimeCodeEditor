const Notification = require('../models/Notification');

const formatNotification = (notification) => ({
  id: notification._id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  roomId: notification.roomId,
  roomTitle: notification.roomTitle,
  actorName: notification.actorName,
  metadata: notification.metadata || {},
  readAt: notification.readAt,
  createdAt: notification.createdAt,
});

const listNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientUser: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = notifications.filter((item) => !item.readAt).length;

    return res.status(200).json({
      notifications: notifications.map(formatNotification),
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch notifications.', details: error.message });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipientUser: req.user._id,
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      }
    );

    return res.status(200).json({
      message: 'Notifications marked as read.',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update notifications.', details: error.message });
  }
};

module.exports = {
  listNotifications,
  markAllNotificationsRead,
};
