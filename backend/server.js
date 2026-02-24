const express = require('express'); // gives a function 
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User'); // loads the participant model(js object)
const bcrypt = require('bcryptjs'); // for password hashing
const jwt = require('jsonwebtoken');
const auth = require('./middleware/authMiddleware'); // for authentication
const Event = require('./models/Event'); // schema of event
const Registration = require('./models/Registration'); // schema for registration table
const cors = require('cors'); // Cross-Origin Resource Sharing
const { v4: uuidv4 } = require('uuid'); // this extracts 4th version of uuid function
const QRCode = require('qrcode');
const PasswordReset = require('./models/PasswordReset'); // loads the password reset model
const ForumMessage = require('./models/ForumMessage');
const Feedback = require('./models/Feedback');
const axios = require('axios');
const { Resend } = require('resend');
const crypto = require('crypto');

const app = express();

app.use(express.json({ limit: '10mb' })); // if a request sends a json data, auto parse and store in req.body
app.use(cors());

// Email configuration using Resend (HTTP-based, works on Render)
const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || 'Felicity <onboarding@resend.dev>';

// Verify Resend configuration on startup
if (process.env.RESEND_API_KEY) {
    console.log('Resend email service configured');
} else {
    console.log('Warning: RESEND_API_KEY not set - emails will not be sent');
}

// Helper function to send ticket email
async function sendTicketEmail(userEmail, userName, eventName, ticketId, eventType, eventDetails) {
    if (!process.env.RESEND_API_KEY) {
        console.log('Email not configured - skipping ticket email');
        return;
    }

    try {
        const qrCodeDataUrl = await QRCode.toDataURL(ticketId);

        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: userEmail,
            subject: `Your Ticket for ${eventName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #4CAF50;">Your Event Ticket</h1>
                    <p>Hi ${userName},</p>
                    <p>Thank you for registering for <strong>${eventName}</strong>!</p>
                    
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h2 style="margin-top: 0;">${eventName}</h2>
                        <p><strong>Type:</strong> ${eventType === 'merchandise' ? 'Merchandise' : 'Event'}</p>
                        <p><strong>Ticket ID:</strong> ${ticketId}</p>
                        ${eventDetails.eventStart ? `<p><strong>Date:</strong> ${new Date(eventDetails.eventStart).toLocaleString()}</p>` : ''}
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <p><strong>Your QR Code:</strong></p>
                        <img src="${qrCodeDataUrl}" alt="QR Code" style="max-width: 200px;"/>
                        <p style="font-size: 12px; color: #666;">Present this QR code at the event for check-in.</p>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        If you have any questions, please contact the event organizer.
                    </p>
                </div>
            `
        });

        if (error) {
            console.error('Failed to send ticket email:', error);
        } else {
            console.log(`Ticket email sent to ${userEmail}`, data);
        }
    } catch (err) {
        console.error('Failed to send ticket email:', err.message);
    }
}

