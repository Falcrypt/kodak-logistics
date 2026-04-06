// backend/middleware/auth.js
// This file checks if user is logged in

const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        
        // Save user info in request
        req.user = user;
        next();
    });
}

module.exports = { authenticateToken };