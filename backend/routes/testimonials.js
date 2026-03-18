const express = require('express');
const router  = express.Router();
const {
  createTestimonial,
  getTestimonials,
  getAllTestimonials,
  moderateTestimonial,
  deleteTestimonial,
} = require('../controllers/testimonialController');
const { protect, authorize } = require('../middleware/auth');

// Public
router.get('/', getTestimonials);

// Authenticated users
router.post('/', protect, createTestimonial);

// Admin only
router.get('/admin',         protect, authorize('admin', 'moderator'), getAllTestimonials);
router.put('/:id/moderate',  protect, authorize('admin', 'moderator'), moderateTestimonial);
router.delete('/:id',        protect, authorize('admin', 'moderator'), deleteTestimonial);

module.exports = router;