const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const LiveShare  = require('../models/LiveShare');
const User       = require('../models/User');

const sendEmail = async (to, subject, html) => {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') return;
  try {
    const t = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
      port:   parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth:   { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await t.sendMail({
      from: `"SafeHer" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to, subject, html,
    });
  } catch (err) {
    console.error('LiveShare email error:', err.message);
  }
};

// @route POST /api/liveshare/start
exports.startLiveShare = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please add emergency contacts first before sharing your location.',
      });
    }

    // End any existing active sessions
    await LiveShare.updateMany(
      { sharedBy: req.user._id, status: 'active' },
      { status: 'ended' }
    );

    const createdSessions = [];

    for (const contact of user.emergencyContacts) {
      const token    = crypto.randomBytes(24).toString('hex');
      const trackUrl = `${process.env.CLIENT_URL}/track/${token}`;

      const session = await LiveShare.create({
        sharedBy:      user._id,
        sharedByName:  user.name,
        sharedByPhone: user.phone,
        contactName:   contact.name,
        contactPhone:  contact.phone,
        contactEmail:  contact.email || '',
        token,
        lastMovedAt:   new Date(),
      });

      createdSessions.push(session);

      // Email contact
      if (contact.email) {
        await sendEmail(
          contact.email,
          `📍 ${user.name} is sharing their live location with you`,
          `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#FFF8F9;padding:24px;border-radius:12px;">
            <div style="background:linear-gradient(135deg,#C2185B,#880E4F);padding:20px;border-radius:8px;text-align:center;margin-bottom:20px;">
              <h2 style="color:#fff;margin:0;">📍 Live Location Shared</h2>
              <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">SafeHer Women Safety Platform</p>
            </div>
            <p style="font-size:15px;color:#1A0A0F;">Hi <strong>${contact.name}</strong>,</p>
            <p style="font-size:14px;color:#6B3A4A;line-height:1.6;">
              <strong>${user.name}</strong> is sharing their live location with you for safety.
            </p>
            <a href="${trackUrl}"
              style="display:block;margin:20px 0;padding:14px;background:linear-gradient(135deg,#C2185B,#880E4F);
                     color:#fff;text-align:center;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
              📍 Track Live Location →
            </a>
            <p style="font-size:12px;color:#888;line-height:1.6;">
              You will receive an automatic alert if ${user.name} stops moving for more than 5 minutes.
            </p>
          </div>`
        );
      }
    }

    const io = req.app.get('io');
    io.emit('liveshare_started', { userId: user._id, userName: user.name });

    const primary = createdSessions[0];

    res.status(201).json({
      success: true,
      message: `Live location shared with ${createdSessions.length} contact(s)`,
      session: {
        _id:        primary._id,
        token:      primary.token,
        trackUrl:   `${process.env.CLIENT_URL}/track/${primary.token}`,
        sharedWith: user.emergencyContacts.map(c => ({ name: c.name, phone: c.phone })),
        startedAt:  primary.createdAt,
        status:     'active',
      },
    });
  } catch (error) {
    console.error('startLiveShare error:', error.message);
    next(error);
  }
};

// @route PUT /api/liveshare/:id/update
exports.updateLiveLocation = async (req, res, next) => {
  try {
    const { longitude, latitude, address } = req.body;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    const sessions = await LiveShare.find({
      sharedBy: req.user._id,
      status:   'active',
    });

    if (!sessions.length) {
      return res.status(404).json({ success: false, message: 'No active session found' });
    }

    const io = req.app.get('io');

    for (const session of sessions) {
      // Check if moved > 10 metres
      const dist = Math.sqrt(
        Math.pow((lng - session.longitude) * 111000, 2) +
        Math.pow((lat - session.latitude)  * 111000, 2)
      );
      if (dist > 10) {
        session.lastMovedAt            = new Date();
        session.stoppedMovingAlertSent = false;
        session.stoppedMovingAt        = null;
      }

      // Update flat location fields
      session.latitude          = lat;
      session.longitude         = lng;
      session.address           = address || '';
      session.locationUpdatedAt = new Date();

      session.locationHistory.push({ latitude: lat, longitude: lng, address: address || '', timestamp: new Date() });
      if (session.locationHistory.length > 100) {
        session.locationHistory = session.locationHistory.slice(-100);
      }

      await session.save();

      // Broadcast to trackers
      io.to(`track_${session.token}`).emit('location_update', {
        latitude:  lat,
        longitude: lng,
        address:   address || '',
        timestamp: new Date(),
      });

      // Stopped-motion alert (5 min)
      const minutesStopped = (Date.now() - new Date(session.lastMovedAt)) / 60000;
      if (minutesStopped >= 5 && !session.stoppedMovingAlertSent) {
        session.stoppedMovingAlertSent = true;
        session.stoppedMovingAt        = new Date();
        await session.save();

        const trackUrl = `${process.env.CLIENT_URL}/track/${session.token}`;
        if (session.contactEmail) {
          await sendEmail(
            session.contactEmail,
            `⚠️ ALERT: ${session.sharedByName} hasn't moved in 5 minutes`,
            `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
              <div style="background:#E53935;padding:20px;border-radius:8px;text-align:center;margin-bottom:20px;">
                <h2 style="color:#fff;margin:0;">⚠️ MOVEMENT ALERT</h2>
              </div>
              <p>Hi <strong>${session.contactName}</strong>,</p>
              <p style="color:#B71C1C;font-weight:700;">
                ${session.sharedByName} has not moved for 5 minutes.<br/>
                Last location: <strong>${address || 'Unknown'}</strong>
              </p>
              <a href="${trackUrl}" style="display:block;margin:20px 0;padding:14px;background:#E53935;color:#fff;text-align:center;border-radius:10px;text-decoration:none;font-weight:700;">
                📍 Check Their Location Now →
              </a>
            </div>`
          );
        }

        io.to(`track_${session.token}`).emit('stopped_alert', {
          userName:  session.sharedByName,
          address:   address || '',
          stoppedAt: session.lastMovedAt,
          minutes:   5,
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('updateLiveLocation error:', error.message);
    next(error);
  }
};

// @route PUT /api/liveshare/:id/end
exports.endLiveShare = async (req, res, next) => {
  try {
    const sessions = await LiveShare.find({ sharedBy: req.user._id, status: 'active' });

    for (const session of sessions) {
      session.status = 'ended';
      await session.save();

      const io = req.app.get('io');
      io.to(`track_${session.token}`).emit('session_ended', {
        userName: session.sharedByName,
      });
    }

    res.status(200).json({ success: true, message: 'Live sharing ended' });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/liveshare/my-sessions
exports.getMyLiveSessions = async (req, res, next) => {
  try {
    const sessions = await LiveShare.find({ sharedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    // Group sessions created within same minute as one "session"
    const grouped = {};
    for (const s of sessions) {
      const key = new Date(s.createdAt).toISOString().slice(0, 16);
      if (!grouped[key]) {
        grouped[key] = {
          _id:        s._id,
          token:      s.token,
          status:     s.status,
          startedAt:  s.createdAt,
          endedAt:    s.updatedAt,
          latitude:   s.latitude,
          longitude:  s.longitude,
          address:    s.address,
          sharedWith: [],
        };
      }
      grouped[key].sharedWith.push({ name: s.contactName, phone: s.contactPhone });
      if (s.status === 'active') grouped[key].status = 'active';
    }

    res.status(200).json({ success: true, sessions: Object.values(grouped) });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/liveshare/track/:token  (public)
exports.getTrackSession = async (req, res, next) => {
  try {
    const session = await LiveShare.findOne({ token: req.params.token });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or expired' });
    }
    res.status(200).json({ success: true, session });
  } catch (error) {
    next(error);
  }
};