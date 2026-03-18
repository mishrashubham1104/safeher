const mongoose = require('mongoose');

const sosSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: { type: [Number], required: true },
    address: String,
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'cancelled', 'false_alarm'],
    default: 'active',
  },
  message: {
    type: String,
    default: 'Emergency SOS Alert triggered!',
  },
  contactsNotified: [{
    name: String,
    phone: String,
    email: String,
    notifiedAt: { type: Date, default: Date.now },
    smsSent: { type: Boolean, default: false },
    emailSent: { type: Boolean, default: false },
  }],
  locationHistory: [{
    coordinates: [Number],
    timestamp: { type: Date, default: Date.now },
  }],
  resolvedAt: Date,
  cancelledAt: Date,
  responseTime: Number, // in seconds
  notes: String,
}, { timestamps: true });

sosSchema.index({ location: '2dsphere' });
sosSchema.index({ user: 1, status: 1 });
sosSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SOS', sosSchema);
