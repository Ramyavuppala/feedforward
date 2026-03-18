const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    type: { type: String, default: 'info' },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
