const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  createdAt: user.createdAt,
});

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone = '' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: hashedPassword,
    });

    return res.status(201).json({
      message: 'Account created successfully.',
      token: generateToken(user._id.toString()),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to register user.', details: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.status(200).json({
      message: 'Logged in successfully.',
      token: generateToken(user._id.toString()),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to log in.', details: error.message });
  }
};

const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    user: sanitizeUser(req.user),
  });
};

const updateCurrentUser = async (req, res) => {
  try {
    const { name, email, phone = '' } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'That email is already being used by another account.' });
    }

    req.user.name = name.trim();
    req.user.email = normalizedEmail;
    req.user.phone = phone.trim();
    await req.user.save();

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update profile.', details: error.message });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.status(200).json({
      message: 'Password updated successfully.',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update password.', details: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  updateCurrentUser,
  updatePassword,
};
