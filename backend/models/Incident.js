const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.ObjectId,
    ref: 'Exam',
    required: true
  },
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['no_face_visible', 'multiple_faces', 'looking_away', 'unusual_movement', 'other'],
    required: true
  },
  description: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolutionNotes: {
    type: String
  }
});

module.exports = mongoose.model('Incident', IncidentSchema); 