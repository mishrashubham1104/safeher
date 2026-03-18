const User     = require('../models/User');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const nodemailer = require('nodemailer');
const { notifyAdminNewUser, notifyAdminLogin } = require('../utils/adminNotify');

// ── Email transporter ─────────────────────────────────────────
const createTransporter = () => nodemailer.createTransport({
  host:   process.env.EMAIL_HOST  || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth:   { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.getSignedToken();
  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      emergencyContacts: user.emergencyContacts,
      preferences: user.preferences,
      location: user.location,
    },
  });
};

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already registered' : 'Phone number already registered',
      });
    }

    const user = await User.create({ name, email, phone, password });

    // Notify admin of new registration (non-blocking)
    notifyAdminNewUser({ name, email, phone });

    sendTokenResponse(user, 201, res, 'Account created successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    user.lastSeen = Date.now();
    await user.save({ validateBeforeSave: false });

    // Notify admin of login (only if NOTIFY_ADMIN_ON_LOGIN=true in .env)
    notifyAdminLogin({ name: user.name, email: user.email, phone: user.phone });

    sendTokenResponse(user, 200, res, 'Logged in successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'phone', 'preferences', 'fcmToken'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update location
// @route   PUT /api/auth/location
exports.updateLocation = async (req, res, next) => {
  try {
    const { longitude, latitude, address } = req.body;

    await User.findByIdAndUpdate(req.user._id, {
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
        address: address || '',
        lastUpdated: Date.now(),
      },
    });

    // Broadcast location update via socket
    const io = req.app.get('io');
    io.emit('location_update', {
      userId: req.user._id,
      coordinates: [longitude, latitude],
    });

    res.status(200).json({ success: true, message: 'Location updated' });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res, 'Password updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password — send reset email
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Please provide your email' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists or not (security)
      return res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken  = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken  = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save({ validateBeforeSave: false });

    // Build reset URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // Send email
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from:    `"SafeHer" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to:      user.email,
        subject: '🔐 Reset Your SafeHer Password',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#FFF8F9;padding:24px;border-radius:12px;">
            <div style="background:linear-gradient(135deg,#C2185B,#FF4081);padding:20px 24px;border-radius:8px;margin-bottom:20px;text-align:center;">
              <h2 style="color:#fff;margin:0;font-size:20px;">🔐 Password Reset</h2>
              <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">SafeHer Women Safety Platform</p>
            </div>
            <p style="color:#1A0A0F;font-size:15px;">Hi <strong>${user.name}</strong>,</p>
            <p style="color:#6B3A4A;font-size:14px;line-height:1.6;">
              We received a request to reset your password. Click the button below to set a new password.
              This link expires in <strong>15 minutes</strong>.
            </p>
            <a href="${resetUrl}"
               style="display:block;margin:24px 0;padding:14px;background:linear-gradient(135deg,#C2185B,#FF4081);
                      color:#fff;text-align:center;border-radius:10px;text-decoration:none;
                      font-weight:700;font-size:15px;">
              Reset My Password →
            </a>
            <p style="color:#6B3A4A;font-size:12px;line-height:1.6;">
              If you didn't request this, ignore this email — your password won't change.
            </p>
            <hr style="border:none;border-top:1px solid #F0D0DA;margin:20px 0;" />
            <p style="color:#bbb;font-size:11px;text-align:center;">
              SafeHer · Women Safety Platform · 100% Free
            </p>
          </div>
        `,
      });
      console.log(`📧 Password reset email sent to: ${user.email}`);
    } catch (emailErr) {
      // If email fails, clear the token
      user.resetPasswordToken  = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      console.error('Reset email failed:', emailErr.message);
      return res.status(500).json({ success: false, message: 'Email could not be sent. Please try again.' });
    }

    res.status(200).json({ success: true, message: 'Password reset link sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using token
// @route   PUT /api/auth/reset-password/:token
exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Hash the token from URL to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken:  hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid or has expired. Please request a new one.',
      });
    }

    // Set new password and clear reset fields
    user.password            = password;
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful! You can now log in.' });
  } catch (error) {
    next(error);
  }
};