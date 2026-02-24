const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    contactNumber: {
        type: String
    },
    role: {
        type: String,
        enum: ['participant', 'organizer', 'admin'],
        required: true
    },
    orgName: {
        type: String
    },
    password: {
        type: String,
        required: true
    },
    participantType: {
        type: String,
        enum: ['IIIT', 'Non-IIIT'],
        default: 'IIIT'
    },
    collegeName: {
        type: String,
        default: ''
    },
    interests: {
        type: [String],
        default: []
    },
    following: [
        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ],
    category: { type: String },
    description: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    isDisabled: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    plainPassword: { type: String }, // Stored for admin to view organizer credentials
    discordWebhookUrl: { type: String, default: '' },
    preferences: {
        type: [String],
        default: []
    },
    areasOfInterest: {
        type: [String],
        default: []
    },
    onboardingCompleted: {
        type: Boolean,
        default: false
    },
    passwordResetToken: { type: String },
    passwordResetExpiry: { type: Date }
});

const User = mongoose.model('User', userSchema);
module.exports = User;
