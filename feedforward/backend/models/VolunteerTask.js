const mongoose = require('mongoose');

const volunteerTaskSchema = new mongoose.Schema(
  {
    foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seekerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // When a provider accepts a request we create a task with volunteerId=null.
    // Volunteers later "pick up" these tasks by accepting them.
    volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'picked', 'delivered'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Ensure one active task per (food, provider, seeker) combination.
volunteerTaskSchema.index({ foodId: 1, providerId: 1, seekerId: 1 }, { unique: true });

module.exports = mongoose.model('VolunteerTask', volunteerTaskSchema);

