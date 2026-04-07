// backend/routes/settings.js
// This file handles prices and business settings

const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const router = express.Router();

// ========== PUBLIC ENDPOINT (no login required) ==========

// GET /api/settings/public - Get public settings (prices only)
router.get('/public', async (req, res) => {
    try {
        // PostgreSQL uses LIKE with $1 placeholder
        const settings = await db.query(
            "SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE $1",
            ['price_%']
        );
        
        const prices = {};
        settings.forEach(s => {
            const key = s.setting_key.replace('price_', '');
            prices[key] = parseFloat(s.setting_value);
        });
        
        res.json(prices);
        
    } catch (error) {
        console.error('Get public settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// ========== ADMIN ENDPOINTS (login required) ==========

// GET /api/settings - Get all settings
router.get('/', authenticateToken, async (req, res) => {
    try {
        const settings = await db.query('SELECT setting_key, setting_value FROM settings');
        
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.setting_key] = s.setting_value;
        });
        
        res.json(settingsObj);
        
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// PUT /api/settings - Update settings
router.put('/', authenticateToken, async (req, res) => {
    try {
        const updates = req.body;
        const userId = req.user.id;
        
        // ===== HANDLE PASSWORD CHANGE =====
        if (updates.current_password && updates.new_password) {
            // PostgreSQL uses $1
            const admin = await db.getOne('SELECT * FROM admin_users WHERE id = $1', [userId]);
            
            const validPassword = await bcrypt.compare(updates.current_password, admin.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
            
            const newHash = await bcrypt.hash(updates.new_password, 10);
            
            await db.update(
                'UPDATE admin_users SET password_hash = $1 WHERE id = $2',
                [newHash, userId]
            );
        }
        
        // ===== HANDLE SETTINGS UPDATE =====
        const settingKeys = [
            'whatsapp_number', 
            'business_email', 
            'price_small', 
            'price_medium', 
            'price_big', 
            'price_fridge'
        ];
        
        for (const key of settingKeys) {
            if (updates[key] !== undefined) {
                await db.update(
                    'UPDATE settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2',
                    [updates[key].toString(), key]
                );
            }
        }
        
        res.json({ success: true, message: 'Settings updated successfully' });
        
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;