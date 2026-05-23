const express = require('express');
const {
  createRoom,
  getUserRooms,
  getUserRoomAnalytics,
  getRoomById,
  updateRoom,
  inviteUserToRoom,
  deleteRoom,
  listRoomSnapshots,
  createRoomSnapshot,
  checkoutRoomSnapshot,
} = require('../controllers/roomController');
const { optionalProtect, protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create', protect, createRoom);
router.get('/user/:userId', protect, getUserRooms);
router.get('/analytics/user/:userId', protect, getUserRoomAnalytics);
router.post('/:roomId/invite', protect, inviteUserToRoom);
router.get('/:roomId/snapshots', optionalProtect, listRoomSnapshots);
router.post('/:roomId/snapshots', optionalProtect, createRoomSnapshot);
router.post('/:roomId/snapshots/:snapshotId/checkout', optionalProtect, checkoutRoomSnapshot);
router.get('/:roomId', optionalProtect, getRoomById);
router.put('/:roomId', optionalProtect, updateRoom);
router.delete('/:roomId', protect, deleteRoom);

module.exports = router;
