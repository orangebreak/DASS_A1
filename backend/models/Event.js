const mongoose = require('mongoose'); // library used to interact with mongoDB

const customFieldSchema = new mongoose.Schema({
    fieldName: { type: String, required: true },
    fieldType: {
        type: String,
        enum: ['text', 'textarea', 'number', 'dropdown', 'checkbox', 'file', 'date', 'email'],
        required: true
    },
    required: { type: Boolean, default: false },
    options: [String], // for dropdown fields
    placeholder: { type: String }
});

const eventSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: true
    },
    eventDescription: {
        type: String,
        required: true
    },
    eventType: {
        type: String,
        enum: ['normal', 'merchandise'],
        required: true
    },
    eligibility: {
        type: String
    },
    regDeadline: {
        type: Date,
        required: true
    },
    eventStart: {
        type: Date,
        required: true
    },
    eventEnd: {
        type: Date,
        required: true
    },
    regLimit: {
        type: Number,
        min: 0
    },
    regFee: {
        type: Number,
        default: 0,
        min: 0
    },
    orgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    eventTags: {
        type: [String], // a list of strings
        default: []
    }
    , merchandiseItems: [{
        itemName: String,
        price: { type: Number, min: 0 },
        variants: [String], // like size s, m, l, xl etc
        colors: [String], // color options
        stock: { type: Number, min: 0 },
        purchaseLimit: { type: Number, min: 1, default: 1 } // max quantity per participant
    }],
    status: {
        type: String,
        enum: ['Draft', 'Published', 'Ongoing', 'Closed', 'Completed'],
        default: 'Draft'
    },
    customFields: [customFieldSchema],
    registrationCount: { type: Number, default: 0 }
}, { timestamps: true }); // adds created and updated time auto

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;