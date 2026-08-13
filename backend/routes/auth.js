// backend/routes/auth.js
// This file handles login and authentication

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiters');
const router = express.Router();

// POST /api/auth/login - Login endpoint
router.post('/login', loginLimiter, async (req, res) => {
    try {
        console.log("📥 Login attempt received:", req.body.username);
        
        const { username, password } = req.body;
        
        if (!username || !password) {
            console.log("❌ Missing username or password");
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        // PostgreSQL uses $1 instead of ?
        const admin = await db.getOne('SELECT * FROM admin_users WHERE username = $1', [username]);

        if (!admin) {
            console.log('❌ Login attempt for unknown user:', username);
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        console.log("🔐 Verifying password...");
        const validPassword = await bcrypt.compare(password, admin.password_hash);
        
        if (!validPassword) {
            console.log("❌ Invalid password for user:", username);
            return res.status(401).json({ error: 'Invalid password' });
        }
        
        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );
        
        console.log("✅ Login successful for:", username);
        
        res.json({
            success: true,
            token: token,
            user: {
                id: admin.id,
                username: admin.username
            }
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// GET /api/auth/verify - Verify token is valid
router.get('/verify', authenticateToken, (req, res) => {
    res.json({ 
        valid: true, 
        user: req.user 
    });
});

// GET /api/auth/test - Simple test endpoint
router.get('/test', (req, res) => {
    res.json({ message: 'Auth route is working!' });
});

module.exports = router;