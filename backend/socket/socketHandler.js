const jwt = require('jsonwebtoken');
const User = require('../models/User');

const connectedUsers = new Map(); // userId -> socketId

const initSocket = (io) => {
  // Middleware: authenticate socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    connectedUsers.set(userId, socket.id);

    console.log(`🔌 User connected: ${socket.user.name} (${userId})`);

    // Join user's personal room
    socket.join(`user_${userId}`);

    // Join admin room if admin
    if (socket.user.role === 'admin' || socket.user.role === 'moderator') {
      socket.join('admin_room');
    }

    // Broadcast online count
    io.emit('online_count', connectedUsers.size);

    // ── LOCATION SHARING ──────────────────────────────────────────
    socket.on('share_location', async (data) => {
      const { longitude, latitude, address } = data;
      try {
        await User.findByIdAndUpdate(userId, {
          'location.coordinates': [parseFloat(longitude), parseFloat(latitude)],
          'location.address': address || '',
          'location.lastUpdated': Date.now(),
        });

        // Broadcast to all subscribers of this user's location
        socket.to(`watching_${userId}`).emit('user_location_update', {
          userId,
          coordinates: [longitude, latitude],
          address,
          timestamp: new Date(),
        });
      } catch (err) {
        console.error('Location update error:', err);
      }
    });

    // ── WATCH USER LOCATION ───────────────────────────────────────
    socket.on('watch_user', (targetUserId) => {
      socket.join(`watching_${targetUserId}`);
    });

    socket.on('unwatch_user', (targetUserId) => {
      socket.leave(`watching_${targetUserId}`);
    });

    // ── SOS ROOM ──────────────────────────────────────────────────
    socket.on('join_sos_room', (sosId) => {
      socket.join(`sos_${sosId}`);
    });

    socket.on('sos_location_update', (data) => {
      const { sosId, longitude, latitude } = data;
      socket.to(`sos_${sosId}`).emit('sos_live_location', {
        sosId,
        coordinates: [longitude, latitude],
        timestamp: new Date(),
      });
    });

    // ── CHAT / COMMUNITY ──────────────────────────────────────────
    socket.on('join_community', () => {
      socket.join('community_chat');
    });

    socket.on('send_message', (data) => {
      const message = {
        id: Date.now(),
        userId,
        userName: socket.user.name,
        text: data.text,
        timestamp: new Date(),
        isAnonymous: data.isAnonymous || false,
      };

      if (data.isAnonymous) {
        message.userName = 'Anonymous';
        message.userId = null;
      }

      io.to('community_chat').emit('new_message', message);
    });

    // ── LIVE SHARE TRACKING (public watchers join via token) ─────
    socket.on('join_track', (data) => {
      socket.join(`track_${data.trackToken}`);
      console.log(`👁️  Tracking session joined: ${data.trackToken}`);
    });

    socket.on('leave_track', (data) => {
      socket.leave(`track_${data.trackToken}`);
    });

    // ── PANIC BUTTON (shake to send SOS) ─────────────────────────
    socket.on('panic_shake', async (data) => {
      console.log(`⚠️  Panic shake from ${socket.user.name}`);
      io.to('admin_room').emit('panic_alert', {
        userId,
        userName: socket.user.name,
        userPhone: socket.user.phone,
        coordinates: data.coordinates,
        timestamp: new Date(),
      });
    });

    // ── TYPING INDICATOR ─────────────────────────────────────────
    socket.on('typing', (data) => {
      socket.to('community_chat').emit('user_typing', {
        userId,
        userName: data.isAnonymous ? 'Someone' : socket.user.name,
      });
    });

    socket.on('stop_typing', () => {
      socket.to('community_chat').emit('user_stop_typing', { userId });
    });

    // ── DISCONNECT ────────────────────────────────────────────────
    socket.on('disconnect', () => {
      connectedUsers.delete(userId);
      console.log(`🔌 User disconnected: ${socket.user.name}`);
      io.emit('online_count', connectedUsers.size);
    });
  });
};

const getConnectedUsers = () => connectedUsers;

module.exports = { initSocket, getConnectedUsers };