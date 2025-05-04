# Exam Invigilation App

A complete application for remote exam invigilation, allowing proctors to monitor students and verify IDs during online exams.

## Overview

The Exam Invigilation App is built using the MERN stack (MongoDB, Express, React, Node.js) with Bootstrap for CSS styling. It enables secure remote exam proctoring with features like webcam monitoring, ID verification, and suspicious activity reporting.

## Features

- **User Authentication**: Secure registration and login with role-based access control
- **Real-time Monitoring**: Live video monitoring of students during exams
- **ID Verification**: Tools for proctors to verify student identities
- **Incident Reporting**: System for proctors to flag suspicious activities
- **Exam Management**: Create, schedule, and manage online exams
- **User Management**: Assign proctors and register students for exams

## Project Structure

The project is divided into two main parts:

- `backend/` - Node.js Express server with MongoDB integration
- `frontend/` - React application with Bootstrap styling

## Setup Instructions

### Prerequisites

- Node.js (v14+ recommended)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following environment variables:
   ```
   MONGODB_URI=<your-mongodb-connection-string>
   PORT=5000
   JWT_SECRET=<your-secret-key>
   JWT_EXPIRE=30d
   ```

4. Start the server:
   ```
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the React development server:
   ```
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Endpoints

See the [backend README](backend/README.md) for detailed API documentation.

## Testing with Postman

1. Import the provided collection (or create one from the API endpoints)
2. Set up environment variables:
   - `URL`: http://localhost:5000
   - `TOKEN`: (will be set after login)
3. Run the endpoints in sequence to test functionality

## License

This project is licensed under the MIT License. 