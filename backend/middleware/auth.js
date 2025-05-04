const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('Token extracted from authorization header');
    }

    // Check if token exists
    if (!token) {
      console.log('No token found in the request');
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token using JWT_SECRET directly from environment
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(`Token verified for user ID: ${decoded.id}, role: ${decoded.role}`);

      const user = await User.findById(decoded.id);
      
      if (!user) {
        console.log(`User not found for ID: ${decoded.id}`);
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Store user in request for use in other middleware
      req.user = user;
      console.log(`User attached to request: ${user.name}, role: ${user.role}`);
      next();
    } catch (err) {
      console.error('Token verification failed:', err.message);
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      } else if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (err) {
    console.error('Error in auth middleware:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.log('User object not found in request');
      return res.status(500).json({
        success: false,
        message: 'User not authenticated properly'
      });
    }
    
    console.log(`Checking role authorization: User role ${req.user.role}, Required roles: ${roles.join(', ')}`);
    
    if (!roles.includes(req.user.role)) {
      console.log(`Access denied: User role ${req.user.role} not in allowed roles`);
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    
    console.log('Role authorization successful');
    next();
  };
}; 