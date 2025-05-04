const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables
dotenv.config();

// Define a consistent JWT secret
process.env.JWT_SECRET = process.env.JWT_SECRET || 'exam_invigilation_secret_key';

// Check if environment variables are loaded
console.log('=== Environment Variables ===');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Defined' : 'Undefined');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Defined' : 'Undefined');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    transports: ['polling', 'websocket'],
    pingTimeout: 30000,
    pingInterval: 10000,
    allowUpgrades: true,
    upgradeTimeout: 10000,
    maxHttpBufferSize: 1e8,
    connectTimeout: 30000
});

// Bypass JWT token verification for socket connections
io.use((socket, next) => {
    console.log(`New socket connection request: ${socket.id}`);
    // Skip token validation and let all socket connections through
    next();
});

// Add specific debug handler to log all connection events
const logSocketEvents = (socket) => {
    const originalEmit = socket.emit;
    socket.emit = function() {
        console.log(`[SOCKET:${socket.id}] EMIT: ${arguments[0]}`);
        originalEmit.apply(socket, arguments);
    };
    
    // Log all events
    const events = [
        'error', 'connect', 'disconnect', 'connect_error', 'reconnect', 
        'reconnect_attempt', 'reconnect_error', 'reconnect_failed'
    ];
    
    events.forEach(event => {
        socket.on(event, (...args) => {
            console.log(`[SOCKET:${socket.id}] ${event.toUpperCase()}: `, args.length ? args : '');
        });
    });
};

// Debug utility to get room members by type
const getRoomMembers = (io, roomId) => {
    try {
        const room = io.sockets.adapter.rooms.get(roomId);
        if (!room) return { total: 0, proctors: [], students: [] };

        const allSocketIds = Array.from(room);
        const proctors = [];
        const students = [];

        allSocketIds.forEach(socketId => {
            const socket = io.sockets.sockets.get(socketId);
            if (socket && socket.socketMetadata) {
                if (socket.socketMetadata.type === 'proctor') {
                    proctors.push({
                        socketId,
                        examId: socket.socketMetadata.examId
                    });
                } else if (socket.socketMetadata.type === 'student') {
                    students.push({
                        socketId,
                        studentId: socket.socketMetadata.userId,
                        examId: socket.socketMetadata.examId
                    });
                }
            }
        });

        return {
            total: allSocketIds.length,
            proctors,
            students
        };
    } catch (err) {
        console.error('Error getting room members:', err);
        return { total: 0, proctors: [], students: [] };
    }
};

// Import Exam model for automated scheduling
const Exam = require('./models/Exam');

// Function to automatically check and update exam statuses
const checkExamSchedules = async () => {
    try {
        console.log('Checking exam schedules...');
        const now = new Date();

        // Find exams that should start now (scheduled and start time passed)
        const examsToStart = await Exam.find({
            status: 'scheduled',
            startTime: { $lte: now },
            endTime: { $gt: now }
        });

        console.log(`Found ${examsToStart.length} exams that should start now`);

        // Update each exam status to 'in-progress'
        for (const exam of examsToStart) {
            console.log(`Starting exam: ${exam.title} (${exam._id})`);

            // Update status
            exam.status = 'in-progress';
            await exam.save();

            // Notify all connected users in this exam
            io.to(exam._id.toString()).emit('exam-started', {
                examId: exam._id.toString(),
                title: exam.title,
                message: `The exam "${exam.title}" has started!`,
                timestamp: new Date().toISOString()
            });

            console.log(`Exam ${exam._id} started successfully`);
        }

        // Find exams that should end now (in-progress and end time passed)
        const examsToEnd = await Exam.find({
            status: 'in-progress',
            endTime: { $lte: now }
        });

        console.log(`Found ${examsToEnd.length} exams that should end now`);

        // Update each exam status to 'completed'
        for (const exam of examsToEnd) {
            console.log(`Ending exam: ${exam.title} (${exam._id})`);

            // Update status
            exam.status = 'completed';
            await exam.save();

            // Notify all connected users in this exam
            io.to(exam._id.toString()).emit('exam-ended', {
                examId: exam._id.toString(),
                title: exam.title,
                message: `The exam "${exam.title}" has ended!`,
                timestamp: new Date().toISOString()
            });

            console.log(`Exam ${exam._id} ended successfully`);
        }
    } catch (error) {
        console.error('Error checking exam schedules:', error);
    }
};

