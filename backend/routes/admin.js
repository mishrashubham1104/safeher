const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getAllUsers, getAllIncidents,
  moderateIncident, toggleUserStatus, getAllSOS,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const adminOnly = [protect, authorize('admin', 'moderator')];

// ── DEBUG route — test if admin auth works ──────────────────
// Visit: GET /api/admin/debug (with Bearer token)
router.get('/debug', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    user: {
      id:    req.user._id,
      name:  req.user.name,
      email: req.user.email,
      role:  req.user.role,
    },
  });
});

router.get('/stats',                   ...adminOnly, getDashboardStats);
router.get('/users',                   ...adminOnly, getAllUsers);
router.put('/users/:id/toggle',        ...adminOnly, toggleUserStatus);
router.get('/incidents',               ...adminOnly, getAllIncidents);
router.put('/incidents/:id/moderate',  ...adminOnly, moderateIncident);
router.get('/sos',                     ...adminOnly, getAllSOS);

module.exports = router;