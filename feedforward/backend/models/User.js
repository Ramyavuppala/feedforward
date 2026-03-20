const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'provider', 'seeker', 'volunteer'], default: 'seeker' },
    // Last known seeker location (used for smart matching/notifications).
    // Optional so existing users and records remain valid.
    lastLat: { type: Number },
    lastLng: { type: Number },
    // Trust score drives reputation badges across the app.
    // Always keep non-negative values.
    trustScore: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
