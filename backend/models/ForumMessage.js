const mongoose = require('mongoose');

const forumMessageSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    isAnnouncement: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('ForumMessage', forumMessageSchema);