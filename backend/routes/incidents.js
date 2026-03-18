const express = require('express');
const router = express.Router();
const {
  createIncident, getIncidents, getIncident,
  getMapIncidents, upvoteIncident, addComment, getMyIncidents,
} = require('../controllers/incidentController');
const { protect } = require('../middleware/auth');

router.route('/').get(getIncidents).post(protect, createIncident);
router.get('/map', getMapIncidents);
router.get('/my', protect, getMyIncidents);
router.route('/:id').get(getIncident);
router.post('/:id/upvote', protect, upvoteIncident);
router.post('/:id/comment', protect, addComment);

module.exports = router;
