# Exam Invigilation App - Backend

This is the backend for the Exam Invigilation App built with Node.js, Express, and MongoDB.

## Setup Instructions

1. Make sure you have Node.js installed on your machine.
2. Create a file named `.env` with the following content:
   ```
   MONGODB_URI=mongodb+srv://asinha27072002:exam-proctor@cluster0.ahpnnbz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   PORT=5000
   JWT_SECRET=exam_invigilation_secret_key
   JWT_EXPIRE=30d
   ```
   Note: In production, use a secure and random JWT_SECRET.

3. Install dependencies:
   ```
   npm install
   ```

4. Start the server:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/proctors` - Get all proctors (Admin only)
- `GET /api/users/students` - Get all students (Admin/Proctor only)
- `GET /api/users/:id` - Get a specific user (Admin only)
- `PUT /api/users/:id` - Update a user (Admin only)
- `DELETE /api/users/:id` - Delete a user (Admin only)

### Exams
- `POST /api/exams` - Create a new exam (Admin only)
- `GET /api/exams` - Get all exams (filtered based on user role)
- `GET /api/exams/:id` - Get a specific exam
- `PUT /api/exams/:id` - Update an exam (Admin only)
- `DELETE /api/exams/:id` - Delete an exam (Admin only)
- `POST /api/exams/:id/register` - Register students for an exam (Admin only)
- `POST /api/exams/:id/assign-proctors` - Assign proctors to an exam (Admin only)
- `POST /api/exams/:id/incidents` - Report an incident during an exam (Proctor only)
- `GET /api/exams/:id/incidents` - Get all incidents for an exam (Proctor/Admin only)

## Testing with Postman

1. Install Postman if you haven't already: [https://www.postman.com/downloads/](https://www.postman.com/downloads/)
2. Import the Postman collection (you can create one from the API endpoints above)
3. Set up environment variables in Postman:
   - `URL`: http://localhost:5000
   - `TOKEN`: (this will be set after login)

4. Register a user:
   - Method: POST
   - URL: {{URL}}/api/auth/register
   - Body (JSON):
     ```json
     {
       "name": "Admin User",
       "email": "admin@example.com",
       "password": "123456",
       "role": "admin"
     }
     ```

5. Login to get a token:
   - Method: POST
   - URL: {{URL}}/api/auth/login
   - Body (JSON):
     ```json
     {
       "email": "admin@example.com",
       "password": "123456"
     }
     ```
   - In the response, copy the token and set it as the `TOKEN` environment variable in Postman.

6. For authenticated requests, add the following header:
   - Key: Authorization
   - Value: Bearer {{TOKEN}}

7. Test the endpoints as needed. For example, to create an exam:
   - Method: POST
   - URL: {{URL}}/api/exams
   - Headers: Authorization: Bearer {{TOKEN}}
   - Body (JSON):
     ```json
     {
       "title": "Mathematics Final Exam",
       "description": "Final examination for Mathematics 101",
       "startTime": "2023-12-15T09:00:00Z",
       "endTime": "2023-12-15T12:00:00Z",
       "duration": 180
     }
     ```

## WebSocket Events

The application uses Socket.IO for real-time communication:

- `proctor-join` - When a proctor joins an exam room
- `student-join` - When a student joins an exam room
- `student-video` - For streaming student video to proctors
- `request-id-verification` - When a proctor requests ID verification from a student
- `id-verification-response` - When a student responds to an ID verification request
- `report-suspicious-activity` - When a proctor reports suspicious activity 