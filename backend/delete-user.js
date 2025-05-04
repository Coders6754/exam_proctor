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

// Get email from command line argument
const emailToDelete = process.argv[2];

if (!emailToDelete) {
  console.log('Please provide an email to delete.');
  console.log('Usage: node delete-user.js <email>');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    
    try {
      // Delete user by email
      const result = await User.deleteOne({ email: emailToDelete });
      
      if (result.deletedCount === 0) {
        console.log(`No user found with email: ${emailToDelete}`);
      } else {
        console.log(`Successfully deleted user with email: ${emailToDelete}`);
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    } finally {
      // Close the connection
      mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  }); 