// Helper function to send password reset email
async function sendPasswordResetEmail(userEmail, userName, resetToken) {
    if (!process.env.RESEND_API_KEY) {
        console.log('Email not configured - skipping password reset email');
        return false;
    }

    try {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: userEmail,
            subject: 'Password Reset Request - Felicity',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #1976d2;">Password Reset Request</h1>
                    <p>Hi ${userName},</p>
                    <p>You requested to reset your password. Click the button below to proceed:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="
                            background-color: #1976d2;
                            color: white;
                            padding: 15px 30px;
                            text-decoration: none;
                            border-radius: 5px;
                            display: inline-block;
                        ">Reset Password</a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        This link will expire in 1 hour. If you didn't request this, please ignore this email.
                    </p>
                    
                    <p style="color: #999; font-size: 12px;">
                        Or copy and paste this link: ${resetUrl}
                    </p>
                </div>
            `
        });

        if (error) {
            console.error('Failed to send password reset email:', error);
            return false;
        }
        console.log(`Password reset email sent to ${userEmail}`, data);
        return true;
    } catch (err) {
        console.error('Failed to send password reset email:', err.message);
        return false;
    }
}

// reCAPTCHA verification helper (optional - skip if no secret key configured)
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

async function verifyCaptcha(token) {
    // If no secret key configured, skip verification (development mode)
    if (!RECAPTCHA_SECRET_KEY) {
        console.log('CAPTCHA verification skipped - no secret key configured');
        return true;
    }
    
    try {
        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: RECAPTCHA_SECRET_KEY,
                    response: token
                }
            }
        );
        return response.data.success;
    } catch (err) {
        console.error('CAPTCHA verification error:', err.message);
        return false;
    }
}

app.get('/', (req, res) => {     // '/' means the root folder
    // req : info about the request
    // res : tool to send response back  
    res.send('the server is running');
});



// helper function to send discord webhook notification
async function sendDiscordWebhook(webhookUrl, event, orgName) {
    try {
        const payload = {
            embeds: [{
                title: `🎉 New Event: ${event.eventName}`,
                description: event.eventDescription.substring(0, 200) + (event.eventDescription.length > 200 ? '...' : ''),
                color: 0x5865F2,
                fields: [
                    { name: '📅 Event Start', value: new Date(event.eventStart).toLocaleString(), inline: true },
                    { name: '📅 Event End', value: new Date(event.eventEnd).toLocaleString(), inline: true },
                    { name: '📋 Type', value: event.eventType, inline: true },
                    { name: '💰 Fee', value: `₹${event.regFee || 0}`, inline: true },
                    { name: '🏢 Organized by', value: orgName || 'Unknown', inline: true },
                ],
                timestamp: new Date().toISOString()
            }]
        };
        // dynamic import for fetch (Node 18+)
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error('Discord webhook failed:', err.message);
    }
}


// helper function to add an user record
async function addUserDocument(req, res, role, participantType) {
    // hashes the password
    // 10 is the number of salt rounds
    // bcrypt is slow hence you need await 
    const hashedPass = await bcrypt.hash(req.body.password, 10);

    const userData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        contactNumber: req.body.contactNumber,
        role: role,
        participantType: participantType, // IIIT or Non-IIIT 
        orgName: req.body.orgName,
        password: hashedPass,
        category: req.body.category,
        description: req.body.description
    };

    // Store plain password for organizers (admin can view credentials)
    if (role === 'organizer') {
        userData.plainPassword = req.body.password;
    }

    const newUser = await User.create(userData);

    res.json(newUser);   // send the the user what was stored in server
}


// async function you can use await inside
// if async is not there then value p will be a promise(client gets garbage) js does not like to wait for server
// promise has 3 states: 
//  1. pending
//  2. fulfilled (sucess)
//  3. rejected (error)

app.post('/register/:participantType', async (req, res) => {
    try {
        // Verify CAPTCHA if token provided (optional in dev mode)
        if (req.body.captchaToken) {
            const captchaValid = await verifyCaptcha(req.body.captchaToken);
            if (!captchaValid) {
                return res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
            }
        }

        // Only participants can self register
        if (req.body.role !== 'participant') {
            return res.status(403).json({
                error: 'Only participants can self-register. Organizers/Admins must be provisioned.'
            });
        }
        if (req.params.participantType === 'IIIT') {
            // if not iiit email reject - accept any email containing .iiit.ac.in
            if (!req.body.email || !req.body.email.includes('.iiit.ac.in')) {
                return res.status(400).json({ error: 'IIIT participants must register with an IIIT domain email (containing .iiit.ac.in)' })
            }


        }

        await addUserDocument(req, res, 'participant', req.params.participantType);

    } catch (err) {
        res.status(500).json({
            error: 'Failed to create User',
            details: err.message
        });
    }

});

// login post request
// req.body has the json posted by client
app.post('/login', async (req, res) => {
    try {
        const { email, password, captchaToken } = req.body; // gets email and password from post req

        // Verify CAPTCHA if token provided (optional in dev mode)
        if (captchaToken) {
            const captchaValid = await verifyCaptcha(captchaToken);
            if (!captchaValid) {
                return res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
            }
        }

        const user = await User.findOne({ email }); // finds the document

        if (!user) {
            return res.status(404).json({ error: "User not found." }); // if email did not exist in db
        }

        // check if account is disabled
        if (user.isDisabled) {
            return res.status(403).json({ error: "Your account has been disabled. Please contact the administrator." });
        }

        let token;
        // see if the password user gave and stored are matching
        if (await bcrypt.compare(password, user.password)) {
            token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' }); // token expires in 1 hour
        } else {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // send back the token used of authorization
        res.json({
            token: token
        });
    } catch (err) {
        res.status(500).json({
            error: 'Login error.',
            details: err.message
        });
    }
});

// main page after loging in 
app.get('/dashboard', auth, async (req, res) => { // auth here in parameter checks if the token user has is valid
    try {

        // only userId was stored in req.user by the middlewear
        // this line gets all user data from DB
        const user = await User.findById(req.user.userId).select('-password');
        // .select('-password') : removes the user password and gives the token

        // return error if user cannot be found.
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        let data = {};

        if (req.user.role === 'organizer') {
            const eventsOrganized = await Event.find({ orgId: req.user.userId });
            
            // Get stats for each event (registrations, revenue, attendance)
            const eventsWithStats = await Promise.all(eventsOrganized.map(async (event) => {
                const registrations = await Registration.find({ eventId: event._id });
                const totalRegistrations = registrations.length;
                const attendedCount = registrations.filter(r => r.status === 'Attended').length;
                
                let totalRevenue = 0;
                if (event.eventType === 'normal') {
                    totalRevenue = registrations.filter(r => r.status !== 'Cancelled' && r.status !== 'Rejected').length * (event.regFee || 0);
                } else if (event.eventType === 'merchandise') {
                    for (let reg of registrations) {
                        if (reg.status === 'Registered' || reg.status === 'Attended') {
                            if (reg.purchaseDetails && reg.purchaseDetails.itemId) {
                                const purchasedItem = event.merchandiseItems.id(reg.purchaseDetails.itemId);
                                if (purchasedItem) {
                                    totalRevenue += (purchasedItem.price * (reg.purchaseDetails.quantity || 1));
                                }
                            }
                        }
                    }
                }
                
                return {
                    ...event.toObject(),
                    totalRegistrations,
                    attendedCount,
                    totalRevenue
                };
            }));
            
            data = { user, eventsOrganized: eventsWithStats };
        } else if (req.user.role === 'admin') {
            data = { user };
        } else {
            const eventsParticipated = await Registration.find({ userId: req.user.userId })
                .populate({
                    path: 'eventId',
                    populate: { path: 'orgId', select: 'orgName firstName lastName' }
                });
            data = { user, eventsParticipated };
        }

        res.json(data);
    } catch (err) {
        console.log("error:", err.message);
        res.status(500).json({ error: 'Failed to fetch data.' });
    }
});


// post request to create a new event
app.post('/events', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Only organizers can create events.' });
        }

        const newEvent = await Event.create({
            eventName: req.body.eventName,
            eventDescription: req.body.eventDescription,
            eventType: req.body.eventType,
            eligibility: req.body.eligibility,
            regDeadline: req.body.regDeadline,
            eventStart: req.body.eventStart,
            eventEnd: req.body.eventEnd,
            regLimit: req.body.regLimit,
            regFee: req.body.regFee,
            orgId: req.user.userId, // this was stored by auth (middlewear)
            eventTags: req.body.eventTags,
            merchandiseItems: req.body.merchandiseItems,
            customFields: req.body.customFields || []
        });

        // Send Discord webhook if organizer has one configured
        try {
            const organizer = await User.findById(req.user.userId);
            if (organizer && organizer.discordWebhookUrl) {
                await sendDiscordWebhook(organizer.discordWebhookUrl, newEvent, organizer.orgName);
            }
        } catch (webhookErr) {
            console.error('Discord webhook error:', webhookErr.message);
        }

        res.status(201).json(newEvent);
    } catch (err) {
        console.log("Error creating the event:", err.message);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: "Validation Error", details: err.message });
        }
        res.status(500).json({
            error: "Failed to create event.",
            details: err.message
        });
    }
});



// PUT request to update an existing event
app.put('/events/:id', auth, async (req, res) => {
    try {
        // only organizers and admins can edit events
        if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Only organizers can edit events.' });
        }

        const eventId = req.params.id; // extract ':id' part from URL
        const event = await Event.findById(eventId); // get existing event from the database

        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        // an organizer can only edit their own events
        // .toString() because db ids are special objects not strings
        if (event.orgId.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only edit events that you created.' });
        }

        const currentStatus = event.status;
        const updates = req.body; // new data user sent in req

        // Check if custom fields are being updated - not allowed after first registration
        if (updates.customFields && event.registrationCount > 0) {
            return res.status(400).json({ 
                error: 'Custom form fields cannot be modified after the first registration.' 
            });
        }

        if (currentStatus === 'Draft') {
            // built in fn overwrites matching keys into events 
            Object.assign(event, updates);
        }
        else if (currentStatus === 'Published') {
            // Published events have restricted editing
            if (updates.eventDescription) {
                event.eventDescription = updates.eventDescription;
            }
            // (new date must be > old date)
            if (updates.regDeadline && new Date(updates.regDeadline) > new Date(event.regDeadline)) {
                event.regDeadline = updates.regDeadline;
            }
            // (new limit must be > old limit)
            if (updates.regLimit && updates.regLimit > event.regLimit) {
                event.regLimit = updates.regLimit;
            }
            if (updates.status === 'Closed' || updates.status === 'Ongoing' || updates.status === 'Completed') {
                event.status = updates.status;
            }
        }
        else if (currentStatus === 'Ongoing' || currentStatus === 'Completed') {
            // only status changes
            if (updates.status === 'Completed' || updates.status === 'Closed') {
                event.status = updates.status;
            } else {
                return res.status(400).json({ error: 'For Ongoing/Completed events, you can only change the status.' });
            }
        }
        else if (currentStatus === 'Closed') {
            return res.status(400).json({ error: 'Closed events cannot be edited.' });
        }

        // Send Discord webhook when event is published
        if (updates.status === 'Published' && currentStatus === 'Draft') {
            try {
                const organizer = await User.findById(req.user.userId);
                if (organizer && organizer.discordWebhookUrl) {
                    await sendDiscordWebhook(organizer.discordWebhookUrl, event, organizer.orgName);
                }
            } catch (webhookErr) {
                console.error('Discord webhook error:', webhookErr.message);
            }
        }

        const updatedEvent = await event.save();
        res.json(updatedEvent); // send updated data back to frontend

    } catch (err) {
        console.log("Error updating the event:", err.message);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: "Validation Error", details: err.message });
        }
        res.status(500).json({ error: "Failed to update event.", details: err.message });
    }
});

// DELETE an event (cancel event)
app.delete('/events/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Only organizers can delete events.' });
        }

        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        // Organizer can only delete their own events
        if (event.orgId.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only delete events that you created.' });
        }

        // Cannot delete completed events
        if (event.status === 'Completed') {
            return res.status(400).json({ error: 'Completed events cannot be deleted.' });
        }

        // Delete all registrations for this event
        await Registration.deleteMany({ eventId: req.params.id });

        // Delete all feedback for this event
        await Feedback.deleteMany({ eventId: req.params.id });

        // Delete all forum messages for this event
        await ForumMessage.deleteMany({ eventId: req.params.id });

        // Delete the event
        await Event.findByIdAndDelete(req.params.id);

        res.json({ message: 'Event and all associated data have been deleted.' });

    } catch (err) {
        console.log("Error deleting event:", err.message);
        res.status(500).json({ error: "Failed to delete event.", details: err.message });
    }
});




// GET analytics for an event
app.get('/events/:id/analytics', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Only organizers can view analytics.' });
        }

        const eventId = req.params.id;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        if (event.orgId.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only view analytics for your own events.' });
        }

        // fetch all registrations for this event with participant type
        const registrations = await Registration.find({ eventId: eventId })
            .populate('userId', 'firstName lastName email participantType');

        let totalRegistrations = registrations.length;

        // .filter() creates a new list with only the registrations that match the condition
        let attendedCount = registrations.filter(reg => reg.status === 'Attended').length;

        let totalRevenue = 0;

        if (event.eventType === 'normal') {
            const paidRegistrations = registrations.filter(r => r.status !== 'Cancelled' && r.status !== 'Rejected').length;
            totalRevenue = paidRegistrations * (event.regFee || 0);
        }
        else if (event.eventType === 'merchandise') {
            // loop through every purchase and find price of item
            for (let reg of registrations) {
                if (reg.status === 'Registered' || reg.status === 'Attended') {
                    if (reg.purchaseDetails && reg.purchaseDetails.itemId) {
                        const purchasedItem = event.merchandiseItems.id(reg.purchaseDetails.itemId);

                        if (purchasedItem) {
                            const quantity = reg.purchaseDetails.quantity || 1;
                            totalRevenue += (purchasedItem.price * quantity);
                        }
                    }
                }
            }
        }

        res.json({
            eventName: event.eventName,
            eventDescription: event.eventDescription,
            status: event.status,
            eventType: event.eventType,
            eventStart: event.eventStart,
            eventEnd: event.eventEnd,
            regDeadline: event.regDeadline,
            eligibility: event.eligibility,
            regFee: event.regFee,
            regLimit: event.regLimit,
            eventTags: event.eventTags,
            customFields: event.customFields,
            totalRegistrations: totalRegistrations,
            attendedCount: attendedCount,
            totalRevenue: totalRevenue,
            participants: registrations
        });

    } catch (err) {
        console.log("Analytics Error Details:", err);
        res.status(500).json({ error: 'Failed to fetch analytics', details: err.message });
    }
});


// GET CSV export of analytics
app.get('/events/:id/analytics/csv', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied.' });
        }

        const eventId = req.params.id;
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        if (event.orgId.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only export analytics for your own events.' });
        }

        const registrations = await Registration.find({ eventId: eventId })
            .populate('userId', 'firstName lastName email participantType');

        // Build CSV with columns matching UI: Name, Email, Participant Type, Registration Date, Payment, Ticket ID, Status
        let csv = 'Name,Email,Participant Type,Registration Date,Payment,Ticket ID,Status\n';
        for (const reg of registrations) {
            const name = `${reg.userId?.firstName || ''} ${reg.userId?.lastName || ''}`.trim();
            const email = reg.userId?.email || '';
            const pType = reg.userId?.participantType || 'N/A';
            const ticketId = reg.ticketId || '';
            const status = reg.status || '';
            const date = reg.registrationDate ? new Date(reg.registrationDate).toLocaleString() : '';
            // For payment, check if it's merchandise (has paymentProof) or normal event
            const payment = reg.paymentProof ? 'Uploaded' : (event.regFee > 0 ? `₹${event.regFee}` : 'Free');
            csv += `"${name}","${email}","${pType}","${date}","${payment}","${ticketId}","${status}"\n`;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${event.eventName}_attendance.csv"`);
        res.send(csv);

    } catch (err) {
        res.status(500).json({ error: 'Failed to export CSV', details: err.message });
    }
});



