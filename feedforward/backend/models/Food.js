const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema(
  {
    foodName: { type: String, required: true, trim: true },
    quantity: { type: String, required: true },
    expiryTime: { type: Date, required: true },
    location: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['available', 'requested', 'accepted', 'delivered', 'expired'],
      default: 'available',
    },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Food', foodSchema);
