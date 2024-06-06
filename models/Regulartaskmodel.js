const mongoose = require('mongoose');

// Define the task schema
const regulartask = new mongoose.Schema({
    title: {
        type: String,
        
    },
    description: {
        type: String,
     
    },
    status: {
        type: Number,
        default: 0 // You can define your own status codes, e.g., 0 for pending, 1 for completed, etc.
    },
   
    deadline: {
        type: Object,
       
    }
}, { timestamps: true });

// Define the Task model
const Regulartask = mongoose.model('RegularTask', regulartask);

module.exports = Regulartask;
