const express = require('express');
const router  = express.Router();
const {
  registerVolunteer,
  getMyProfile,
  updateLocation,
  getNearbyAlerts,
  respondToAlert,
  updateResponseStatus,
  getActiveAlert,
  getAllVolunteers,
  verifyVolunteer,
  getAllAlerts,
} = require('../controllers/volunteerController');
const { protect, authorize } = require('../middleware/auth');

const adminOnly = [protect, authorize('admin', 'moderator')];

// ── Volunteer routes (authenticated users) ────────────────────
router.post('/register',                  protect, registerVolunteer);
router.get ('/me',                        protect, getMyProfile);
router.put ('/location',                  protect, updateLocation);
router.get ('/alerts',                    protect, getNearbyAlerts);
router.put ('/alerts/:alertId/respond',   protect, respondToAlert);
router.put ('/alerts/:alertId/status',    protect, updateResponseStatus);
router.get ('/active-alert',              protect, getActiveAlert);

// ── Admin routes ──────────────────────────────────────────────
router.get ('/admin/all',                ...adminOnly, getAllVolunteers);
router.put ('/admin/:id/verify',         ...adminOnly, verifyVolunteer);
router.get ('/admin/alerts',             ...adminOnly, getAllAlerts);

module.exports = router;