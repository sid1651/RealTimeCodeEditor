const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: 20,
    },
    password: {
      type: String,
      required() {
        return this.authProvider === 'local';
      },
      minlength: 6,
      select: false,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'github'],
      default: 'local',
    },
    googleId: {
      type: String,
      default: '',
      index: true,
    },
    githubId: {
      type: String,
      default: '',
      index: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    hasCompletedOnboarding: {
      type: Boolean,
      default: true,
    },
    verificationOtpHash: {
      type: String,
      select: false,
      default: null,
    },
    verificationOtpExpiresAt: {
      type: Date,
      default: null,
    },
    verificationOtpSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
