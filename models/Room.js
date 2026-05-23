const mongoose = require('mongoose');

const collaboratorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const snapshotSchema = new mongoose.Schema(
  {
    snapshotId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    authorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    code: {
      javascript: { type: String, default: '' },
      html: { type: String, default: '' },
      css: { type: String, default: '' },
      react: { type: String, default: '' },
      reactCss: { type: String, default: '' },
    },
  },
  {
    _id: false,
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    collaborators: {
      type: [collaboratorSchema],
      default: [],
    },
    language: {
      type: String,
      enum: ['vanilla', 'react'],
      default: 'vanilla',
    },
    code: {
      javascript: { type: String, default: '' },
      html: { type: String, default: '' },
      css: { type: String, default: '' },
      react: { type: String, default: '' },
      reactCss: { type: String, default: '' },
    },
    template: {
      type: String,
      default: 'blank',
      trim: true,
    },
    thumbnail: {
      type: String,
      default: '',
      trim: true,
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
    privacy: {
      type: String,
      enum: ['private', 'shared'],
      default: 'private',
    },
    activeUsers: {
      type: Number,
      default: 0,
    },
    openCount: {
      type: Number,
      default: 0,
    },
    editCount: {
      type: Number,
      default: 0,
    },
    lastOpenedAt: {
      type: Date,
      default: Date.now,
    },
    snapshots: {
      type: [snapshotSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Room', roomSchema);
