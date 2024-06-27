const express = require("express");
const {
    registerUser,
    loginUser,
    logout,
    getUserDetails,
    updateProfile,
    getAllUser,
    getSingleUser,
    deleteUser,
    getAllTask,
} = require("../controller/userController");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");
const Task = require("../models/taskModel");
const User = require("../models/userModel");
const Book = require("../models/bookmodel");

const router = express.Router();

router.route("/register").post(registerUser);

router.route("/login").post(loginUser);


router.route("/logout").get(logout);

router.route('/getalltask').get(isAuthenticatedUser, authorizeRoles("admin"), getAllTask);

router.route("/me").get(isAuthenticatedUser, getUserDetails);

router
    .route("/users")
    .get(isAuthenticatedUser, authorizeRoles("admin"), getAllUser);

router
    .route("/user/:id")
    .get(isAuthenticatedUser, authorizeRoles("admin"), getSingleUser)
    .put(isAuthenticatedUser, authorizeRoles("admin"), updateProfile)
    .delete(isAuthenticatedUser, authorizeRoles("admin"), deleteUser);


// Example middleware in Node.js (Express)
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return true;
    } else {
        return false;
    }
};

router.route('/admin').get(isAuthenticatedUser, async (req, res) => {
    if (req.user.role === 'admin') {
        res.status(200).json({ message: 'work' });

    } else {
        res.status(403).json({ message: 'Access denied' });
    }
});


