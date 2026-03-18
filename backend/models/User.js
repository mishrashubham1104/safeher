const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'],
  },
  phone: {
    type: String,
    required: [true, 'Please provide your phone number'],
    unique: true,
    match: [/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  avatar: {
    public_id: String,
    url: { type: String, default: '' },
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user',
  },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: { type: [Number], default: [0, 0] },
    address: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now },
  },
  emergencyContacts: [{
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relation: { type: String, required: true },
    email: { type: String },
    notifyBySMS: { type: Boolean, default: true },
    notifyByEmail: { type: Boolean, default: true },
  }],
  safetyScore: { type: Number, default: 100 },
  sosHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SOS' }],
  reportedIncidents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Incident' }],
  preferences: {
    shareLocation: { type: Boolean, default: true },
    receiveAlerts: { type: Boolean, default: true },
    alertRadius: { type: Number, default: 5 }, // km
    anonymousReporting: { type: Boolean, default: false },
  },
  fcmToken: { type: String }, // For push notifications
  lastSeen: { type: Date, default: Date.now },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.getSignedToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

module.exports = mongoose.model('User', userSchema);
