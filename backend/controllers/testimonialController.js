const Testimonial = require('../models/Testimonial');
const User = require('../models/User');

// @desc    Submit a testimonial
// @route   POST /api/testimonials
exports.createTestimonial = async (req, res, next) => {
  try {
    const { text, rating, location, isAnonymous } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Please write your testimonial' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }
    if (!location || !location.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your location (e.g. Mumbai, Maharashtra)' });
    }

    // Check if user already submitted one
    const existing = await Testimonial.findOne({ user: req.user._id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a testimonial. Thank you! 💗',
      });
    }

    const testimonial = await Testimonial.create({
      user:        req.user._id,
      name:        isAnonymous ? 'Anonymous' : req.user.name,
      location:    location.trim(),
      text:        text.trim(),
      rating:      parseInt(rating),
      avatar:      req.user.avatar?.url || '',
      isAnonymous: isAnonymous === true || isAnonymous === 'true',
      status:      'approved', // auto-approved — no admin review needed
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for your testimonial! It is now live on the page. 💗',
      testimonial,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all approved testimonials (public)
// @route   GET /api/testimonials
exports.getTestimonials = async (req, res, next) => {
  try {
    const testimonials = await Testimonial.find({ status: 'approved' })
      .select('name location text rating avatar createdAt isAnonymous')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ success: true, testimonials });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ALL testimonials — admin only
// @route   GET /api/testimonials/admin
exports.getAllTestimonials = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const testimonials = await Testimonial.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, testimonials });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve / reject testimonial — admin only
// @route   PUT /api/testimonials/:id/moderate
exports.moderateTestimonial = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!testimonial) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }

    res.status(200).json({
      success: true,
      message: `Testimonial ${status}`,
      testimonial,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete testimonial — admin only
// @route   DELETE /api/testimonials/:id
exports.deleteTestimonial = async (req, res, next) => {
  try {
    await Testimonial.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Testimonial deleted' });
  } catch (error) {
    next(error);
  }
};