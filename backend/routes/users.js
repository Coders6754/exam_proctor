const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/users
// @desc    Get all users
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('GET /api/users - Fetching all users');
    console.log('User making request:', {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role
    });
    
    // Get all users
    const users = await User.find().select('-password');
    
    console.log(`Found ${users.length} users`);
    
    // Return success response
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    console.error('Error in GET /api/users:', err.message);
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: ' + err.message
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
});

// @route   GET /api/users/proctors
// @desc    Get all proctors
// @access  Private/Admin
router.get('/proctors', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('GET /api/users/proctors - Fetching all proctors');
    
    const proctors = await User.find({ role: 'proctor' }).select('-password');
    
    console.log(`Found ${proctors.length} proctors`);
    
    res.status(200).json({
      success: true,
      count: proctors.length,
      data: proctors
    });
  } catch (err) {
    console.error('Error in GET /api/users/proctors:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/users/students
// @desc    Get all students
// @access  Private/Admin
router.get('/students', protect, authorize('admin', 'proctor'), async (req, res) => {
  try {
    console.log('GET /api/users/students - Fetching all students');
    console.log('User role:', req.user.role);
    
    const students = await User.find({ role: 'student' }).select('-password');
    
    console.log(`Found ${students.length} students`);
    
    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (err) {
    console.error('Error in GET /api/users/students:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private/Admin
router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get fields to update
    const { name, email, role } = req.body;
    const fieldsToUpdate = {};

    if (name) fieldsToUpdate.name = name;
    if (email) fieldsToUpdate.email = email;
    if (role) fieldsToUpdate.role = role;

    user = await User.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 