// Run the check every minute
setInterval(checkExamSchedules, 60000);
// Also run it at startup
checkExamSchedules();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

// Database connection
const connectToDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exam-invigilation', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000, // 30 seconds
            connectTimeoutMS: 30000 // 30 seconds
        });
        console.log('MongoDB connected successfully');

        // Initialize DB by checking if we have any users
        try {
            const User = require('./models/User');
            const userCount = await User.countDocuments();
            console.log(`Database contains ${userCount} users`);
        } catch (err) {
            console.error('Error checking user count:', err);
        }
    } catch (err) {
        console.error('MongoDB connection error:', err);
        console.log('Retrying connection in 5 seconds...');
        setTimeout(connectToDB, 5000);
    }
};

connectToDB();

// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error after initial connection:', err);
    // Only attempt to reconnect if we're not already connecting
    if (mongoose.connection.readyState === 0) {
        console.log('Attempting to reconnect to MongoDB in 5 seconds...');
        setTimeout(connectToDB, 5000);
    }
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
    // Only attempt to reconnect if we're not already connecting
    if (mongoose.connection.readyState === 0) {
        console.log('Attempting to reconnect to MongoDB in 5 seconds...');
        setTimeout(connectToDB, 5000);
    }
});

mongoose.connection.on('connected', () => {
    console.log('MongoDB reconnected successfully');

    // Log database status after reconnection
    try {
        const databases = mongoose.connections.map(conn => conn.name).join(', ');
        console.log(`Connected to database(s): ${databases}`);
    } catch (err) {
        console.error('Error logging database status:', err);
    }
});

