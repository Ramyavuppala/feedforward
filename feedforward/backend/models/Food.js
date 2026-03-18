const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema(
  {
    foodName: { type: String, required: true, trim: true },
    // Legacy display-only field (older records). New flow uses numeric quantities below.
    quantity: { type: String, default: '' },
    totalQuantity: { type: Number, required: true, min: 0 },
    remainingQuantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    expiryTime: { type: Date, required: true },
    location: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      // requested/accepted kept for backward compatibility (older UI logic)
      enum: ['available', 'requested', 'accepted', 'completed', 'delivered', 'expired'],
      default: 'available',
    },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Food', foodSchema);
