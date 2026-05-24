const express = require('express');
const {
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
} = require('../controllers/roomController');
const { optionalProtect, protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create', protect, createRoom);
router.get('/user/:userId', protect, getUserRooms);
router.get('/analytics/user/:userId', protect, getUserRoomAnalytics);
router.get('/community', optionalProtect, getCommunityRooms);
router.get('/community/:roomId', optionalProtect, getCommunityRoomDetail);
router.post('/community/:roomId/view', optionalProtect, trackCommunityView);
router.post('/community/:roomId/comments', protect, addCommunityComment);
router.post('/community/:roomId/like', protect, toggleCommunityLike);
router.post('/community/:roomId/remix', protect, remixCommunityProject);
router.post('/:roomId/invite', protect, inviteUserToRoom);
router.put('/:roomId/community', protect, updateRoomCommunity);
router.get('/:roomId/snapshots', optionalProtect, listRoomSnapshots);
router.post('/:roomId/snapshots', optionalProtect, createRoomSnapshot);
router.post('/:roomId/snapshots/:snapshotId/checkout', optionalProtect, checkoutRoomSnapshot);
router.get('/:roomId', optionalProtect, getRoomById);
router.put('/:roomId', optionalProtect, updateRoom);
router.delete('/:roomId', protect, deleteRoom);

module.exports = router;
