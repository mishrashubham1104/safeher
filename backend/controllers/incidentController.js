const Incident = require('../models/Incident');
const User = require('../models/User');

// @desc    Create incident report
// @route   POST /api/incidents
exports.createIncident = async (req, res, next) => {
  try {
    const {
      type, description, severity,
      longitude, latitude, address,
      area, city,
      isAnonymous, timeOfIncident,
      policeReported, policeReportNumber,
      tags,
    } = req.body;

    // ── Validate required fields ──────────────────────────────
    if (!type)        return res.status(400).json({ success: false, message: 'Incident type is required' });
    if (!description) return res.status(400).json({ success: false, message: 'Description is required' });
    if (!severity)    return res.status(400).json({ success: false, message: 'Severity is required' });

    // ── Parse coordinates safely ──────────────────────────────
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lng) || isNaN(lat)) {
      return res.status(400).json({
        success: false,
        message: 'Valid location coordinates are required. Please enable GPS and try again.',
      });
    }

    // ── Build incident data ───────────────────────────────────
    const incidentData = {
      type:        type.trim(),
      description: description.trim(),
      severity:    severity.trim(),
      location: {
        type:        'Point',
        coordinates: [lng, lat],
        address:     address ? address.trim() : 'Unknown location',
        area:        area   || '',
        city:        city   || '',
      },
      isAnonymous:        isAnonymous === 'true' || isAnonymous === true,
      reportedBy:         req.user._id,
      timeOfIncident:     timeOfIncident ? new Date(timeOfIncident) : new Date(),
      policeReported:     policeReported === 'true' || policeReported === true,
      policeReportNumber: policeReportNumber || '',
      tags: tags
        ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean))
        : [],
    };

    // ── Handle image uploads if present ──────────────────────
    if (req.files && req.files.length > 0) {
      incidentData.images = req.files.map(file => ({
        public_id: file.filename || file.public_id || '',
        url:       file.path     || file.secure_url || '',
      }));
    }

    const incident = await Incident.create(incidentData);

    // Update user's reported incidents list
    await User.findByIdAndUpdate(req.user._id, {
      $push: { reportedIncidents: incident._id },
    });

    // Emit real-time alert via Socket.io
    const io = req.app.get('io');
    if (io) {
      const populated = await Incident.findById(incident._id).populate('reportedBy', 'name');
      io.emit('new_incident', {
        incident: populated,
        message:  `New ${severity} incident reported: ${type} near ${incidentData.location.address}`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Incident reported successfully',
      incident,
    });
  } catch (error) {
    // Send validation errors clearly to frontend
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message: messages });
    }
    next(error);
  }
};

// @desc    Get all incidents (with filters)
// @route   GET /api/incidents
exports.getIncidents = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      severity,
      status = 'verified',
      longitude,
      latitude,
      radius = 10,
      startDate,
      endDate,
    } = req.query;

    const query = {};
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Geo query if coordinates provided
    if (longitude && latitude) {
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: parseFloat(radius) * 1000, // Convert km to meters
        },
      };
    }

    const total = await Incident.countDocuments(query);
    const incidents = await Incident.find(query)
      .populate('reportedBy', 'name avatar')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      incidents,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single incident
// @route   GET /api/incidents/:id
exports.getIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('reportedBy', 'name avatar')
      .populate('comments.user', 'name avatar')
      .populate('verifiedBy', 'name');

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    res.status(200).json({ success: true, incident });
  } catch (error) {
    next(error);
  }
};

// @desc    Get incidents for map (all verified)
// @route   GET /api/incidents/map
exports.getMapIncidents = async (req, res, next) => {
  try {
    const { longitude, latitude, radius = 50 } = req.query;

    let query = { status: 'verified' };

    if (longitude && latitude) {
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: parseFloat(radius) * 1000,
        },
      };
    }

    const incidents = await Incident.find(query)
      .select('type severity location status createdAt upvoteCount')
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json({ success: true, incidents });
  } catch (error) {
    next(error);
  }
};

// @desc    Upvote an incident
// @route   POST /api/incidents/:id/upvote
exports.upvoteIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    const alreadyVoted = incident.upvotes.includes(req.user._id);
    if (alreadyVoted) {
      incident.upvotes = incident.upvotes.filter(id => id.toString() !== req.user._id.toString());
      incident.upvoteCount = Math.max(0, incident.upvoteCount - 1);
    } else {
      incident.upvotes.push(req.user._id);
      incident.upvoteCount += 1;
    }

    await incident.save();

    res.status(200).json({
      success: true,
      upvoted: !alreadyVoted,
      upvoteCount: incident.upvoteCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add comment to incident
// @route   POST /api/incidents/:id/comment
exports.addComment = async (req, res, next) => {
  try {
    const { text, isAnonymous } = req.body;

    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    incident.comments.push({
      user: req.user._id,
      text,
      isAnonymous: isAnonymous || false,
    });

    await incident.save();

    const updated = await Incident.findById(req.params.id)
      .populate('comments.user', 'name avatar');

    res.status(201).json({ success: true, comments: updated.comments });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my incidents
// @route   GET /api/incidents/my
exports.getMyIncidents = async (req, res, next) => {
  try {
    const incidents = await Incident.find({ reportedBy: req.user._id })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, incidents });
  } catch (error) {
    next(error);
  }
};