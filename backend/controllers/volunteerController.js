const Volunteer = require('../models/Volunteer');
const Alert     = require('../models/Alert');
const User      = require('../models/User');

// ── Register as volunteer ─────────────────────────────────────
// @route POST /api/volunteers/register
exports.registerVolunteer = async (req, res, next) => {
  try {
    const { skills, languages, availability } = req.body;
    const user = await User.findById(req.user._id);

    // Check if already registered
    const existing = await Volunteer.findOne({ user: req.user._id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: existing.status === 'pending'
          ? 'Your application is under review.'
          : `Your volunteer status is: ${existing.status}`,
      });
    }

    const volunteer = await Volunteer.create({
      user:         req.user._id,
      name:         user.name,
      email:        user.email,
      phone:        user.phone,
      skills:       skills || [],
      languages:    languages || ['Hindi', 'English'],
      availability: availability || 'always',
      status:       'pending',
    });

    // Notify admins via socket
    const io = req.app.get('io');
    if (io) io.emit('new_volunteer_application', { volunteer });

    res.status(201).json({
      success: true,
      message: 'Volunteer application submitted! Admin will verify within 24 hours.',
      volunteer,
    });
  } catch (error) {
    next(error);
  }
};

// ── Get my volunteer profile ──────────────────────────────────
// @route GET /api/volunteers/me
exports.getMyProfile = async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findOne({ user: req.user._id });
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer profile not found' });
    }
    res.status(200).json({ success: true, volunteer });
  } catch (error) {
    next(error);
  }
};

// ── Update volunteer location & online status ─────────────────
// @route PUT /api/volunteers/location
exports.updateLocation = async (req, res, next) => {
  try {
    const { longitude, latitude, address, isOnline, isAvailable } = req.body;

    const volunteer = await Volunteer.findOne({ user: req.user._id });
    if (!volunteer || volunteer.status !== 'verified') {
      return res.status(403).json({ success: false, message: 'Not a verified volunteer' });
    }

    const updates = {};
    if (longitude && latitude) {
      updates.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        address: address || volunteer.location.address,
        lastUpdated: new Date(),
      };
    }
    if (isOnline    !== undefined) updates.isOnline    = isOnline;
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;

    const updated = await Volunteer.findOneAndUpdate(
      { user: req.user._id },
      updates,
      { new: true }
    );

    // Broadcast updated location via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('volunteer_location_update', {
        volunteerId: volunteer._id,
        coordinates: updates.location?.coordinates,
        isOnline:    updated.isOnline,
        isAvailable: updated.isAvailable,
      });
    }

    res.status(200).json({ success: true, volunteer: updated });
  } catch (error) {
    next(error);
  }
};

// ── Get nearby active alerts ──────────────────────────────────
// @route GET /api/volunteers/alerts
exports.getNearbyAlerts = async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findOne({ user: req.user._id });
    if (!volunteer || volunteer.status !== 'verified') {
      return res.status(403).json({ success: false, message: 'Not a verified volunteer' });
    }

    const { longitude, latitude, radius = 10 } = req.query;
    const lng = parseFloat(longitude) || volunteer.location.coordinates[0];
    const lat = parseFloat(latitude)  || volunteer.location.coordinates[1];

    const alerts = await Alert.find({
      status: 'active',
      location: {
        $near: {
          $geometry:    { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radius * 1000,
        },
      },
    })
    .populate('triggeredBy', 'name phone')
    .sort({ createdAt: -1 })
    .limit(20);

    res.status(200).json({ success: true, alerts });
  } catch (error) {
    next(error);
  }
};

