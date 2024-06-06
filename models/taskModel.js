const mongoose = require('mongoose');

// Define the task schema
const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    value:{
        type:Number,
    },
    status: [
        {
            value: {
                type: Number,
                required: true,
            },
            comment: {
                type: String,
                required: true,
            },
            name: {
                type: String,
                required: true,
            },
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            }
        }
    ],
    users: [
        {
            name: {
                type: String,
                required: true,
            },
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
        }
    ],
    deadline: {
        type: {
            year: Number,
            month: Number,
            day: Number
        },
        required: true,
    }
}, { timestamps: true });

// Define the Task model
const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
