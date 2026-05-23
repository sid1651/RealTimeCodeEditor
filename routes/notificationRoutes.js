const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  listNotifications,
  markAllNotificationsRead,
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/', protect, listNotifications);
router.put('/read-all', protect, markAllNotificationsRead);

module.exports = router;
