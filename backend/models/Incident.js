const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Incident type is required'],
    enum: ['Harassment', 'Stalking', 'Assault', 'Unsafe Area', 'Poor Lighting', 'Theft', 'Eve Teasing', 'Other'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere',
    },
    address: { type: String, required: true },
    area: String,
    city: String,
    state: String,
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isAnonymous: { type: Boolean, default: false },
  images: [{
    public_id: String,
    url: String,
  }],
  status: {
    type: String,
    enum: ['pending', 'verified', 'resolved', 'rejected', 'investigating'],
    default: 'pending',
  },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  upvoteCount: { type: Number, default: 0 },
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    isAnonymous: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  }],
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  resolvedAt: Date,
  adminNotes: String,
  tags: [String],
  timeOfIncident: { type: Date, default: Date.now },
  policeReported: { type: Boolean, default: false },
  policeReportNumber: String,
}, { timestamps: true });

incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ status: 1, createdAt: -1 });
incidentSchema.index({ type: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
