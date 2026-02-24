const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1, // minimum 1 star
        max: 5  // maximum 5 stars
    },
    comments: {
        type: String,
        required: false 
    }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);