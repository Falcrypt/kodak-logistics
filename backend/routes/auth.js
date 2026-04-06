// backend/routes/auth.js
// This file handles login and authentication

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// POST /api/auth/login - Login endpoint
router.post('/login', async (req, res) => {
    try {
        console.log("📥 Login attempt received:", req.body.username);
        
        const { username, password } = req.body;
        
        // Check if username and password were provided
        if (!username || !password) {
            console.log("❌ Missing username or password");
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        // Find admin in database
        let admin = await db.getOne('SELECT * FROM admin_users WHERE username = ?', [username]);
        
        // If no admin exists, create default admin (first time only)
        if (!admin) {
            console.log('👤 Creating default admin user...');
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 10);
            const adminId = await db.insert(
                'INSERT INTO admin_users (username, password_hash, email) VALUES (?, ?, ?)',
                [username, hashedPassword, 'admin@kodak.com']
            );
            
            admin = await db.getOne('SELECT * FROM admin_users WHERE id = ?', [adminId]);
            console.log("✅ Default admin created with ID:", adminId);
        }
        
        // Check password
        console.log("🔐 Verifying password...");
        const validPassword = await bcrypt.compare(password, admin.password_hash);
        
        if (!validPassword) {
            console.log("❌ Invalid password for user:", username);
            return res.status(401).json({ error: 'Invalid password' });
        }
        
        // Create JWT token
        const token = jwt.sign(
            { 
                id: admin.id, 
                username: admin.username 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
        
        console.log("✅ Login successful for:", username);
        
        // Send success response
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