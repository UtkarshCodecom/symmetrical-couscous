const app = require("./app");
const connectDatabase = require("./db");
const cors = require('cors');
const User = require('./models/userModel');
const Task = require('./models/taskModel');
const { attendence } = require("./controller/userController");

// Handling Uncaught Exception
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`Shutting down the server due to Uncaught Exception`);
  process.exit(1);
});

// Config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({ path: "backend/.env" });
}

// Connecting to database
connectDatabase();
app.use(cors());

const server = app.listen(process.env.PORT, () => {
  console.log(`Server is working on http://localhost:${process.env.PORT}`);
});

// Unhandled Promise Rejection
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`Shutting down the server due to Unhandled Promise Rejection`);

  server.close(() => {
    process.exit(1);
  });
});

// Function to reset user points and delete completed tasks
const resetUserPointsAndDeleteTasks = async () => {
  try {
    const currentDate = new Date();
    if (currentDate.getDate() === 1) { // Check if it's the first day of the month
      // Reset points for all users
      await User.updateMany({}, { $set: { points: 0 } });

      // Delete completed tasks
      await Task.deleteMany({ 'status.value': 100 });
    }
  } catch (error) {
    console.error('Error resetting user points and deleting completed tasks:', error);
  }
};

// Function to check task deadlines and update user points
const checkDeadlinesAndUpdatePoints = async () => {
  try {
    const currentDate = new Date();
    const tasks = await Task.find();

    for (const task of tasks) {
      const deadline = new Date(task.deadline.year, task.deadline.month - 1, task.deadline.day);
      if (currentDate > deadline && task.status.every(status => status.value !== 100)) {
        for (const userObj of task.users) {
          const user = await User.findById(userObj.user);
          if (user) {
            user.points -= task.value/2;
            await user.save();
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking deadlines and updating points:', error);
  }
};


setInterval(() => {
  let now = new Date();

  // get the current hour (from 0 to 23)
  let hour = now.getHours();
  let minute = now.getMinutes();

  if ((hour + ":" + minute) == "1:8") {
    attendence();
  }
}, 60 * 1000);

// Check every 24 hours if it's the first day of the month or if tasks are past their deadlines
setInterval(() => {
  resetUserPointsAndDeleteTasks();
  checkDeadlinesAndUpdatePoints();
}, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

// Also, run the functions immediately to ensure they work right after the server starts
resetUserPointsAndDeleteTasks();
checkDeadlinesAndUpdatePoints();
