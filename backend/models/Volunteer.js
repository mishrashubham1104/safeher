const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  // Profile
  name:        { type: String, required: true },
  email:       { type: String, required: true },
  phone:       { type: String, required: true },
  photo:       { type: String, default: '' },

  // Skills & availability
  skills: [{
    type: String,
    enum: ['First Aid', 'Self Defense', 'Counseling', 'Legal Aid', 'Medical', 'Transportation', 'Other'],
  }],
  languages:    [{ type: String }],
  availability: {
    type: String,
    enum: ['always', 'daytime', 'nighttime', 'weekends'],
    default: 'always',
  },

  // Verification
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'suspended'],
    default: 'pending',
  },
  idProofUrl:    { type: String, default: '' },
  verifiedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt:    { type: Date },
  rejectedReason:{ type: String },

  // Location (real-time)
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
    address:     { type: String, default: '' },
    lastUpdated: { type: Date,   default: Date.now },
  },

  // Active status
  isOnline:     { type: Boolean, default: false },
  isAvailable:  { type: Boolean, default: true  },
  fcmToken:     { type: String },

  // Stats
  totalResponses:    { type: Number, default: 0 },
  successfulHelps:   { type: Number, default: 0 },
  rating:            { type: Number, default: 0, min: 0, max: 5 },
  totalRatings:      { type: Number, default: 0 },

  // Active alert they are responding to
  activeAlertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert', default: null },

}, { timestamps: true });

volunteerSchema.index({ location: '2dsphere' });
volunteerSchema.index({ status: 1, isOnline: 1, isAvailable: 1 });

module.exports = mongoose.model('Volunteer', volunteerSchema);