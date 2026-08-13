// backend/middleware/rateLimiters.js
const rateLimit = require('express-rate-limit');

// Login: slow down brute-force password guessing.
// 10 attempts per 15 minutes per IP.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Public write endpoints (bookings, returns): stop scripted spam that
// would otherwise fire dozens of emails through the Gmail account.
// 20 submissions per 15 minutes per IP.
const publicWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { loginLimiter, publicWriteLimiter };