const updateUserPoints = async (req, res) => {
    try {
        const { id } = req.params;
        const { points } = req.body;

        // Find the user by ID
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Update the user's points
        user.points = points;

        // Save the updated user
        await user.save();
        if (isAdmin) {
            res.status(200).json({
                success: true,
                message: 'User points updated successfully',
                user,
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Add the route to update user points
router.put('/user/update/points/:id', isAuthenticatedUser, authorizeRoles('admin'), updateUserPoints);


const getUsersByPoints = async (req, res) => {
    try {
        // Fetch all users sorted by points in descending order
        const users = await User.find({ 'role': 'employee' }).sort({ points: -1 });

        if (isAdmin) {
            res.status(200).json({
                success: true,
                users,
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

router.get('/admin/user/points', isAuthenticatedUser, authorizeRoles('admin'), getUsersByPoints);


const getUsersByPointsEMP = async (req, res) => {
    try {
        // Fetch all users with role 'employee', sorted by points in descending order, and project only name and points, excluding _id
        const users = await User.find({ role: 'employee' }).sort({ points: -1 }).select('name points -_id');

        res.status(200).json({
            success: true,
            users,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

router.get('/employee/user/points', isAuthenticatedUser, authorizeRoles('employee'), getUsersByPointsEMP);



router.route('/tasks').post(isAuthenticatedUser, authorizeRoles("admin"), async (req, res) => {


    try {
        const createdTasks = await Task.create(req.body);
        res.status(201).json({ tasks: createdTasks });
    } catch (error) {
        console.error('Error creating tasks:', error);
        res.status(500).json({ error: 'Failed to create tasks' });
    }
});




router.route('/tasks/:userId').get(isAuthenticatedUser, authorizeRoles("employee"), async (req, res) => {
    const userId = req.params.userId;

    try {
        // Find tasks assigned to the user
        const tasks = await Task.find({ 'users.user': req.params.userId });
        // Check if tasks exist
        if (req.user.id === userId) {
            if (tasks.length > 0) {
                res.status(200).json({ success: true, tasks: tasks });
            } else {
                res.status(404).json({ success: false, message: 'No tasks found for the user' });
            }
        } else {
            res.status(404).json({ success: false, message: 'No tasks found for the user' });
        }
    } catch (error) {
        console.error('Error finding tasks:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/tasks/:id/status', isAuthenticatedUser, async (req, res) => {
    const { value, comment } = req.body;
    const userId = req.user.id;
    const userName = req.user.name;

    try {
        // Find the task by ID and populate the users field
        const task = await Task.findById(req.params.id).populate('users.user');
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Check if the logged-in user is part of the task
        const isUserIncluded = task.users.some(userObj => userObj.user._id.toString() === userId);
        if (!isUserIncluded) {
            return res.status(403).json({ success: false, message: 'User not authorized to update this task' });
        }

        // Create a new status entry
        const statusEntry = {
            value,
            comment,
            name: userName,
            user: userId,
        };

        // Add the status entry to the task
        task.status.push(statusEntry);

        // If value is 100, increase the points of all users associated with the task
        if (value == 100) {
            for (const userObj of task.users) {
                const user = await User.findById(userObj.user._id);
                if (user) {
                    user.points += task.value; // Assuming task.value contains the points to be added
                    await user.save();
                }
            }
        }

        // Save the task with the new status entry
        await task.save();

        res.status(200).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});



// Admin can delete any status
router.route('/admin/tasks/:taskId/status/:statusId').delete(isAuthenticatedUser, authorizeRoles("admin"), async (req, res) => {
    try {
        const { taskId, statusId } = req.params;
        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const statusEntry = task.status.id(statusId);

        if (!statusEntry) {
            return res.status(404).json({
                success: false,
                message: 'Status entry not found'
            });
        }

        // Remove the status entry
        statusEntry.remove();
        await task.save();

        // If the status value was 100, deduct points from all associated users
        if (statusEntry.value === 100) {
            for (const userObj of task.users) {
                const user = await User.findById(userObj.user);
                if (user) {
                    user.points -= task.value; // Adjust the deduction value as necessary
                    await user.save();
                }
            }
        }

        res.status(200).json({
            success: true,
            message: 'Status entry deleted'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});



router.route('/tasks/:taskId/status/:statusId').delete(isAuthenticatedUser, async (req, res) => {
    try {
        const { taskId, statusId } = req.params;
        const userId = req.user.id;
        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const statusEntry = task.status.id(statusId);

        if (!statusEntry) {
            return res.status(404).json({
                success: false,
                message: 'Status entry not found'
            });
        }

        // Check if the user is authorized to delete this status
        if (req.user.role !== 'admin' && statusEntry.user.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this status'
            });
        }

        // Remove the status entry
        task.status.pull(statusId);

        // Update task with removed status entry
        await task.save();

        // If the status value was 100, deduct points from the user
        if (statusEntry.value == 100) {
            const user = await User.findById(userId);
            if (user) {
                user.points -= task.value; // Adjust the deduction value as necessary
                await user.save();
            }
        }

        res.status(200).json({
            success: true,
            message: 'Status entry deleted'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});






router.route('/tasks/:id').put(isAuthenticatedUser, authorizeRoles("employee"), async (req, res) => {
    const userId = req.params.userId;

    if (req.user.id === userId) {
        await Task.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
            useFindAndModify: false,
        });

        res.status(200).json({
            success: true,
            message: "Task Updated Successfully"
        });
    } else {
        res.status(404).json({ success: false, message: 'No tasks found for the user' });
    }

});

router.route('/admin/tasks/:id').put(isAuthenticatedUser, authorizeRoles("admin"), async (req, res) => {


    // Find tasks assigned to the user
    if (isAdmin) {
        await Task.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
            useFindAndModify: false,
        });

        res.status(200).json({
            success: true,
            message: "Task Updated Successfully"
        });
    } else {
        res.status(404).json({ success: false, message: 'Better luck next time.' });
    }

});


// User updates status
router.put('/tasks/:taskId/status/:statusId', isAuthenticatedUser, async (req, res) => {
    const { value, comment } = req.body;
    const userId = req.user.id;

    try {
        const task = await Task.findById(req.params.taskId).populate('users.user');
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const statusEntry = task.status.id(req.params.statusId);
        if (!statusEntry) {
            return res.status(404).json({ success: false, message: 'Status not found' });
        }

        if (statusEntry.user.toString() !== userId.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'You are not authorized to update this status' });
        }

        const previousValue = statusEntry.value;
        const pointsAdjustment = task.value; // Ensure task.value is defined and a valid number

        // Update status entry
        statusEntry.value = value;
        statusEntry.comment = comment;
        statusEntry.createdAt = Date.now();

        // Adjust points based on value changes
        if (previousValue == 100 && value != 100) {
            // Decrease points for all users if previous value was 100 and new value is not 100
            for (const userObj of task.users) {
                const user = await User.findById(userObj.user._id);
                if (user) {
                    user.points -= pointsAdjustment;
                    await user.save();
                }
            }
        } else if (previousValue != 100 && value == 100) {
            // Increase points for all users if new value is 100 and previous value was not 100
            for (const userObj of task.users) {
                const user = await User.findById(userObj.user._id);
                if (user) {
                    user.points += pointsAdjustment;
                    await user.save();
                }
            }
        }

        await task.save();

        res.status(200).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


router.route('/admin/tasks/:id').get(isAuthenticatedUser, authorizeRoles("admin"), async (req, res) => {

    if (isAdmin) {
        const task = await Task.findById(req.params.id);

        res.status(200).json({
            success: true,
            task,
        });
    } else {
        res.status(500).json({ success: false, message: 'Better Luck next time' });
    }

});


router.route('/admin/tasks/:id').delete(isAuthenticatedUser, authorizeRoles("admin"), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        if (isAdmin) {
            await task.deleteOne();  // Use deleteOne method to delete the task

            res.status(200).json({
                success: true,
                message: "Task deleted"
            });
        } else {
            res.status(500).json({ success: false, message: 'Better Luck next time' });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


router.post('/book', async (req, res) => {
    // Destructure the fields from the request body
    const { name, email, phone, service, reason } = req.body;

    // Create a new instance of the Book model
    const newUser = new Book({
        name,
        email,
        phone,
        service,
        reason
    });

    try {
        // Save the new user to the database
        await newUser.save();

        // Send a success response
        res.status(201).json({ message: 'Booking successful', user: newUser });
    } catch (error) {
        // Handle any errors that occur during save
        console.error(error);
        res.status(500).json({ message: 'Server error, please try again later' });
    }
});



router.route('/alltask').post(isAuthenticatedUser, authorizeRoles("admin"), async (req, res) => {

    const { title, description, status, day, month, year } = req.body

    const task = new Regulartask({
        title,
        description,
        status,
        deadline: {
            day,
            month,
            year
        }

    })

    await task.save();
    res.status(201).json({ message: 'Task created successfully' });
})


router.get("/regulartask", async (req, res) => {
    const regulartask = await Regulartask.find()


    res.status(201).json(regulartask);

})

module.exports = router;
