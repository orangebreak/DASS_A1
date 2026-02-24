const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const token = req.header('auth-token');
    if (!token) return res.status(401).send('Access Denied');

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // what is stored in req.user is the following:
        // {
        //     "userId": "65c3f9b2e8...",   (The User's unique MongoDB ID)
        //     "role": "participant",       (The Role (participant/organizer/admin))
        //     "iat": 1707389000,           ("Issued At" (When the token was created))
        //     "exp": 1707392600            ("Expiration" (When the token dies))
        // }
        next();
    } catch {
        res.status(400).send('Invalid Token');
    }
 
};