// PUT request for organizers to approve/reject payments
app.put('/orders/:ticketId/review', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Only organizers can review orders.' });
        }

        const { ticketId } = req.params;
        const { action } = req.body; // frontend will send action 'approve' or 'reject'

        // find registration and populate with event document
        const registration = await Registration.findOne({ ticketId: ticketId }).populate('eventId');

        if (!registration) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        const event = registration.eventId;

        // check organizer owns this event
        if (event.orgId.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You are not authorized to review orders for this event.' });
        }

        if (registration.status !== 'Pending') {
            return res.status(400).json({ error: `Cannot review. Order is currently marked as ${registration.status}.` });
        }

        if (action === 'approve') {
            // find the specific merchandise item in the event's array
            const item = event.merchandiseItems.id(registration.purchaseDetails.itemId);

            // check stock 
            if (!item || item.stock < 1) {
                return res.status(400).json({ error: 'Cannot approve. Item is out of stock.' });
            }

            // dec. stock by quantity purchased
            item.stock -= (registration.purchaseDetails.quantity || 1);

            await event.save();

            // mark registration as 'Registered' = successful status and validates the QR code
            // previously it would have been marked as 'Pending' which would'nt have been accepted
            registration.status = 'Registered';
            await registration.save();

            // Get user info and send confirmation email with ticket
            const user = await User.findById(registration.userId);
            if (user && user.email) {
                sendTicketEmail(
                    user.email,
                    user.firstName || 'Customer',
                    event.eventName,
                    registration.ticketId,
                    'merchandise',
                    { eventStart: event.eventStart }
                );
            }

            return res.json({
                message: 'Order approved successfully! Stock updated and ticket activated. Confirmation email sent.',
                registration: registration
            });
        }
        else if (action === 'reject') {
            registration.status = 'Rejected';
            await registration.save();

            return res.json({ message: 'Order rejected and ticket cancelled.' });
        }
        else {
            return res.status(400).json({ error: 'Invalid action. Please send "approve" or "reject".' });
        }

    } catch (err) {
        console.log("Order Review Error:", err);
        res.status(500).json({ error: 'Failed to review order', details: err.message });
    }
});


