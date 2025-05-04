const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const Incident = require('../models/Incident');
const { protect, authorize } = require('../middleware/auth');
const mongoose = require('mongoose');

// @route   POST /api/exams
// @desc    Create a new exam
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('POST /api/exams - Creating new exam');
    const { title, description, startTime, endTime, duration, proctors, students } = req.body;
    
    // Basic validation
    if (!title || !description || !startTime || !endTime || !duration) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields: title, description, startTime, endTime, duration' 
      });
    }
    
    // Validate that proctors is an array
    if (proctors && !Array.isArray(proctors)) {
      return res.status(400).json({
        success: false,
        message: 'Proctors field must be an array'
      });
    }
    
    // Validate that students is an array
    if (students && !Array.isArray(students)) {
      return res.status(400).json({
        success: false,
        message: 'Students field must be an array'
      });
    }
    
    console.log('Creating exam with:', {
      title,
      startTime,
      endTime,
      duration,
      proctors: proctors ? proctors.length : 0,
      students: students ? students.length : 0
    });

    const exam = await Exam.create({
      title,
      description,
      startTime,
      endTime,
      duration,
      proctors: proctors || [],
      students: students || [],
      createdBy: req.user.id
    });

    console.log(`Exam created successfully with ID: ${exam._id}`);

    res.status(201).json({
      success: true,
      data: exam
    });
  } catch (err) {
    console.error('Error creating exam:', err.message);
    if (err.name === 'ValidationError') {
      // Mongoose validation error
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/exams
// @desc    Get all exams
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };
    console.log('User requesting exams:', {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role
    });

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    // If user is a student, show only exams they are registered for
    if (req.user.role === 'student') {
      console.log('Filtering exams for student:', req.user.id);
      reqQuery.students = req.user.id;
    }

    // If user is a proctor, show only exams they are assigned to
    if (req.user.role === 'proctor') {
      console.log('Filtering exams for proctor:', req.user.id);
      reqQuery.proctors = req.user.id;
    }

    // Create query string
    let queryStr = JSON.stringify(reqQuery);
    console.log('Query string for exam filtering:', queryStr);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    query = Exam.find(JSON.parse(queryStr));

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25; // Increase default limit to show more exams
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Exam.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Populate student data for all roles to ensure proper display 
    query = query.populate({
      path: 'students',
      select: 'name email _id'
    });

    query = query.populate({
      path: 'proctors',
      select: 'name email _id'
    });

    // Add createdBy population for all roles
    query = query.populate({
      path: 'createdBy',
      select: 'name email'
    });

    // Executing query
    const exams = await query;
    console.log(`Found ${exams.length} exams for ${req.user.role} with ID ${req.user.id}`);
    
    // Log some details about the exams found for students
    if (req.user.role === 'student' && exams.length === 0) {
      const allExams = await Exam.find();
      console.log('Total exams in system:', allExams.length);
      
      // Check if student appears in any exam's student list
      const examsWithStudentMentioned = allExams.filter(exam => 
        exam.students && exam.students.some(studentId => 
          studentId.toString() === req.user.id
        )
      );
      
      console.log(`Found ${examsWithStudentMentioned.length} exams that mention this student ID`);
      if (examsWithStudentMentioned.length > 0) {
        console.log('Exam IDs that should be accessible:', examsWithStudentMentioned.map(e => e._id));
        console.log('Exam titles that should be accessible:', examsWithStudentMentioned.map(e => e.title));
        console.log('Exam statuses:', examsWithStudentMentioned.map(e => e.status));
      }
    }
    
    // For each exam, update the status if necessary based on time
    const now = new Date();
    for (const exam of exams) {
      const examStartTime = new Date(exam.startTime);
      const examEndTime = new Date(exam.endTime);
      
      // If exam is scheduled but should be in progress based on time, update status in response
      if (exam.status === 'scheduled' && now >= examStartTime && now <= examEndTime) {
        console.log(`Exam ${exam._id} (${exam.title}) is in progress by time but status is ${exam.status}`);
        exam._doc.isActiveByTime = true;
      }
    }

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: exams.length,
      pagination,
      data: exams
    });
  } catch (err) {
    console.error('Error fetching exams:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/exams/:id
// @desc    Get single exam
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    console.log(`Fetching exam with ID: ${req.params.id}`);
    
    // Fully populate student and proctor data
    const exam = await Exam.findById(req.params.id)
      .populate({
        path: 'proctors',
        select: 'name email _id role'
      })
      .populate({
        path: 'students',
        select: 'name email _id role'
      })
      .populate({
        path: 'createdBy',
        select: 'name email'
      });

    if (!exam) {
      console.log(`Exam with ID ${req.params.id} not found`);
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    console.log(`Found exam: ${exam.title}`);
    console.log(`Students count: ${exam.students.length}`);
    console.log(`Proctors count: ${exam.proctors.length}`);

    // Make sure user has access to the exam
    if (req.user.role === 'student' && !exam.students.some(student => student._id.toString() === req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this exam' });
    }

    if (req.user.role === 'proctor' && !exam.proctors.some(proctor => proctor._id.toString() === req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this exam' });
    }

    // Return cleaned up response with all necessary data
    res.status(200).json({
      success: true,
      data: exam
    });
  } catch (err) {
    console.error(`Error fetching exam: ${err.message}`);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/exams/:id
// @desc    Update exam
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    let exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    exam = await Exam.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: exam
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/exams/:id
// @desc    Delete exam
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    await exam.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/exams/:id/register
// @desc    Register students for an exam
// @access  Private/Admin
router.post('/:id/register', protect, authorize('admin'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const { students } = req.body;

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ success: false, message: 'Please provide an array of student IDs' });
    }

    // Add students to exam
    exam.students = [...new Set([...exam.students.map(id => id.toString()), ...students])];

    await exam.save();

    res.status(200).json({
      success: true,
      data: exam
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/exams/:id/assign-proctors
// @desc    Assign proctors to an exam
// @access  Private/Admin
router.post('/:id/assign-proctors', protect, authorize('admin'), async (req, res) => {
  try {
    console.log(`Attempting to assign proctors to exam ID: ${req.params.id}`);
    
    // Validate exam ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error('Invalid exam ID format');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid exam ID format' 
      });
    }
    
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      console.error(`Exam with ID ${req.params.id} not found`);
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const { proctors } = req.body;

    if (!proctors || !Array.isArray(proctors)) {
      console.error('Invalid proctors array provided:', proctors);
      return res.status(400).json({ success: false, message: 'Please provide an array of proctor IDs' });
    }

    console.log('Current exam proctors:', exam.proctors);
    console.log('Proctors to add:', proctors);

    // Validate all proctor IDs are valid MongoDB ObjectIDs
    const invalidProctorIds = proctors.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidProctorIds.length > 0) {
      console.error('Invalid proctor IDs found:', invalidProctorIds);
      return res.status(400).json({ 
        success: false, 
        message: 'Some proctor IDs are invalid' 
      });
    }

    // Add proctors to exam - convert all IDs to strings to avoid type mismatch
    const currentProctorIds = exam.proctors.map(id => id.toString());
    const newProctorIds = proctors.map(id => id.toString());
    const uniqueProctorIds = [...new Set([...currentProctorIds, ...newProctorIds])];
    
    console.log('Unique proctor IDs to save:', uniqueProctorIds);
    
    // Convert back to ObjectId (Mongoose will handle this)
    exam.proctors = uniqueProctorIds;

    // Save the exam with new proctors
    const savedExam = await exam.save();
    console.log('Exam saved successfully with proctor IDs:', savedExam.proctors);

    // Populate proctor details for response
    const populatedExam = await Exam.findById(req.params.id).populate({
      path: 'proctors',
      select: 'name email _id role'
    });

    console.log('Populated exam proctors:', populatedExam.proctors.map(p => ({ 
      id: p._id, 
      name: p.name,
      role: p.role
    })));

    res.status(200).json({
      success: true,
      data: populatedExam
    });
  } catch (err) {
    console.error('Error assigning proctors:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Exam or proctor not found' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/exams/:id/incidents
// @desc    Report an incident during an exam
// @access  Private/Proctor
router.post('/:id/incidents', protect, authorize('proctor'), async (req, res) => {
  try {
    console.log('Received incident report:', req.body);
    console.log('User ID reporting incident:', req.user.id);
    console.log('Exam ID:', req.params.id);
    
    // Validate the exam ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid exam ID format' 
      });
    }
    
    // Find the exam
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      console.log(`Exam with ID ${req.params.id} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Exam not found' 
      });
    }

    // Extract and validate required fields
    const { student, type, description } = req.body;

    if (!student) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a student ID' 
      });
    }

    if (!type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an incident type' 
      });
    }

    // Validate the student ID
    if (!mongoose.Types.ObjectId.isValid(student)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid student ID format' 
      });
    }

    // Create the incident
    try {
      const incident = await Incident.create({
        exam: req.params.id,
        student,
        reportedBy: req.user.id,
        type,
        description: description || ''
      });

      console.log('Incident created successfully:', incident);

      return res.status(201).json({
        success: true,
        data: incident
      });
    } catch (createError) {
      console.error('Error creating incident:', createError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error creating incident',
        error: createError.message 
      });
    }
  } catch (err) {
    console.error('Error in incident reporting route:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Exam or student not found' 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    });
  }
});

// @route   GET /api/exams/:id/incidents
// @desc    Get all incidents for an exam
// @access  Private/Proctor & Admin
router.get('/:id/incidents', protect, authorize('proctor', 'admin'), async (req, res) => {
  try {
    const incidents = await Incident.find({ exam: req.params.id })
      .populate({
        path: 'student',
        select: 'name email'
      })
      .populate({
        path: 'reportedBy',
        select: 'name email'
      });

    res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/exams/:id/submit
// @desc    Submit exam answers
// @access  Private/Student
router.post('/:id/submit', protect, authorize('student'), async (req, res) => {
  try {
    // Check if exam exists
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Validate that the student is registered for this exam
    const isRegistered = exam.students.some(
      studentId => studentId.toString() === req.user.id
    );

    if (!isRegistered) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not registered for this exam' 
      });
    }

    // Get answers from request body
    const { answers } = req.body;

    if (!answers) {
      return res.status(400).json({ 
        success: false, 
        message: 'No answers provided' 
      });
    }

    // Store the submission in the database
    // This could be expanded to include more detailed submission data
    const submission = {
      student: req.user.id,
      answers,
      submittedAt: Date.now()
    };

    // Store the submission with the exam
    // Assuming there's a submissions field in the Exam model
    // If not, this would need to be modified based on your data model
    if (!exam.submissions) {
      exam.submissions = [];
    }

    // Check if student has already submitted
    const existingSubmissionIndex = exam.submissions.findIndex(
      sub => sub.student.toString() === req.user.id
    );

    if (existingSubmissionIndex >= 0) {
      // Update existing submission
      exam.submissions[existingSubmissionIndex] = submission;
    } else {
      // Add new submission
      exam.submissions.push(submission);
    }

    await exam.save();

    res.status(200).json({
      success: true,
      message: 'Exam submitted successfully',
      data: { submittedAt: submission.submittedAt }
    });
  } catch (err) {
    console.error('Error submitting exam:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/exams/:id/status
// @desc    Update exam status
// @access  Private/Admin
router.patch('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    console.log(`Updating exam status for exam ID: ${req.params.id}`);
    console.log('Request body:', req.body);
    
    // Validate the status
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, message: 'Please provide a status' });
    }
    
    // Make sure the status is valid
    const validStatuses = ['scheduled', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    // Find the exam
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    
    // Update the status
    exam.status = status;
    await exam.save();
    
    // Return the updated exam
    res.status(200).json({
      success: true,
      message: `Exam status updated to ${status}`,
      data: exam
    });
  } catch (err) {
    console.error('Error updating exam status:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error updating exam status',
      error: err.message
    });
  }
});

module.exports = router; 