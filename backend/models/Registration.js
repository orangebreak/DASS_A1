const mongoose = require('mongoose');

// document is single row in the database 
const registrationSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,  // something like a foregin key
        ref: 'Event',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId, // foreign key for user
        ref: 'User',
        required: true
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    attendanceTime: {
        type: Date
    },
    status: {
        type: String,
        enum: ['Registered', 'Cancelled', 'Attended', 'Pending', 'Rejected'],
        default: 'Registered'
    },
    purchaseDetails: {
        itemId: String, // which item from the array
        variant: String, // e.g. "L"
        color: String, // e.g. "Red"
        quantity: { type: Number, default: 1, min: 1 }
    },
    ticketId: { type: String, unique: true }, // unique ticket id 

    // stores image URL or Base64 string of the payment screenshot
    paymentProof: {
        type: String
    },
    customFieldResponses: {
        type: Map,
        of: String,
        default: {}
    }
});
// create special sorted list using a pair of two fields ({eventId, userId})
// the {eventId: 1 } -> the 1 here means ascending order
registrationSchema.index({
    eventId: 1,
    userId: 1
},
    {
        unique: true // prevents duplicate entry
    });

// module is js object tool to create, read, update, and delete documents.
module.exports = mongoose.model('Registration', registrationSchema);