// GET merchandise orders for organizer
app.get('/events/:id/merchandise-orders', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied.' });
        }

        const eventId = req.params.id;
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        if (event.orgId.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized.' });
        }

        const orders = await Registration.find({
            eventId: eventId,
            'purchaseDetails.itemId': { $exists: true }
        }).populate('userId', 'firstName lastName email');

        // Enrich orders with item details
        const enrichedOrders = orders.map(order => {
            const item = event.merchandiseItems.id(order.purchaseDetails?.itemId);
            return {
                _id: order._id,
                ticketId: order.ticketId,
                status: order.status,
                paymentProof: order.paymentProof,
                purchaseDetails: order.purchaseDetails,
                userId: order.userId,
                registrationDate: order.registrationDate,
                itemName: item?.itemName || 'Unknown Item',
                itemPrice: item?.price || 0
            };
        });

        res.json(enrichedOrders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
    }
});


// GET request to generate QR code
app.get('/tickets/:ticketId', auth, async (req, res) => {
    try {
        const ticketId = req.params.ticketId;

        // .populate() gets the actual event and user details
        // rather than just giving object ids
        const registration = await Registration.findOne({ ticketId: ticketId })
            .populate('eventId', 'eventName eventType eventStart eventEnd')
            .populate('userId', 'firstName lastName email participantType');

        if (!registration) {
            return res.status(404).json({ error: 'Ticket not found.' });
        }

        // only ticket owner, admin, or organizer can view 
        const owner = registration.userId._id.toString() === req.user.userId;
        const admin_org = req.user.role === 'admin' || req.user.role === 'organizer';

        if (!owner && !admin_org) {
            return res.status(403).json({ error: 'Access denied. You do not own this ticket.' });
        }

        // convert js object into JSON string
        const qrData = JSON.stringify({
            ticketId: registration.ticketId,
            eventName: registration.eventId.eventName,
            participant: `${registration.userId.firstName} ${registration.userId.lastName}`
        });

        // data URL: string that represents an image
        const qrCodeDataURL = await QRCode.toDataURL(qrData);

        res.json({
            ticketDetails: registration,
            qrCode: qrCodeDataURL
        });

    } catch (err) {
        console.log("Error generating ticket:", err.message);
        res.status(500).json({ error: 'Failed to generate ticket', details: err.message });
    }
});



// get all the events (browse page)
app.get('/events', auth, async (req, res) => {
    try {
        // req.query grabs parameters from the URL itself
        const { search, type, organizer, eligibility, dateFrom, dateTo, followedOnly } = req.query;
        let query = {};

        if (search) {
            // Fuzzy matching using $regex
            // Escape special regex chars, then replace spaces with .* for partial matching
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const fuzzyPattern = escaped.split('').join('.*');
            query.$or = [
                { eventName: { $regex: fuzzyPattern, $options: 'i' } },
                { eventDescription: { $regex: fuzzyPattern, $options: 'i' } },
                { eventTags: { $regex: fuzzyPattern, $options: 'i' } }
            ];
        }

        if (type) {
            query.eventType = type;
        }

        if (organizer) {
            query.orgId = organizer;
        }

        if (eligibility) {
            query.eligibility = { $regex: eligibility, $options: 'i' };
        }

        if (dateFrom || dateTo) {
            query.eventStart = {};
            if (dateFrom) query.eventStart.$gte = new Date(dateFrom);
            if (dateTo) query.eventStart.$lte = new Date(dateTo);
        }

        // If followedOnly, filter by organizers the user follows
        if (followedOnly === 'true') {
            const user = await User.findById(req.user.userId);
            if (user && user.following.length > 0) {
                query.orgId = { $in: user.following };
            } else {
                return res.json([]); // no followed clubs
            }
        }

        const events = await Event.find(query)
            .populate('orgId', 'orgName firstName email')
            .sort({ eventStart: 1 }); // sort by nearest date

        // Personalize ordering based on user preferences
        const currentUser = await User.findById(req.user.userId);
        const userInterests = (currentUser?.areasOfInterest || []).map(i => i.toLowerCase());
        const hasPreferences = userInterests.length > 0 || (currentUser?.following && currentUser.following.length > 0);
        
        if (hasPreferences) {
            // Score each event based on tag match with user interests
            const scoredEvents = events.map(event => {
                let score = 0;
                const tags = (event.eventTags || []).map(t => t.toLowerCase());
                const eventName = (event.eventName || '').toLowerCase();
                const eventDesc = (event.eventDescription || '').toLowerCase();
                
                for (const interest of userInterests) {
                    const interestLower = interest.toLowerCase();
                    // Check tags
                    for (const tag of tags) {
                        if (tag.includes(interestLower) || interestLower.includes(tag)) {
                            score += 10;
                        }
                    }
                    // Check event name and description
                    if (eventName.includes(interestLower)) score += 5;
                    if (eventDesc.includes(interestLower)) score += 2;
                }
                // Boost followed organizers significantly
                if (currentUser.following && currentUser.following.some(fId => fId.toString() === event.orgId?._id?.toString())) {
                    score += 20;
                }
                return { ...event.toObject(), _preferenceScore: score };
            });

            // Sort: higher preference score first, then by eventStart
            scoredEvents.sort((a, b) => {
                if (b._preferenceScore !== a._preferenceScore) return b._preferenceScore - a._preferenceScore;
                return new Date(a.eventStart) - new Date(b.eventStart);
            });

            return res.json(scoredEvents);
        }

        res.json(events);
    } catch (err) {

        console.log("Error fetching the event:", err.message);
        res.status(500).json({
            error: 'Failed to fetch events.'
        });
    }
});