// Socket.io connection handler with improved error handling
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);
    logSocketEvents(socket);
    
    // Add immediately accessible diagnostic endpoint that doesn't require any auth or complex logic
    socket.on('ping', (callback) => {
        console.log(`Received ping from ${socket.id}`);
        if (typeof callback === 'function') {
            callback({
                status: 'ok',
                socketId: socket.id,
                timestamp: new Date().toISOString()
            });
        } else {
            // If no callback, send a direct event
            socket.emit('pong', {
                status: 'ok',
                socketId: socket.id,
                timestamp: new Date().toISOString()
            });
        }
    });

    // Initialize socket metadata
    socket.socketMetadata = {
        type: null,
        examId: null,
        userId: null
    };

    // Listen for proctor joining an exam - simplify parameter handling
    socket.on('proctor-join', (data) => {
        let examId;
        
        // Handle both object and string formats
        if (typeof data === 'object' && data !== null) {
            examId = data.examId;
        } else {
            examId = data; // Direct string
        }
        
        if (!examId) {
            console.error('Invalid proctor join data:', data);
            return;
        }

        // Convert to string for consistency
        const examIdStr = String(examId);
        console.log(`Proctor ${socket.id} joined exam ${examIdStr}`);

        // Update socket metadata
        socket.socketMetadata = {
            type: 'proctor',
            examId: examIdStr,
            userId: null
        };

        // Join the exam room
        socket.join(examIdStr);

        // Notify all clients in the room that proctor joined
        socket.to(examIdStr).emit('proctor-connected', {
            socketId: socket.id,
            timestamp: new Date().toISOString()
        });

        // Also notify students about proctor status
        io.to(examIdStr).emit('proctor-status-update', {
            examId: examIdStr,
            connected: true,
            proctorId: socket.id,
            timestamp: new Date().toISOString()
        });

        console.log(`Room ${examIdStr} now has proctor ${socket.id}`);
        
        // Acknowledge join
        socket.emit('proctor-join-ack', {
            success: true,
            examId: examIdStr,
            socketId: socket.id
        });
    });

    // Handle student joining an exam room
    socket.on('student-join', ({ examId, studentId }) => {
        if (!examId || !studentId) {
            console.error('Invalid student-join data:', { examId, studentId });
            return;
        }

        // Convert IDs to strings for consistency
        const studentIdStr = String(studentId);
        const examIdStr = String(examId);
        const timestamp = new Date().toISOString();

        console.log(`Student ${studentIdStr} joining exam: ${examIdStr} with socket ${socket.id}`);

        // Join the exam room
        socket.join(examIdStr);

        // Update socket metadata
        socket.socketMetadata = {
            type: 'student',
            examId: examIdStr,
            userId: studentIdStr
        };

        console.log(`Student ${studentIdStr} joined exam: ${examIdStr} with socket ${socket.id} at ${new Date(timestamp).toLocaleTimeString()}`);

        // First broadcast a "connected" event which indicates a new connection (not just a heartbeat)
        socket.to(examIdStr).emit('student-connected', {
            studentId: studentIdStr,
            socketId: socket.id,
            timestamp,
            reconnection: true
        });

        // Then also send a standard online status update which the ProctorExam component uses for tracking
        socket.to(examIdStr).emit('student-online', {
            studentId: studentIdStr,
            socketId: socket.id,
            timestamp
        });

        // Check and log how many proctors are in the room to help with debugging
        try {
            const room = io.sockets.adapter.rooms.get(examIdStr);
            const roomSize = room ? room.size : 0;
            console.log(`Room ${examIdStr} has ${roomSize} total connections`);

            // Count and log connected proctors
            let proctorCount = 0;
            for (const [id, socket] of io.sockets.sockets.entries()) {
                if (socket.socketMetadata &&
                    socket.socketMetadata.type === 'proctor' &&
                    socket.socketMetadata.examId === examIdStr) {
                    proctorCount++;
                }
            }
            console.log(`Room ${examIdStr} has ${proctorCount} proctor(s) to receive student connection events`);
        } catch (err) {
            console.error('Error counting users in room:', err);
        }
    });

    // Handle video stream
    socket.on('student-video', (data) => {
        // Convert IDs to strings for consistency
        const studentIdStr = String(data.studentId);
        const examIdStr = String(data.examId);

        socket.to(examIdStr).emit('student-video-update', {
            studentId: studentIdStr,
            videoData: data.videoData,
            timestamp: new Date().toISOString()
        });
    });

    // Handle ID verification request
    socket.on('request-id-verification', ({ studentId, examId }) => {
        // Validate input parameters
        if (!studentId || !examId) {
            console.error(`Invalid verification request parameters: studentId=${studentId}, examId=${examId}`);
            socket.emit('verification-request-sent', {
                studentId: studentId || 'unknown',
                examId: examId || 'unknown',
                timestamp: new Date().toISOString(),
                success: false,
                error: 'Missing required parameters'
            });
            return;
        }

        try {
            // Convert IDs to strings for consistency
            const studentIdStr = String(studentId);
            const examIdStr = String(examId);

            console.log(`Proctor ${socket.id} requested ID verification for student ${studentIdStr} in exam ${examIdStr}`);

            // Keep track of verification requests
            const timestamp = new Date().toISOString();

            // Send request to all clients in the exam room (will be filtered by studentId on client side)
            socket.to(examIdStr).emit('verify-id', {
                studentId: studentIdStr,
                requestedBy: socket.id,
                timestamp
            });

            // Acknowledge receipt to the proctor
            socket.emit('verification-request-sent', {
                studentId: studentIdStr,
                examId: examIdStr,
                timestamp,
                success: true
            });

            console.log(`ID verification request emitted for student ${studentIdStr}`);
        } catch (error) {
            console.error(`Error processing verification request:`, error);
            socket.emit('verification-request-sent', {
                studentId: String(studentId || 'unknown'),
                examId: String(examId || 'unknown'),
                timestamp: new Date().toISOString(),
                success: false,
                error: error.message || 'Unknown error'
            });
        }
    });

    // Handle ID verification response
    socket.on('id-verification-response', ({ studentId, examId, verified }) => {
        // Convert IDs to strings for consistency
        const studentIdStr = String(studentId);
        const examIdStr = String(examId);

        console.log(`Received ID verification response from student ${studentIdStr}: ${verified ? 'Verified' : 'Not Verified'}`);

        // Send verification result to all proctors in the room
        socket.to(examIdStr).emit('id-verification-result', {
            studentId: studentIdStr,
            verified,
            timestamp: new Date().toISOString(),
            verifiedBy: socket.id
        });

        // Acknowledge receipt to the student
        socket.emit('verification-response-received', {
            success: true,
            verified
        });
    });

    // Handle suspicious activity
    socket.on('report-suspicious-activity', (data) => {
        console.log('Received suspicious activity report:', data);

        // Validate input parameters
        if (!data.studentId || !data.examId || !data.type) {
            console.error('Invalid suspicious activity report:', data);
            return;
        }

        try {
            // Convert IDs to strings for consistency
            const studentIdStr = String(data.studentId);
            const examIdStr = String(data.examId);
            const timestamp = data.timestamp || new Date().toISOString();

            // Get incident description
            const description = data.description || getIncidentTypeDescription(data.type);

            // Emit to all clients in the exam room (will be filtered on the client side)
            socket.to(examIdStr).emit('suspicious-activity', {
                studentId: studentIdStr,
                type: data.type,
                description,
                timestamp,
                reportedBy: socket.id
            });

            console.log(`Suspicious activity (${data.type}) reported for student ${studentIdStr} in exam ${examIdStr}`);

            // Acknowledge receipt to the proctor
            socket.emit('incident-report-sent', {
                studentId: studentIdStr,
                examId: examIdStr,
                type: data.type,
                timestamp,
                success: true
            });
        } catch (error) {
            console.error('Error processing suspicious activity report:', error);
            socket.emit('incident-report-sent', {
                success: false,
                error: error.message || 'Unknown error'
            });
        }
    });

    // Helper function to get descriptive incident labels
    function getIncidentTypeDescription(type) {
        const descriptions = {
            'no_face_visible': 'No face visible in camera',
            'multiple_faces': 'Multiple faces detected',
            'looking_away': 'Looking away from screen',
            'unusual_movement': 'Unusual movement detected',
            'other': 'Suspicious activity detected'
        };

        return descriptions[type] || 'Suspicious activity detected';
    }

    // Handle socket disconnection
    socket.on('disconnect', (reason) => {
        const metadata = socket.socketMetadata;
        console.log(`Socket ${socket.id} disconnected. Reason: ${reason}`);

        if (metadata && metadata.type === 'student' && metadata.examId && metadata.userId) {
            console.log(`Student ${metadata.userId} disconnected from exam ${metadata.examId}`);

            // Notify proctors about student disconnection
            socket.to(metadata.examId).emit('student-disconnected', {
                studentId: metadata.userId,
                socketId: socket.id,
                reason,
                timestamp: new Date().toISOString()
            });
        } else if (metadata && metadata.type === 'proctor' && metadata.examId) {
            console.log(`Proctor disconnected from exam ${metadata.examId}`);
        }
    });

    // Handle socket errors
    socket.on('error', (err) => {
        console.error(`Socket ${socket.id} error:`, err);
    });

    // Handle student status update (heartbeat)
    socket.on('student-heartbeat', ({ examId, studentId }) => {
        if (!examId || !studentId) {
            console.error('Invalid heartbeat data:', { examId, studentId });
            return;
        }

        // Convert IDs to strings for consistency
        const studentIdStr = String(studentId);
        const examIdStr = String(examId);
        const timestamp = new Date().toISOString();

        // Update socket metadata if needed
        if (socket.socketMetadata.type !== 'student' || socket.socketMetadata.userId !== studentIdStr) {
            console.log(`Updating socket metadata for ${socket.id} - setting as student ${studentIdStr} in exam ${examIdStr}`);
            socket.socketMetadata = {
                type: 'student',
                examId: examIdStr,
                userId: studentIdStr
            };

            // Since metadata changed, make sure we join the correct room
            socket.join(examIdStr);
        }

        // Send online status to all proctors in the exam room
        socket.to(examIdStr).emit('student-online', {
            studentId: studentIdStr,
            socketId: socket.id,
            timestamp
        });

        // Also emit to individual proctors to ensure they get the update
        const proctorSockets = Object.keys(io.sockets.adapter.rooms.get(examIdStr) || {})
            .filter(id => id !== socket.id);

        if (proctorSockets.length > 0) {
            console.log(`Broadcasting student ${studentIdStr} online status to ${proctorSockets.length} proctors`);
        } else {
            console.log(`No proctors found in room ${examIdStr} to receive student ${studentIdStr} heartbeat`);
        }

        console.log(`Heartbeat received from student ${studentIdStr} in exam: ${examIdStr} at ${new Date(timestamp).toLocaleTimeString()}`);
    });

    // Handle exam submission
    socket.on('student-submit-exam', ({ examId, studentId }) => {
        // Convert IDs to strings for consistency
        const studentIdStr = String(studentId);
        const examIdStr = String(examId);
        const timestamp = new Date().toISOString();

        console.log(`Student ${studentIdStr} has submitted exam: ${examIdStr} at ${timestamp}`);

        // Notify all proctors in the exam room about the submission
        socket.to(examIdStr).emit('student-submitted-exam', {
            studentId: studentIdStr,
            examId: examIdStr,
            timestamp
        });

        // Also acknowledge receipt to the student
        socket.emit('exam-submission-received', {
            success: true,
            timestamp
        });
    });

    // New handler for connection status requests
    socket.on('request-connection-status', ({ examId }) => {
        if (!examId) {
            console.error('Invalid connection status request:', { examId });
            return;
        }

        const examIdStr = String(examId);
        console.log(`Received connection status request for exam: ${examIdStr} from socket ${socket.id}`);

        // Get all connected sockets in this exam room
        try {
            const roomMembers = getRoomMembers(io, examIdStr);
            console.log(`Room ${examIdStr} has ${roomMembers.total} total connections, ${roomMembers.proctors.length} proctors, ${roomMembers.students.length} students`);

            // Send all student statuses to the requesting socket
            roomMembers.students.forEach(student => {
                socket.emit('student-online', {
                    studentId: student.studentId,
                    socketId: student.socketId,
                    timestamp: new Date().toISOString()
                });

                console.log(`Emitting student-online for student ${student.studentId} to proctor ${socket.id}`);
            });

            // Acknowledge the request
            socket.emit('connection-status-response', {
                success: true,
                examId: examIdStr,
                connectedStudents: roomMembers.students.length,
                connectedProctors: roomMembers.proctors.length,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error('Error processing connection status request:', err);
            socket.emit('connection-status-response', {
                success: false,
                error: err.message || 'Unknown error'
            });
        }
    });

    // Add a handler for proctor heartbeat events with better error handling and simplified parameter handling
    socket.on('proctor-heartbeat', (data) => {
        let examId;
        
        // Handle both object and string formats
        if (typeof data === 'object' && data !== null) {
            examId = data.examId;
        } else {
            examId = data; // Direct string
        }
        
        if (!examId) {
            console.error('Invalid proctor heartbeat data:', data);
            return;
        }

        // Convert ID to string for consistency
        const examIdStr = String(examId);
        const timestamp = new Date().toISOString();

        // Update socket metadata if needed
        if (socket.socketMetadata.type !== 'proctor' || socket.socketMetadata.examId !== examIdStr) {
            console.log(`Updating socket metadata for ${socket.id} - setting as proctor in exam ${examIdStr}`);
            socket.socketMetadata = {
                type: 'proctor',
                examId: examIdStr,
                userId: null
            };

            // Since metadata changed, make sure we join the correct room
            socket.join(examIdStr);
        }

        // Log the heartbeat
        console.log(`Proctor heartbeat received for exam: ${examIdStr} from ${socket.id}`);

        // Get room status to check if students need to be notified about proctor presence
        const roomMembers = getRoomMembers(io, examIdStr);
        if (roomMembers.students.length > 0) {
            console.log(`Notifying ${roomMembers.students.length} students about proctor presence`);
            io.to(examIdStr).emit('proctor-status-update', {
                examId: examIdStr,
                connected: true,
                proctorId: socket.id,
                timestamp: timestamp
            });
        }
        
        // Send acknowledgment
        socket.emit('heartbeat-ack', {
            received: true,
            timestamp: timestamp
        });
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/users', require('./routes/users'));

// Basic route
app.get('/', (req, res) => {
    res.send('Exam Invigilation API is running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 