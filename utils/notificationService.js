const Notification = require('../models/Notification');

const createNotification = async ({
  recipientUser,
  actorUser = null,
  actorName = 'System',
  roomId = '',
  roomTitle = '',
  type,
  title,
  message,
  metadata = {},
}) => {
  if (!recipientUser) {
    return null;
  }

  if (actorUser && recipientUser.toString() === actorUser.toString()) {
    return null;
  }

  return Notification.create({
    recipientUser,
    actorUser,
    actorName,
    roomId,
    roomTitle,
    type,
    title,
    message,
    metadata,
  });
};

const createNotifications = async (items) => {
  const operations = items.map((item) => createNotification(item));
  return Promise.all(operations);
};

module.exports = {
  createNotification,
  createNotifications,
};