// GET trending events
app.get('/events-trending', auth, async (req, res) => {
    try {
        // Get events with the most recent registrations (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const trending = await Registration.aggregate([
            { $match: { registrationDate: { $gte: sevenDaysAgo } } },
            { $group: { _id: '$eventId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const trendingEventIds = trending.map(t => t._id);
        const trendingEvents = await Event.find({
            _id: { $in: trendingEventIds },
            status: { $in: ['Published', 'Ongoing'] }
        }).populate('orgId', 'orgName firstName email');

        // Attach registration counts
        const result = trendingEvents.map(ev => {
            const match = trending.find(t => t._id.toString() === ev._id.toString());
            return { ...ev.toObject(), recentRegCount: match ? match.count : 0 };
        });

        // Sort by count descending
        result.sort((a, b) => b.recentRegCount - a.recentRegCount);

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch trending events', details: err.message });
    }
});



// register for an event
// usage: POST /register-event/<eventId>
app.post('/register-event/:id', auth, async (req, res) => {
    try {
        const eventId = req.params.id; // get eventId from url
        const userId = req.user.userId; // get userId from token
        const { merchandiseSelection, paymentProof, customFieldResponses } = req.body;

        const event = await Event.findById(eventId);
        if (!event) { // if event is not found return error
            return res.status(404).json({ error: 'Event not found.' });
        }

        if (new Date() > new Date(event.regDeadline)) {
            return res.status(400).json({ error: 'Registration deadline has passed.' });
        }

        const regExists = await Registration.findOne({ eventId, userId });
        if (regExists) { // if registration already exists
            return res.status(400).json({ error: 'You are already registered for this event.' });
        }

        // Get user info for email
        const user = await User.findById(userId);

        if (event.eventType === 'normal') {
            const currentCount = await Registration.countDocuments({ eventId, status: 'Registered' });
            if (event.regLimit && currentCount >= event.regLimit) {
                return res.status(400).json({ error: 'Event is fully booked.' });
            }

            // create new document(row)
            // new registration
            const newReg = await Registration.create({
                eventId,
                userId,
                ticketId: uuidv4(), // generates unique ticket id
                status: 'Registered',
                customFieldResponses: customFieldResponses || {}
            });

            // Update registration count
            await Event.findByIdAndUpdate(eventId, { $inc: { registrationCount: 1 } });

            // Send ticket email to participant
            if (user && user.email) {
                sendTicketEmail(
                    user.email,
                    user.firstName || 'Participant',
                    event.eventName,
                    newReg.ticketId,
                    'normal',
                    { eventStart: event.eventStart }
                );
            }

            return res.status(201).json({ message: 'Registration successful! Check your email for the ticket.', registration: newReg });
        }

        else if (event.eventType === 'merchandise') {
            if (!merchandiseSelection) return res.status(400).json({ error: 'No item selected.' });

            // find the specific item inside the event
            const item = event.merchandiseItems.id(merchandiseSelection.itemId);
            if (!item) return res.status(404).json({ error: 'Item not found.' });

            const requestedQuantity = merchandiseSelection.quantity || 1;

            // Validate purchase limit
            if (item.purchaseLimit && requestedQuantity > item.purchaseLimit) {
                return res.status(400).json({ error: `Maximum ${item.purchaseLimit} items allowed per person.` });
            }

            // Validate stock
            if (item.stock < requestedQuantity) {
                return res.status(400).json({ error: `Only ${item.stock} items in stock.` });
            }

            if (!paymentProof) {
                return res.status(400).json({ error: 'Payment proof is required for merchandise purchases.' });
            }

            // create record in 'Pending' state
            // decrement stock when organizer approves 
            const newReg = await Registration.create({
                eventId,
                userId,
                ticketId: uuidv4(),
                status: 'Pending',
                paymentProof: paymentProof,
                purchaseDetails: {
                    itemId: merchandiseSelection.itemId,
                    variant: merchandiseSelection.variant,
                    color: merchandiseSelection.color,
                    quantity: requestedQuantity
                },
                customFieldResponses: customFieldResponses || {}
            });

            // Update registration count
            await Event.findByIdAndUpdate(eventId, { $inc: { registrationCount: 1 } });

            return res.status(201).json({ message: 'Order placed. Pending organizer approval!', registration: newReg });
        }

    } catch (err) {
        console.log("Registration Error Details:", err);
        res.status(500).json({ error: 'Registration failed', details: err.message });
    }
});


// Unregister from an event 
// Usage : DELETE /unregister/:eventId
app.delete('/unregister/:eventId', auth, async (req, res) => {
    try {
        const eventId = req.params.eventId; // get eventId from url
        const userId = req.user.userId; // get userId from token

        // if event is not found return error
        if (!(await Event.findById(eventId))) {
            return res.status(400).json({ error: 'Event not found.' })
        }

        // if registration does not exist to be deleted
        const regExists = await Registration.findOne({ eventId, userId });

        if (!regExists) {
            return res.status(400).json({ error: 'You are not registered for this event.' });
        }
        // delete one document(row)
        const m = await Registration.deleteOne({ eventId, userId });

        res.status(201).json({ message: 'Deletion successful!', m });
    } catch (err) {
        console.log("Registration Error Details:", err);
        res.status(500).json({ error: 'Registration failed' });
    }
});




// Update Profile
app.put('/profile', auth, async (req, res) => {
    try {
        const updateData = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            contactNumber: req.body.contactNumber
        };

        // Allow participants to update collegeName
        if (req.user.role === 'participant') {
            if (req.body.collegeName !== undefined) updateData.collegeName = req.body.collegeName;
            if (req.body.areasOfInterest !== undefined) updateData.areasOfInterest = req.body.areasOfInterest;
        }

        // Allow organizers to update description, discord webhook, and contact email
        if (req.user.role === 'organizer') {
            if (req.body.description !== undefined) updateData.description = req.body.description;
            if (req.body.discordWebhookUrl !== undefined) updateData.discordWebhookUrl = req.body.discordWebhookUrl;
            if (req.body.category !== undefined) updateData.category = req.body.category;
            if (req.body.contactEmail !== undefined) updateData.contactEmail = req.body.contactEmail;
        }

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updateData,
            { new: true } // returns modifed document instead of document that was present before
        ).select('-password');

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Update failed', details: err.message });
    }
});

