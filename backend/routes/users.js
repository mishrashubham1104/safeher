const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// @desc    Get user profile by ID
router.get('/:id', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -resetPasswordToken -resetPasswordExpire');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// @desc    Get nearby users sharing location
router.get('/nearby/users', protect, async (req, res, next) => {
  try {
    const { longitude, latitude, radius = 5 } = req.query;
    const users = await User.find({
      _id: { $ne: req.user._id },
      'preferences.shareLocation': true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: parseFloat(radius) * 1000,
        },
      },
    }).select('name location.coordinates location.lastUpdated');
    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
