const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    console.log(`🔐 Authorize check — user role: "${req.user.role}", required: [${roles.join(', ')}]`);
    if (!roles.includes(req.user.role)) {
      console.log(`❌ Access denied for role: ${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized. Required: ${roles.join(' or ')}`,
      });
    }
    console.log(`✅ Access granted for role: ${req.user.role}`);
    next();
  };
};