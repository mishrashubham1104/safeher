const express = require('express');
const router  = express.Router();
const {
  startLiveShare, updateLiveLocation, endLiveShare,
  getMyLiveSessions, getTrackSession,
} = require('../controllers/liveShareController');
const { protect } = require('../middleware/auth');

router.post('/start',              protect, startLiveShare);
router.put ('/:id/update',         protect, updateLiveLocation);
router.put ('/:id/end',            protect, endLiveShare);
router.get ('/my-sessions',        protect, getMyLiveSessions);
router.get ('/track/:token',               getTrackSession);   // public

module.exports = router;