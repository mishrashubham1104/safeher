const SOS       = require('../models/SOS');
const User      = require('../models/User');
const Alert     = require('../models/Alert');
const Volunteer = require('../models/Volunteer');

// @desc    Trigger SOS alert
// @route   POST /api/sos/trigger
exports.triggerSOS = async (req, res, next) => {
  try {
    const { longitude, latitude, address, message } = req.body;
    const user = await User.findById(req.user._id);

    const sos = await SOS.create({
      user: user._id,
      location: {
        type:        'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        address:     address || 'Unknown location',
      },
      message:         message || 'Emergency SOS Alert triggered!',
      locationHistory: [{ coordinates: [parseFloat(longitude), parseFloat(latitude)] }],
    });

    const notified = [];

    // Notify emergency contacts via email
    for (const contact of user.emergencyContacts) {
      const notif = {
        name:       contact.name,
        phone:      contact.phone,
        email:      contact.email,
        notifiedAt: new Date(),
        smsSent:    false,
        emailSent:  false,
      };

      if (contact.notifyByEmail && contact.email &&
          process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your_email@gmail.com') {
        try {
          const nodemailer  = require('nodemailer');
          const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
          });
          const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
          await transporter.sendMail({
            from:    process.env.EMAIL_FROM,
            to:      contact.email,
            subject: `🚨 EMERGENCY: ${user.name} needs help!`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                <div style="background:#E53935;padding:20px;border-radius:8px 8px 0 0;text-align:center">
                  <h1 style="color:white;margin:0">🚨 EMERGENCY SOS ALERT</h1>
                </div>
                <div style="background:#fff;padding:24px;border:1px solid #eee;border-radius:0 0 8px 8px">
                  <h2 style="color:#C2185B">${user.name} needs immediate help!</h2>
                  <p><strong>Phone:</strong> ${user.phone}</p>
                  <p><strong>Location:</strong> ${address || 'Unknown'}</p>
                  <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                  <a href="${mapsLink}" style="display:inline-block;background:#E53935;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">
                    📍 View on Map
                  </a>
                  <p style="color:#666;font-size:12px">Automated alert from SafeHer Women Safety App.</p>
                </div>
              </div>`,
          });
          notif.emailSent = true;
        } catch (emailErr) {
          console.error('Email Error:', emailErr.message);
        }
      }

      notified.push(notif);
    }

    sos.contactsNotified = notified;
    await sos.save();

    // Update user SOS history
    await User.findByIdAndUpdate(user._id, { $push: { sosHistory: sos._id } });

    // Get io once — reuse throughout
    const io = req.app.get('io');

    // Emit real-time SOS alert
    io.emit('sos_alert', {
      sosId:     sos._id,
      userName:  user.name,
      userPhone: user.phone,
      location:  { coordinates: [longitude, latitude], address },
      timestamp: new Date(),
    });

    // Create Alert for volunteer system
    const alert = await Alert.create({
      triggeredBy: user._id,
      userName:    user.name,
      userPhone:   user.phone,
      type:        'sos',
      sosId:       sos._id,
      location: {
        type:        'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        address:     address || 'Unknown location',
      },
    });

    // Find nearby online volunteers within 10km
    const nearbyVolunteers = await Volunteer.find({
      status:      'verified',
      isOnline:    true,
      isAvailable: true,
      location: {
        $near: {
          $geometry:    { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: 10000,
        },
      },
    }).limit(10);

    // Notify volunteers via socket
    if (nearbyVolunteers.length > 0) {
      alert.responses = nearbyVolunteers.map(v => ({
        volunteer:  v._id,
        status:     'notified',
        notifiedAt: new Date(),
      }));
      await alert.save();

      nearbyVolunteers.forEach(v => {
        io.emit(`volunteer_alert_${v._id}`, {
          alertId:   alert._id,
          userName:  user.name,
          userPhone: user.phone,
          location:  { coordinates: [longitude, latitude], address },
          type:      'sos',
        });
      });

      io.emit('new_volunteer_alert', {
        alertId:            alert._id,
        userName:           user.name,
        location:           { coordinates: [longitude, latitude], address },
        volunteersNotified: nearbyVolunteers.length,
      });
    }

    res.status(201).json({
      success:          true,
      message:          'SOS alert triggered successfully',
      sos,
      contactsNotified: notified.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update SOS location (real-time tracking)
// @route   PUT /api/sos/:id/location
exports.updateSOSLocation = async (req, res, next) => {
  try {
    const { longitude, latitude } = req.body;
    const sos = await SOS.findById(req.params.id);

    if (!sos) return res.status(404).json({ success: false, message: 'SOS not found' });
    if (sos.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    sos.location.coordinates = [parseFloat(longitude), parseFloat(latitude)];
    sos.locationHistory.push({ coordinates: [parseFloat(longitude), parseFloat(latitude)] });
    await sos.save();

    const io = req.app.get('io');
    io.to(`sos_${sos._id}`).emit('sos_location_update', {
      sosId:       sos._id,
      coordinates: [longitude, latitude],
      timestamp:   new Date(),
    });

    res.status(200).json({ success: true, message: 'Location updated' });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel/Resolve SOS
// @route   PUT /api/sos/:id/cancel
exports.cancelSOS = async (req, res, next) => {
  try {
    const { status = 'cancelled', notes } = req.body;
    const sos = await SOS.findById(req.params.id);

    if (!sos) return res.status(404).json({ success: false, message: 'SOS not found' });
    if (sos.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    sos.status = status;
    sos.notes  = notes;
    if (status === 'cancelled') sos.cancelledAt = Date.now();
    if (status === 'resolved')  sos.resolvedAt  = Date.now();

    const startTime  = new Date(sos.createdAt).getTime();
    sos.responseTime = Math.floor((Date.now() - startTime) / 1000);
    await sos.save();

    const io = req.app.get('io');
    io.emit('sos_cancelled', { sosId: sos._id, userId: req.user._id, status });

    res.status(200).json({ success: true, message: 'SOS alert cancelled', sos });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's SOS history
// @route   GET /api/sos/history
exports.getSOSHistory = async (req, res, next) => {
  try {
    const history = await SOS.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.status(200).json({ success: true, history });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active SOS alerts (admin)
// @route   GET /api/sos/active
exports.getActiveSOS = async (req, res, next) => {
  try {
    const active = await SOS.find({ status: 'active' })
      .populate('user', 'name phone')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, active });
  } catch (error) {
    next(error);
  }
};