const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  // Who triggered
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName:  { type: String, required: true },
  userPhone: { type: String, required: true },

  // Type of alert
  type: {
    type: String,
    enum: ['sos', 'incident', 'manual'],
    default: 'sos',
  },

  // Reference to SOS or Incident
  sosId:      { type: mongoose.Schema.Types.ObjectId, ref: 'SOS' },
  incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },

  // Location
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
    address:     { type: String, default: '' },
  },

  // Alert status
  status: {
    type: String,
    enum: ['active', 'responding', 'resolved', 'cancelled'],
    default: 'active',
  },

  // Volunteer responses
  responses: [{
    volunteer:   { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer' },
    status: {
      type: String,
      enum: ['notified', 'accepted', 'declined', 'arrived', 'completed'],
      default: 'notified',
    },
    notifiedAt:  { type: Date, default: Date.now },
    respondedAt: { type: Date },
    arrivedAt:   { type: Date },
    completedAt: { type: Date },
    notes:       { type: String },
  }],

  // Resolution
  resolvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer' },
  resolvedAt:  { type: Date },
  resolution:  { type: String },

}, { timestamps: true });

alertSchema.index({ location: '2dsphere' });
alertSchema.index({ status: 1 });

module.exports = mongoose.model('Alert', alertSchema);