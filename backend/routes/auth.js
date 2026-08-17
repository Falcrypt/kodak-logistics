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
                username: admin.username,
                avatar_url: admin.avatar_url || null
            }
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// GET /api/auth/verify - Verify token is valid
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        const admin = await db.getOne('SELECT id, username, avatar_url FROM admin_users WHERE id = $1', [req.user.id]);
        res.json({
            valid: true,
            user: admin || req.user
        });
    } catch (error) {
        res.json({ valid: true, user: req.user });
    }
});

// PUT /api/auth/avatar - Upload/update the logged-in admin's profile picture
// Stored directly in Postgres as a data URL (small, resized client-side)
// rather than on disk, since Render's free-tier filesystem is wiped on
// every redeploy/restart and would lose any uploaded file.
router.put('/avatar', authenticateToken, async (req, res) => {
    try {
        const { avatar } = req.body;

        if (!avatar || typeof avatar !== 'string' || !avatar.startsWith('data:image/')) {
            return res.status(400).json({ error: 'A valid image data URL is required' });
        }

        // ~1.5MB base64 ceiling — client resizes images well below this,
        // this is just a backstop against abuse.
        if (avatar.length > 1_500_000) {
            return res.status(413).json({ error: 'Image is too large' });
        }

        await db.update('UPDATE admin_users SET avatar_url = $1 WHERE id = $2', [avatar, req.user.id]);
        res.json({ success: true, avatar_url: avatar });
    } catch (error) {
        console.error('❌ Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to save profile picture' });
    }
});

// DELETE /api/auth/avatar - Remove the logged-in admin's profile picture
router.delete('/avatar', authenticateToken, async (req, res) => {
    try {
        await db.update('UPDATE admin_users SET avatar_url = NULL WHERE id = $1', [req.user.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Avatar delete error:', error);
        res.status(500).json({ error: 'Failed to remove profile picture' });
    }
});

// GET /api/auth/test - Simple test endpoint
router.get('/test', (req, res) => {
    res.json({ message: 'Auth route is working!' });
});

module.exports = router;