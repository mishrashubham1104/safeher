const mongoose = require('mongoose');

const liveShareSchema = new mongoose.Schema({
  // Who is sharing
  sharedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedByName:  { type: String, required: true },
  sharedByPhone: { type: String, required: true },

  // Which contact they shared with
  contactName:  { type: String, required: true },
  contactPhone: { type: String, required: true },
  contactEmail: { type: String, default: '' },

  // Unique token for the contact's view link (no login needed)
  token: { type: String, required: true, unique: true },

  // Current location — flat fields to avoid Mongoose type conflicts
  latitude:    { type: Number, default: 0 },
  longitude:   { type: Number, default: 0 },
  address:     { type: String, default: '' },
  locationUpdatedAt: { type: Date, default: Date.now },

  // Location history for trail on map
  locationHistory: [{
    latitude:  Number,
    longitude: Number,
    address:   { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  }],

  // Session status
  status: {
    type: String,
    enum: ['active', 'ended', 'expired'],
    default: 'active',
  },

  // Auto-stop alert
  stoppedMovingAt:       { type: Date, default: null },
  stoppedMovingAlertSent:{ type: Boolean, default: false },
  lastMovedAt:           { type: Date, default: Date.now },

  // Session expiry (2 hours)
  expiresAt: {
    type:    Date,
    default: () => new Date(Date.now() + 2 * 60 * 60 * 1000),
  },
}, { timestamps: true });

// liveShareSchema.index({ token: 1 });
liveShareSchema.index({ sharedBy: 1, status: 1 });
liveShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('LiveShare', liveShareSchema);