// ── Accept or decline an alert ────────────────────────────────
// @route PUT /api/volunteers/alerts/:alertId/respond
exports.respondToAlert = async (req, res, next) => {
  try {
    const { status, notes } = req.body; // 'accepted' or 'declined'
    const volunteer = await Volunteer.findOne({ user: req.user._id });

    if (!volunteer || volunteer.status !== 'verified') {
      return res.status(403).json({ success: false, message: 'Not a verified volunteer' });
    }

    const alert = await Alert.findById(req.params.alertId);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    // Find existing response or add new one
    const existingIdx = alert.responses.findIndex(
      (r) => r.volunteer.toString() === volunteer._id.toString()
    );

    if (existingIdx >= 0) {
      alert.responses[existingIdx].status      = status;
      alert.responses[existingIdx].respondedAt = new Date();
      alert.responses[existingIdx].notes       = notes || '';
    } else {
      alert.responses.push({
        volunteer:   volunteer._id,
        status,
        respondedAt: new Date(),
        notes:       notes || '',
      });
    }

    // If accepted — mark alert as responding and volunteer as busy
    if (status === 'accepted') {
      alert.status = 'responding';
      await Volunteer.findByIdAndUpdate(volunteer._id, {
        activeAlertId: alert._id,
        isAvailable:   false,
      });
    }

    await alert.save();

    // Notify via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('volunteer_responded', {
        alertId:     alert._id,
        volunteerId: volunteer._id,
        volunteerName: volunteer.name,
        status,
      });
    }

    res.status(200).json({ success: true, message: `Alert ${status}`, alert });
  } catch (error) {
    next(error);
  }
};

// ── Update response status (arrived / completed) ──────────────
// @route PUT /api/volunteers/alerts/:alertId/status
exports.updateResponseStatus = async (req, res, next) => {
  try {
    const { status, resolution } = req.body;
    const volunteer = await Volunteer.findOne({ user: req.user._id });

    if (!volunteer) {
      return res.status(403).json({ success: false, message: 'Not a volunteer' });
    }

    const alert = await Alert.findById(req.params.alertId);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const responseIdx = alert.responses.findIndex(
      (r) => r.volunteer.toString() === volunteer._id.toString()
    );

    if (responseIdx < 0) {
      return res.status(400).json({ success: false, message: 'You are not responding to this alert' });
    }

    alert.responses[responseIdx].status = status;

    if (status === 'arrived') {
      alert.responses[responseIdx].arrivedAt = new Date();
    }

    if (status === 'completed') {
      alert.responses[responseIdx].completedAt = new Date();
      alert.status      = 'resolved';
      alert.resolvedBy  = volunteer._id;
      alert.resolvedAt  = new Date();
      alert.resolution  = resolution || 'Resolved by volunteer';

      // Update volunteer stats
      await Volunteer.findByIdAndUpdate(volunteer._id, {
        $inc: { totalResponses: 1, successfulHelps: 1 },
        activeAlertId: null,
        isAvailable:   true,
      });
    }

    await alert.save();

    // Notify via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('alert_status_update', {
        alertId:   alert._id,
        status:    alert.status,
        volunteer: { id: volunteer._id, name: volunteer.name },
      });
    }

    res.status(200).json({ success: true, message: `Status updated to ${status}`, alert });
  } catch (error) {
    next(error);
  }
};

// ── Get volunteer's active alert ──────────────────────────────
// @route GET /api/volunteers/active-alert
exports.getActiveAlert = async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findOne({ user: req.user._id });
    if (!volunteer?.activeAlertId) {
      return res.status(200).json({ success: true, alert: null });
    }

    const alert = await Alert.findById(volunteer.activeAlertId)
      .populate('triggeredBy', 'name phone');

    res.status(200).json({ success: true, alert });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────

// @route GET /api/volunteers/admin/all
exports.getAllVolunteers = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const volunteers = await Volunteer.find(query)
      .populate('user', 'email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, volunteers });
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/volunteers/admin/:id/verify
exports.verifyVolunteer = async (req, res, next) => {
  try {
    const { status, rejectedReason } = req.body;

    if (!['verified', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const volunteer = await Volunteer.findByIdAndUpdate(
      req.params.id,
      {
        status,
        verifiedBy:     req.user._id,
        verifiedAt:     new Date(),
        rejectedReason: rejectedReason || '',
      },
      { new: true }
    );

    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    // Notify via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('volunteer_verified', {
        volunteerId: volunteer._id,
        userId:      volunteer.user,
        status,
      });
    }

    res.status(200).json({ success: true, message: `Volunteer ${status}`, volunteer });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/volunteers/admin/alerts
exports.getAllAlerts = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const alerts = await Alert.find(query)
      .populate('triggeredBy', 'name phone')
      .populate('responses.volunteer', 'name phone')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, alerts });
  } catch (error) {
    next(error);
  }
};