# Exam Invigilation App

A real-time exam proctoring system that enables educators to monitor students during online examinations through secure video surveillance and behavioral analysis.

<img width="947" alt="exam" src="https://github.com/user-attachments/assets/abe3b11a-a6d4-4073-9f3f-86523968a54e" />

## Live Demo

- Frontend: [https://exam-invigilation-app-frontend-qt5cnxtor.vercel.app](https://exam-invigilation-app-frontend-qt5cnxtor.vercel.app)
- Backend: [https://exam-invigilation-app-backend-msdl95eg7.vercel.app](https://exam-invigilation-app-backend-msdl95eg7.vercel.app)

## About the Project

The Exam Invigilation App is a comprehensive solution designed to address the challenges of remote examination integrity. With the rise of online education, ensuring academic honesty during examinations has become increasingly difficult. This application bridges that gap by providing real-time monitoring capabilities while maintaining a user-friendly experience for both proctors and students.

### Key Features

- **Real-time Video Monitoring**: Proctors can simultaneously monitor multiple students via live video feeds
- **Automatic Suspicious Activity Detection**: System flags potential irregularities like absence, multiple faces, or unusual movements
- **Secure Authentication**: Role-based access control for students, proctors, and administrators
- **ID Verification**: Built-in mechanism for student identity verification before exam commencement
- **Incident Reporting**: Streamlined process for documenting and managing suspicious activities
- **Responsive Design**: Fully functional across desktop and mobile devices
- **Reliable Socket Connection**: WebSocket implementation with automatic reconnection handling

## Technology Stack

### Frontend
- **React.js**: Component-based UI development
- **React Router**: Navigation and routing
- **Socket.io Client**: Real-time bidirectional communication
- **Axios**: HTTP requests and API integration
- **Material-UI**: Modern, responsive UI components
- **WebRTC**: Browser-based real-time communication for video streaming

### Backend
- **Node.js**: JavaScript runtime for the server
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database for flexible data storage
- **Mongoose**: MongoDB object modeling
- **Socket.io**: Real-time event-based communication
- **JWT**: Secure authentication and authorization
- **Bcrypt**: Password hashing and security

### Deployment
- **Vercel**: Frontend and backend hosting
- **MongoDB Atlas**: Cloud database hosting

## Installation and Setup

### Prerequisites
- Node.js (v14.x or higher)
- npm (v6.x or higher)
- MongoDB (local or Atlas connection)

### Backend Setup
```bash
# Clone the repository
git clone https://github.com/your-username/exam-invigilation-app.git

# Navigate to backend directory
cd exam-invigilation-app/backend

# Install dependencies
npm install

# Create .env file
touch .env

# Add environment variables to .env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key

# Start the server
npm run dev
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Create .env file
touch .env

# Add environment variables to .env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000

# Start the development server
npm start
```

## Usage Guide

### Administrator
1. Register an admin account
2. Create and manage exams
3. Assign proctors to exams
4. Review incident reports

### Proctor
1. Log in with proctor credentials
2. Select an assigned exam to monitor
3. View student video feeds
4. Request ID verification
5. Report suspicious activities

### Student
1. Log in with student credentials
2. Join the assigned exam
3. Complete identity verification
4. Take the exam while being monitored
5. Submit the exam when finished

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributors

- [Your Name](https://github.com/your-username)

## Acknowledgments

- Special thanks to all educators adapting to remote learning challenges
- Inspired by the need for academic integrity in online education 