// Onboarding - save participant preferences after signup
app.post('/onboarding', auth, async (req, res) => {
    try {
        if (req.user.role !== 'participant') {
            return res.status(403).json({ error: 'Onboarding is only for participants.' });
        }

        const { areasOfInterest, followingClubs, skip } = req.body;

        const updateData = {
            onboardingCompleted: true
        };

        if (!skip) {
            if (areasOfInterest && Array.isArray(areasOfInterest)) {
                updateData.areasOfInterest = areasOfInterest;
            }
            if (followingClubs && Array.isArray(followingClubs)) {
                updateData.following = followingClubs;
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updateData,
            { new: true }
        ).select('-password');

        res.json({ message: 'Preferences saved!', user });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save preferences', details: err.message });
    }
});

// List All Organizers (sorted by preference match)
app.get('/all-organizers', auth, async (req, res) => {
    try {
        // Find all users who have the role 'organizer' and are not disabled
        const organizers = await User.find(
            { role: 'organizer', isDisabled: { $ne: true } })
            .select('orgName firstName lastName email category description _id'
            );

        // Get current user's preferences for personalized ordering
        const currentUser = await User.findById(req.user.userId);
        const userInterests = (currentUser?.areasOfInterest || []).map(i => i.toLowerCase());
        const userFollowing = currentUser?.following || [];

        if (userInterests.length > 0 || userFollowing.length > 0) {
            // Score each organizer based on category match with user interests
            const scoredOrganizers = organizers.map(org => {
                let score = 0;
                const orgCategory = (org.category || '').toLowerCase();
                const orgDescription = (org.description || '').toLowerCase();
                const orgName = (org.orgName || '').toLowerCase();

                // Check if user follows this organizer (highest priority)
                if (userFollowing.some(fId => fId.toString() === org._id.toString())) {
                    score += 100; // Followed organizers at top
                }

                // Match category with user interests
                for (const interest of userInterests) {
                    const interestLower = interest.toLowerCase();
                    // Exact category match
                    if (orgCategory === interestLower) {
                        score += 30;
                    } 
                    // Partial category match
                    else if (orgCategory.includes(interestLower) || interestLower.includes(orgCategory)) {
                        score += 15;
                    }
                    // Check description for interest mentions
                    if (orgDescription.includes(interestLower)) {
                        score += 5;
                    }
                    // Check org name
                    if (orgName.includes(interestLower)) {
                        score += 3;
                    }
                }

                return { ...org.toObject(), _preferenceScore: score };
            });

            // Sort by preference score (descending), then alphabetically by orgName
            scoredOrganizers.sort((a, b) => {
                if (b._preferenceScore !== a._preferenceScore) {
                    return b._preferenceScore - a._preferenceScore;
                }
                return (a.orgName || '').localeCompare(b.orgName || '');
            });

            return res.json(scoredOrganizers);
        }

        // No preferences - return alphabetically sorted
        const sorted = organizers.sort((a, b) => (a.orgName || '').localeCompare(b.orgName || ''));
        res.json(sorted);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch organizers' });
    }
});


// Get single organizer public profile
app.get('/organizer/:id', auth, async (req, res) => {
    try {
        const organizer = await User.findById(req.params.id)
            .select('orgName firstName lastName email contactEmail category description contactNumber _id');

        if (!organizer || organizer.role === 'admin') {
            return res.status(404).json({ error: 'Organizer not found.' });
        }

        // Get upcoming events
        const now = new Date();
        const upcomingEvents = await Event.find({
            orgId: req.params.id,
            eventStart: { $gte: now },
            status: { $in: ['Published', 'Ongoing'] }
        }).sort({ eventStart: 1 });

        // Get past events
        const pastEvents = await Event.find({
            orgId: req.params.id,
            eventEnd: { $lt: now }
        }).sort({ eventStart: -1 });

        res.json({
            organizer,
            upcomingEvents,
            pastEvents
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch organizer profile', details: err.message });
    }
});


// 3. Follow / unfollow club 
app.post('/follow/:organizerId', auth, async (req, res) => {
    try {
        const organizerId = req.params.organizerId;
        const userId = req.user.userId;

        const user = await User.findById(userId);

        // Check if already following
        if (user.following.includes(organizerId)) {
            // Unfollow: remove from array
            user.following.pull(organizerId);
            await user.save();
            return res.json({ message: 'Unfollowed successfully', following: user.following });
        } else {
            // Follow: add to array
            user.following.push(organizerId);
            await user.save();
            return res.json({ message: 'Followed successfully', following: user.following });
        }
    } catch (err) {
        res.status(500).json({ error: 'Action failed', details: err.message });
    }
});

// --------------------- Admin code ------------------------

// Admin-only route to create organizers
app.post('/admin/create-organizer', auth, async (req, res) => {
    try {
        // deny if not admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Exclusive Admin privilege.' });
        }
        // create organizer record
        await addUserDocument(req, res, 'organizer', null);

    } catch (err) {
        res.status(500).json({ error: 'Failed to create organizer.', details: err.message });
    }
});


// Admin: List all organizers (including disabled) for management
app.get('/admin/organizers', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Exclusive Admin privilege.' });
        }

        const organizers = await User.find({ role: 'organizer' })
            .select('orgName firstName lastName email category description isDisabled isArchived _id createdAt');

        res.json(organizers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch organizers', details: err.message });
    }
});


// Admin: Get organizer credentials
app.get('/admin/organizers/:id/credentials', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Exclusive Admin privilege.' });
        }

        const user = await User.findById(req.params.id).select('email plainPassword');
        if (!user || user.role === 'admin') {
            return res.status(404).json({ error: 'Organizer not found.' });
        }

        res.json({ 
            email: user.email, 
            password: user.plainPassword || '(Password not stored - created before this feature)'
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch credentials', details: err.message });
    }
});


// Admin: Delete or archive organizer
app.delete('/admin/organizers/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Exclusive Admin privilege.' });
        }

        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'organizer') {
            return res.status(404).json({ error: 'Organizer not found.' });
        }

        const { permanent } = req.body;
        
        if (permanent) {
            // Permanently delete
            await User.findByIdAndDelete(req.params.id);
            res.json({ message: 'Organizer permanently deleted.' });
        } else {
            // Archive (soft delete)
            user.isArchived = true;
            user.isDisabled = true;
            await user.save();
            res.json({ message: 'Organizer archived successfully.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove organizer', details: err.message });
    }
});


// Admin: Toggle disable/enable organizer
app.put('/admin/organizers/:id/toggle-disable', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Exclusive Admin privilege.' });
        }

        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'organizer') {
            return res.status(404).json({ error: 'Organizer not found.' });
        }

        user.isDisabled = !user.isDisabled;
        
        // If enabling, also restore from archived state
        if (!user.isDisabled) {
            user.isArchived = false;
        }
        
        await user.save();

        res.json({ message: `Organizer ${user.isDisabled ? 'disabled' : 'enabled'} successfully.`, organizer: user });
    } catch (err) {
        res.status(500).json({ error: 'Failed to toggle organizer status', details: err.message });
    }
});



// POST request to scan ticket and mark attendance
app.post('/events/scan-ticket', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Only organizers can scan tickets.' });
        }

        const { ticketId, eventId } = req.body;

        if (!ticketId) {
            return res.status(400).json({ error: 'Ticket ID is required.' });
        }

        // find ticket and populate event details
        const registration = await Registration.findOne({ ticketId: ticketId }).populate('eventId');

        if (!registration) {
            return res.status(404).json({ error: 'Invalid Ticket. No registration found.' });
        }

        // Validate ticket belongs to selected event if eventId is provided
        if (eventId && registration.eventId._id.toString() !== eventId) {
            return res.status(400).json({ 
                error: `This ticket is for "${registration.eventId.eventName}", not the selected event.` 
            });
        }

        // not the owner of the event
        if (registration.eventId.orgId.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You are not authorized to scan tickets for this event.' });
        }

        // check for duplicate scans or cancelled tickets
        if (registration.status === 'Attended') {
            return res.status(400).json({
                error: 'Duplicate Scan! This ticket has already been used.',
                participantId: registration.userId
            });
        }

        if (registration.status === 'Cancelled' || registration.status === 'Pending' || registration.status === 'Rejected') {
            return res.status(400).json({ error: `Cannot mark attendance. Ticket status is: ${registration.status}` });
        }

        registration.status = 'Attended';
        registration.attendanceTime = new Date();

        await registration.save();

        res.json({
            message: 'Attendance marked successfully!',
            ticketId: registration.ticketId,
            eventId: registration.eventId._id,
            attendanceTime: registration.attendanceTime
        });

    } catch (err) {
        console.log("Error scanning ticket:", err.message);
        res.status(500).json({ error: 'Failed to process ticket scan.', details: err.message });
    }
});


