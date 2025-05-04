const mongoose = require('mongoose');

// Define MongoDB connection string directly
const MONGODB_URI = "mongodb+srv://asinha27072002:exam-proctor@cluster0.ahpnnbz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Define a basic User schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String
});

const User = mongoose.model('User', userSchema);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');

    try {
      // Get all users
      const users = await User.find({});

      console.log('Users in database:');
      console.log('------------------');

      if (users.length === 0) {
        console.log('No users found.');
      } else {
        users.forEach(user => {
          console.log(`ID: ${user._id}`);
          console.log(`Name: ${user.name}`);
          console.log(`Email: ${user.email}`);
          console.log(`Role: ${user.role}`);
          console.log('------------------');
        });
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      // Close the connection
      mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  }); 