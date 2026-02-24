const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); 
require('dotenv').config();


// process is global object in Node.js that provides info about control over current 
// application process 
mongoose.connect(process.env.MONGO_URI).then(async () => {
    // check if admin already exists
    const adminExists = await User.findOne({role : 'admin'});
    
    if (adminExists) {
        console.log('Admin already exists.');
        process.exit();
    }
    // ------------------------------------------

    // create Admin record in table
    const hashedPass = await bcrypt.hash('Admin123@', 10);
    await User.create({
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@felicity.iiit.ac.in', // Admin email 
        role: 'admin',
        password: hashedPass
    })
    // ------------------------------------------

    console.log("Admin created successfully!");
    process.exit();

}).catch(err => console.log(err));





// admin: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OThiMWQxZWFiM2FmYWI0ODkwZTllY2MiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NzA3MjUwMTUsImV4cCI6MTc3MDcyODYxNX0.us8ma_vuZKqKeFve70-2it5TfMcYge95P9wM4OnrpGA