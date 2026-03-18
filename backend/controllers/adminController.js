const User = require('../models/User');
const Incident = require('../models/Incident');
const SOS = require('../models/SOS');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [totalUsers, totalIncidents, pendingIncidents, activeSOS, resolvedIncidents] = await Promise.all([
      User.countDocuments({}),                              // all users including admins
      Incident.countDocuments(),
      Incident.countDocuments({ status: 'pending' }),
      SOS.countDocuments({ status: 'active' }),
      Incident.countDocuments({ status: 'resolved' }),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayIncidents, todayUsers, todaySOS] = await Promise.all([
      Incident.countDocuments({ createdAt: { $gte: todayStart } }),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      SOS.countDocuments({ createdAt: { $gte: todayStart } }),
    ]);

    // Incident breakdown by type
    const incidentsByType = await Incident.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Incidents by severity
    const incidentsBySeverity = await Incident.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);

    // Weekly incidents (last 7 days)
    const weeklyData = await Incident.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalIncidents,
        pendingIncidents,
        activeSOS,
        resolvedIncidents,
        resolutionRate: totalIncidents > 0
          ? Math.round((resolvedIncidents / totalIncidents) * 100)
          : 0,
        today: { incidents: todayIncidents, users: todayUsers, sos: todaySOS },
        incidentsByType,
        incidentsBySeverity,
        weeklyData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (admin)
// @route   GET /api/admin/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.status(200).json({ success: true, total, users });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all incidents for moderation
// @route   GET /api/admin/incidents
exports.getAllIncidents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = status ? { status } : {};

    const total = await Incident.countDocuments(query);
    const incidents = await Incident.find(query)
      .populate('reportedBy', 'name phone email')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.status(200).json({ success: true, total, incidents });
  } catch (error) {
    next(error);
  }
};

// @desc    Moderate incident (verify/reject/resolve)
// @route   PUT /api/admin/incidents/:id/moderate
exports.moderateIncident = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const validStatuses = ['verified', 'rejected', 'resolved', 'investigating'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const update = {
      status,
      adminNotes,
      verifiedBy: req.user._id,
      verifiedAt: Date.now(),
    };

    if (status === 'resolved') update.resolvedAt = Date.now();

    const incident = await Incident.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('reportedBy', 'name');

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    // Notify reporter if verified
    if (status === 'verified') {
      const io = req.app.get('io');
      io.emit('incident_verified', {
        incidentId: incident._id,
        type: incident.type,
        location: incident.location.address,
      });
    }

    res.status(200).json({ success: true, message: `Incident ${status}`, incident });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active status
// @route   PUT /api/admin/users/:id/toggle
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active SOS
// @route   GET /api/admin/sos
exports.getAllSOS = async (req, res, next) => {
  try {
    const sos = await SOS.find()
      .populate('user', 'name phone email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, sos });
  } catch (error) {
    next(error);
  }
};