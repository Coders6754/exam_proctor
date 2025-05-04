const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  startTime: {
    type: Date,
    required: [true, 'Please add start time']
  },
  endTime: {
    type: Date,
    required: [true, 'Please add end time']
  },
  duration: {
    type: Number,
    required: [true, 'Please add duration in minutes']
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  proctors: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  students: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  submissions: [{
    student: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    answers: {
      type: Object,
      required: true
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }]
});

module.exports = mongoose.model('Exam', ExamSchema); 