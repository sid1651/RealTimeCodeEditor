const express = require('express');
const {
  registerUser,
  loginUser,
  getCurrentUser,
  updateCurrentUser,
  updatePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getCurrentUser);
router.put('/me', protect, updateCurrentUser);
router.put('/password', protect, updatePassword);

module.exports = router;
