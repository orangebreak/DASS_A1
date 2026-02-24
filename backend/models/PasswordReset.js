const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
    organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    adminComments: {
        type: String
    }
}, { timestamps: true }); 

module.exports = mongoose.model('PasswordReset', passwordResetSchema);