// GET live attendance stats for an event (for real-time dashboard)
app.get('/events/:id/attendance-live', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied.' });
        }

        const eventId = req.params.id;
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        if (event.orgId.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized.' });
        }

        // Get all registrations for this event
        const registrations = await Registration.find({ eventId: eventId })
            .populate('userId', 'firstName lastName email participantType')
            .sort({ attendanceTime: -1 });

        const totalRegistered = registrations.filter(r => r.status !== 'Cancelled' && r.status !== 'Rejected').length;
        const attended = registrations.filter(r => r.status === 'Attended');
        const attendedCount = attended.length;
        const pending = totalRegistered - attendedCount;

        // Recent scans (last 10)
        const recentScans = attended.slice(0, 10).map(r => ({
            name: `${r.userId?.firstName || ''} ${r.userId?.lastName || ''}`,
            email: r.userId?.email,
            ticketId: r.ticketId,
            attendanceTime: r.attendanceTime,
            participantType: r.userId?.participantType
        }));

        // Full participant lists for dashboard
        const validRegistrations = registrations.filter(r => r.status !== 'Cancelled' && r.status !== 'Rejected');
        
        const scannedParticipants = validRegistrations.filter(r => r.status === 'Attended').map(r => ({
            name: `${r.userId?.firstName || ''} ${r.userId?.lastName || ''}`,
            email: r.userId?.email,
            ticketId: r.ticketId,
            participantType: r.userId?.participantType,
            attendanceTime: r.attendanceTime
        }));
        
        const notScannedParticipants = validRegistrations.filter(r => r.status !== 'Attended').map(r => ({
            name: `${r.userId?.firstName || ''} ${r.userId?.lastName || ''}`,
            email: r.userId?.email,
            ticketId: r.ticketId,
            participantType: r.userId?.participantType,
            status: r.status
        }));

        res.json({
            eventName: event.eventName,
            totalRegistered,
            attendedCount,
            pending,
            attendanceRate: totalRegistered > 0 ? ((attendedCount / totalRegistered) * 100).toFixed(1) : 0,
            recentScans,
            scannedParticipants,
            notScannedParticipants
        });

    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch attendance stats', details: err.message });
    }
});

// Export attendance report as CSV for scan ticket page
app.get('/events/:id/attendance-csv', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied.' });
        }

        const eventId = req.params.id;
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        if (event.orgId.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized.' });
        }

        const registrations = await Registration.find({ eventId: eventId })
            .populate('userId', 'firstName lastName email participantType')
            .sort({ attendanceTime: -1 });

        const validRegistrations = registrations.filter(r => r.status !== 'Cancelled' && r.status !== 'Rejected');

        // Build CSV
        let csv = 'Name,Email,Participant Type,Ticket ID,Status,Attendance Time\n';
        
        validRegistrations.forEach(r => {
            const name = `${r.userId?.firstName || ''} ${r.userId?.lastName || ''}`.replace(/,/g, ' ');
            const email = r.userId?.email || '';
            const participantType = r.userId?.participantType || '';
            const ticketId = r.ticketId || '';
            const status = r.status === 'Attended' ? 'Scanned' : 'Not Scanned';
            const attendanceTime = r.attendanceTime ? new Date(r.attendanceTime).toLocaleString() : 'N/A';
            
            csv += `"${name}","${email}","${participantType}","${ticketId}","${status}","${attendanceTime}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${event.eventName.replace(/[^a-z0-9]/gi, '_')}_attendance.csv"`);
        res.send(csv);

    } catch (err) {
        res.status(500).json({ error: 'Failed to export attendance CSV', details: err.message });
    }
});




// organizer requests a password reset (authenticated route)
app.post('/password-reset/request', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ error: 'Only organizers can request password resets.' });
        }

        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ error: 'You must provide a reason for the reset.' });
        }

        // create a new pending request in database
        const newRequest = await PasswordReset.create({
            organizerId: req.user.userId,
            reason: reason
        });

        res.status(201).json({ message: 'Password reset request sent to Admin successfully.', request: newRequest });

    } catch (err) {
        res.status(500).json({ error: 'Failed to submit request.', details: err.message });
    }
});

// Unauthenticated password reset request (for organizers who forgot password)
app.post('/password-reset/request-unauthenticated', async (req, res) => {
    try {
        const { email, reason } = req.body;

        if (!email || !reason) {
            return res.status(400).json({ error: 'Email and reason are required.' });
        }

        const user = await User.findOne({ email, role: 'organizer' });
        if (!user) {
            return res.status(404).json({ error: 'No organizer account found with that email.' });
        }

        const newRequest = await PasswordReset.create({
            organizerId: user._id,
            reason: reason
        });

        res.status(201).json({ message: 'Password reset request submitted. Admin will review it shortly.' });

    } catch (err) {
        res.status(500).json({ error: 'Failed to submit request.', details: err.message });
    }
});


// admin view all password reset requests
app.get('/admin/password-resets', auth, async (req, res) => {
    try {
        // only admins can view the list
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Exclusive Admin privilege.' });
        }

        // fetch all requests
        const requests = await PasswordReset.find()
            .populate('organizerId', 'orgName email')
            .sort({ createdAt: -1 }); // sorts by newest first

        res.json(requests);

    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch requests.', details: err.message });
    }
});


// admin approve or reject a password reset request
app.put('/admin/password-resets/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Exclusive Admin privilege.' });
        }

        const { action, comments } = req.body; // action should be 'approve' or 'reject'
        const requestId = req.params.id;

        // find the specific request
        const resetRequest = await PasswordReset.findById(requestId);
        if (!resetRequest) {
            return res.status(404).json({ error: 'Request not found.' });
        }

        // prevent modifying requests that are done
        if (resetRequest.status !== 'Pending') {
            return res.status(400).json({ error: `This request was already ${resetRequest.status}.` });
        }

        // save the admin comments to the database
        resetRequest.adminComments = comments || "No comments provided.";

        if (action === 'approve') {
            // auto generate a random 8-character password 
            // append "!A1" to ensure it passes standard complexity checks if you add them later
            const newPlainPassword = Math.random().toString(36).slice(-8) + "!A1";

            // hash the new password securely
            const hashedPass = await bcrypt.hash(newPlainPassword, 10);

            // update the actual user document with new hashed password
            await User.findByIdAndUpdate(resetRequest.organizerId, { password: hashedPass });

            resetRequest.status = 'Approved';
            await resetRequest.save();

            // send new plaintext password to the admin so they can email/message the organizer
            return res.json({
                message: 'Request Approved. Please share this new password with the organizer.',
                newPassword: newPlainPassword
            });

        } else if (action === 'reject') {
            resetRequest.status = 'Rejected';
            await resetRequest.save();

            return res.json({ message: 'Request Rejected successfully.' });
        } else {
            return res.status(400).json({ error: 'Invalid action. Use "approve" or "reject".' });
        }

    } catch (err) {
        res.status(500).json({ error: 'Failed to process request.', details: err.message });
    }
});


// get all messages for an event's forum
app.get('/events/:eventId/forum', auth, async (req, res) => {
    try {
        const { eventId } = req.params;

        // verify the event exists
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        // only allow registered participants, event organizer, or an admin to view the forum
        const organizer = event.orgId.toString() === req.user.userId;
        const admin = req.user.role === 'admin';

        // check if user is registered
        const registration = await Registration.findOne({
            eventId: eventId,
            userId: req.user.userId,
            status: { $in: ['Registered', 'Attended'] }
        });

        if (!organizer && !admin && !registration) {
            return res.status(403).json({ error: 'You must be registered for this event to view the discussion forum.' });
        }

        // fetch messages, newest at the bottom (ascending order)
        // populate the senderId so the frontend can display the user's name
        const messages = await ForumMessage.find({ eventId: eventId })
            .populate('senderId', 'firstName lastName role')
            .sort({ createdAt: 1 });

        res.json(messages);

    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch forum messages.', details: err.message });
    }
});


