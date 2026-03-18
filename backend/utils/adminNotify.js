const nodemailer = require('nodemailer');

// ── Create reusable transporter ───────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST  || 'smtp.gmail.com',
    port:   process.env.EMAIL_PORT  || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ── Send admin notification for new user registration ─────────
exports.notifyAdminNewUser = async ({ name, email, phone }) => {
  if (!process.env.EMAIL_USER || !process.env.ADMIN_EMAIL) return;

  try {
    const transporter = createTransporter();
    const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    await transporter.sendMail({
      from:    `"SafeHer Platform" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to:      process.env.ADMIN_EMAIL,
      subject: `🆕 New User Registered — ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #FFF8F9; padding: 24px; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #C2185B, #FF4081); padding: 16px 24px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: white; margin: 0; font-size: 18px;">🆕 New User Registered</h2>
            <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 13px;">SafeHer Platform</p>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 12px; font-size: 13px; color: #6B3A4A; font-weight: bold; width: 100px;">Name</td>
              <td style="padding: 8px 12px; font-size: 14px; color: #1A0A0F;">${name}</td>
            </tr>
            <tr style="background: #FFF0F5;">
              <td style="padding: 8px 12px; font-size: 13px; color: #6B3A4A; font-weight: bold;">Email</td>
              <td style="padding: 8px 12px; font-size: 14px; color: #1A0A0F;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-size: 13px; color: #6B3A4A; font-weight: bold;">Phone</td>
              <td style="padding: 8px 12px; font-size: 14px; color: #1A0A0F;">${phone}</td>
            </tr>
            <tr style="background: #FFF0F5;">
              <td style="padding: 8px 12px; font-size: 13px; color: #6B3A4A; font-weight: bold;">Time</td>
              <td style="padding: 8px 12px; font-size: 14px; color: #1A0A0F;">${time} IST</td>
            </tr>
          </table>

          <div style="margin-top: 20px; padding: 12px; background: #E8F5E9; border-radius: 8px; border-left: 4px solid #00897B;">
            <p style="margin: 0; font-size: 13px; color: #2E7D32;">
              ✅ User account created successfully. Login to the Admin Dashboard to view all users.
            </p>
          </div>

          <p style="font-size: 11px; color: #bbb; margin-top: 20px; text-align: center;">
            SafeHer Admin Notifications · Reply to unsubscribe
          </p>
        </div>
      `,
    });

    console.log(`📧 Admin notified of new user: ${name} (${email})`);
  } catch (err) {
    // Don't block registration if email fails
    console.error('Admin notification email failed:', err.message);
  }
};

// ── Send admin notification for new login ─────────────────────
exports.notifyAdminLogin = async ({ name, email, phone }) => {
  if (!process.env.EMAIL_USER || !process.env.ADMIN_EMAIL) return;
  if (!process.env.NOTIFY_ADMIN_ON_LOGIN || process.env.NOTIFY_ADMIN_ON_LOGIN !== 'true') return;

  try {
    const transporter = createTransporter();
    const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    await transporter.sendMail({
      from:    `"SafeHer Platform" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to:      process.env.ADMIN_EMAIL,
      subject: `🔐 User Login — ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #FFF8F9; padding: 24px; border-radius: 12px;">
          <div style="background: #1565C0; padding: 16px 24px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: white; margin: 0; font-size: 18px;">🔐 User Logged In</h2>
            <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 13px;">SafeHer Platform</p>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 12px; font-size: 13px; color: #6B3A4A; font-weight: bold; width: 100px;">Name</td>
              <td style="padding: 8px 12px; font-size: 14px; color: #1A0A0F;">${name}</td>
            </tr>
            <tr style="background: #FFF0F5;">
              <td style="padding: 8px 12px; font-size: 13px; color: #6B3A4A; font-weight: bold;">Email</td>
              <td style="padding: 8px 12px; font-size: 14px; color: #1A0A0F;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-size: 13px; color: #6B3A4A; font-weight: bold;">Phone</td>
              <td style="padding: 8px 12px; font-size: 14px; color: #1A0A0F;">${phone}</td>
            </tr>
            <tr style="background: #FFF0F5;">
              <td style="padding: 8px 12px; font-size: 13px; color: #6B3A4A; font-weight: bold;">Time</td>
              <td style="padding: 8px 12px; font-size: 14px; color: #1A0A0F;">${time} IST</td>
            </tr>
          </table>

          <p style="font-size: 11px; color: #bbb; margin-top: 20px; text-align: center;">
            Set NOTIFY_ADMIN_ON_LOGIN=false in .env to stop login notifications
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Admin login notification failed:', err.message);
  }
};

// ── Send admin notification for SOS trigger ───────────────────
exports.notifyAdminSOS = async ({ userName, userPhone, address, lat, lng }) => {
  if (!process.env.EMAIL_USER || !process.env.ADMIN_EMAIL) return;

  try {
    const transporter = createTransporter();
    const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;

    await transporter.sendMail({
      from:    `"SafeHer ALERT" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to:      process.env.ADMIN_EMAIL,
      subject: `🚨 SOS TRIGGERED — ${userName} needs help!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #FFF8F9; padding: 24px; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #E53935, #B71C1C); padding: 16px 24px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: white; margin: 0; font-size: 20px;">🚨 EMERGENCY SOS ALERT</h2>
            <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0; font-size: 13px;">Immediate action required</p>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 12px; font-size: 13px; color: #6B3A4A; font-weight: bold; width: 100px;">User</td>
              <td style="padding: 8px 12px; font-size: 14px; color: #1A0A0F; font-weight: bold;">${userName}</td>
            </tr>
            <tr style="background: #FFF0F5;">
              <td style="padding: 8px 12px; font-size: 13px; color: #6B3A4A; font-weight: bold;">Phone</td>
              <td style="padding: 8px 12px; font-size: 14px; color: #C2185B; font-weight: bold;">${userPhone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-size: 13px; color: #6B3A4A; font-weight: bold;">Location</td>
              <td style="padding: 8px 12px; font-size: 14px; color: #1A0A0F;">${address}</td>
            </tr>
            <tr style="background: #FFF0F5;">
              <td style="padding: 8px 12px; font-size: 13px; color: #6B3A4A; font-weight: bold;">Time</td>
              <td style="padding: 8px 12px; font-size: 14px; color: #1A0A0F;">${time} IST</td>
            </tr>
          </table>

          <a href="${mapsLink}" style="display: block; margin-top: 16px; padding: 14px; background: #E53935; color: white; text-align: center; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
            📍 View Live Location on Google Maps
          </a>

          <div style="margin-top: 16px; padding: 12px; background: #FFEBEE; border-radius: 8px; border-left: 4px solid #E53935;">
            <p style="margin: 0; font-size: 13px; color: #C62828; font-weight: bold;">
              ⚠️ This user has triggered an emergency SOS. Their emergency contacts have been notified via SMS and Email.
            </p>
          </div>
        </div>
      `,
    });

    console.log(`🚨 Admin notified of SOS from: ${userName}`);
  } catch (err) {
    console.error('Admin SOS notification failed:', err.message);
  }
};