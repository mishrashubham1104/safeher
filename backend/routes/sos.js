// backend/routes/sos.js
const express = require('express');
const router = express.Router();
const { triggerSOS, updateSOSLocation, cancelSOS, getSOSHistory, getActiveSOS } = require('../controllers/sosController');
const { protect, authorize } = require('../middleware/auth');

router.post('/trigger', protect, triggerSOS);
router.put('/:id/location', protect, updateSOSLocation);
router.put('/:id/cancel', protect, cancelSOS);
router.get('/history', protect, getSOSHistory);
router.get('/active', protect, authorize('admin', 'moderator'), getActiveSOS);

module.exports = router;
