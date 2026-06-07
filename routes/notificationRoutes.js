const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  listNotifications,
  markAllNotificationsRead,
  markNotificationActionCompleted,
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/', protect, listNotifications);
router.put('/read-all', protect, markAllNotificationsRead);
router.put('/:notificationId/action-completed', protect, markNotificationActionCompleted);

module.exports = router;