// POST new message to forum
app.post('/events/:eventId/forum', auth, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { message, isAnnouncement } = req.body;

        if (!message) return res.status(400).json({ error: 'Message text is required.' });

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        const organizer = event.orgId.toString() === req.user.userId;
        const admin = req.user.role === 'admin';

        const registration = await Registration.findOne({
            eventId: eventId,
            userId: req.user.userId,
            status: { $in: ['Registered', 'Attended'] }
        });

        if (!organizer && !admin && !registration) {
            return res.status(403).json({ error: 'You must be registered to post in this forum.' });
        }

        // create message
        const newMessage = await ForumMessage.create({
            eventId: eventId,
            senderId: req.user.userId,
            message: message,
            // only organizers/admins are allowed to make announcements
            isAnnouncement: (isAnnouncement && (organizer || admin)) ? true : false
        });

        res.status(201).json(newMessage);

    } catch (err) {
        res.status(500).json({ error: 'Failed to post message.', details: err.message });
    }
});


// organizer delete or pin a message
app.put('/forum/:messageId/moderate', auth, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { action } = req.body; // 'delete' or 'pin' / 'unpin'

        const forumMsg = await ForumMessage.findById(messageId).populate('eventId');
        if (!forumMsg) return res.status(404).json({ error: 'Message not found.' });

        // only the organizer of this event (or an admin) can moderate
        const event = forumMsg.eventId;
        if (event.orgId.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only the event organizer can moderate this forum.' });
        }

        if (action === 'delete') {
            await ForumMessage.findByIdAndDelete(messageId);
            return res.json({ message: 'Message deleted successfully.' });
        }
        else if (action === 'pin') {
            forumMsg.isPinned = true;
            await forumMsg.save();
            return res.json({ message: 'Message pinned.', forumMsg });
        }
        else if (action === 'unpin') {
            forumMsg.isPinned = false;
            await forumMsg.save();
            return res.json({ message: 'Message unpinned.', forumMsg });
        }
        else {
            return res.status(400).json({ error: 'Invalid action.' });
        }

    } catch (err) {
        res.status(500).json({ error: 'Failed to moderate message.', details: err.message });
    }
});


// participant submit anonymous feedback
app.post('/events/:eventId/feedback', auth, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { rating, comments } = req.body;

        // only participants can leave feedback
        if (req.user.role !== 'participant') {
            return res.status(403).json({ error: 'Only participants can submit feedback.' });
        }

        // validate rating is a number btw 1 and 5
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Please provide a valid rating between 1 and 5.' });
        }

        // users can only submit feedback for events they have attended
        const registration = await Registration.findOne({
            eventId: eventId,
            userId: req.user.userId,
            status: 'Attended'
        });

        if (!registration) {
            return res.status(403).json({ error: 'You can only leave feedback for events you have attended.' });
        }

        // save feedback
        await Feedback.create({
            eventId: eventId,
            rating: rating,
            comments: comments
        });

        res.status(201).json({ message: 'Anonymous feedback submitted successfully!' });

    } catch (err) {
        res.status(500).json({ error: 'Failed to submit feedback.', details: err.message });
    }
});


// org can view aggregated feedback stats
app.get('/events/:eventId/feedback', auth, async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        // only organizer of the event or admin can view feedback
        if (event.orgId.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only the event organizer can view feedback.' });
        }

        // fetch all feedback documents for the event
        const feedbacks = await Feedback.find({ eventId: eventId });

        // calculate statistics for the organizer dashboard
        let totalRating = 0;
        let ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        feedbacks.forEach(fb => {
            totalRating += fb.rating;
            ratingCounts[fb.rating] += 1; // count how many 1-star, 2-star..
        });

        // .toFixed(n) rounds to n digits and returns a string
        // calculate avg avoid divide by zero if no feedback 
        const averageRating = feedbacks.length > 0 ? (totalRating / feedbacks.length).toFixed(2) : 0;

        res.json({
            totalFeedbackCount: feedbacks.length,
            averageRating: averageRating,
            ratingDistribution: ratingCounts,
            rawFeedback: feedbacks // frontend can use this to display list of text comms
        });

    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch feedback stats.', details: err.message });
    }
});


// Get single event details (public)
app.get('/events/:id/details', auth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('orgId', 'orgName firstName lastName email');

        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        res.json(event);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch event details', details: err.message });
    }
});


// Get user's registration for a specific event
app.get('/my-registration/:eventId', auth, async (req, res) => {
    try {
        const registration = await Registration.findOne({
            eventId: req.params.eventId,
            userId: req.user.userId
        });

        if (!registration) {
            return res.status(404).json({ error: 'Not registered for this event.' });
        }

        res.json(registration);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch registration', details: err.message });
    }
});


// ====== PARTICIPANT PASSWORD RESET (Email-based) ======

// Request password reset - sends email with reset link (participants only)
app.post('/participant/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // Only allow password reset for participants
        if (user.role !== 'participant') {
            return res.status(403).json({ 
                error: 'Password reset via email is only available for participant accounts. Organizers and admins should use the admin password reset request process.' 
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour

        // Store token in user document
        user.passwordResetToken = resetToken;
        user.passwordResetExpiry = resetTokenExpiry;
        await user.save();

        // Send email
        const emailSent = await sendPasswordResetEmail(user.email, user.firstName, resetToken);

        if (!emailSent) {
            return res.status(500).json({ error: 'Failed to send reset email. Please try again later.' });
        }

        res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (err) {
        console.error('Password reset request error:', err);
        res.status(500).json({ error: 'Failed to process password reset request', details: err.message });
    }
});

// Verify reset token
app.get('/participant/verify-reset-token/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token.' });
        }

        res.json({ valid: true, email: user.email });
    } catch (err) {
        res.status(500).json({ error: 'Failed to verify token', details: err.message });
    }
});

// Reset password with token
app.post('/participant/reset-password', async (req, res) => {
    try {
        const { token, email, newPassword } = req.body;

        if (!token || !email || !newPassword) {
            return res.status(400).json({ error: 'Token, email, and new password are required.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        const user = await User.findOne({
            email: email.toLowerCase(),
            passwordResetToken: token,
            passwordResetExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token, or email does not match.' });
        }

        // Only allow for participants
        if (user.role !== 'participant') {
            return res.status(403).json({ error: 'Password reset via email is only available for participant accounts.' });
        }

        // Hash new password and save
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpiry = undefined;
        await user.save();

        res.json({ message: 'Password reset successful! You can now login with your new password.' });
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({ error: 'Failed to reset password', details: err.message });
    }
});

const PORT = process.env.PORT || 3001;

mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('MongoDB connected');

    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`);
    });

}).catch(err => {
    console.error('MongoDB connection error:', err);
});