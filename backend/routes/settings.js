// backend/routes/settings.js
// This file handles prices and business settings

const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const router = express.Router();

// ========== PUBLIC ENDPOINT (no login required) ==========

// GET /api/settings/public - Get public settings (prices only)
// This is used by the public website to show current prices
router.get('/public', async (req, res) => {
    try {
        // Get all settings that start with 'price_' from database
        const settings = await db.query(
            "SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'price_%'"
        );
        
        // Convert to object format: { small: 40, medium: 50, ... }
        const prices = {};
        settings.forEach(s => {
            // Remove 'price_' from the key name
            const key = s.setting_key.replace('price_', '');
            prices[key] = parseFloat(s.setting_value);
        });
        
        // Send prices back to the website
        res.json(prices);
        
    } catch (error) {
        console.error('Get public settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// ========== ADMIN ENDPOINTS (login required) ==========

// GET /api/settings - Get all settings (for admin panel)
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Get ALL settings from database
        const settings = await db.query('SELECT setting_key, setting_value FROM settings');
        
        // Convert to object
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.setting_key] = s.setting_value;
        });
        
        // Send all settings to admin panel
        res.json(settingsObj);
        
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// PUT /api/settings - Update settings (for admin panel)
router.put('/', authenticateToken, async (req, res) => {
    try {
        const updates = req.body;  // Data sent from admin panel
        const userId = req.user.id; // ID of admin who is logged in
        
        // ===== HANDLE PASSWORD CHANGE =====
        // If admin is trying to change password
        if (updates.current_password && updates.new_password) {
            // Get current admin from database
            const admin = await db.getOne('SELECT * FROM admin_users WHERE id = ?', [userId]);
            
            // Check if current password is correct
            const validPassword = await bcrypt.compare(updates.current_password, admin.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
            
            // Hash the new password (encrypt it)
            const newHash = await bcrypt.hash(updates.new_password, 10);
            
            // Save new password to database
            await db.update(
                'UPDATE admin_users SET password_hash = ? WHERE id = ?',
                [newHash, userId]
            );
        }
        
        // ===== HANDLE SETTINGS UPDATE =====
        // List of all possible settings
        const settingKeys = [
            'whatsapp_number', 
            'business_email', 
            'price_small', 
            'price_medium', 
            'price_big', 
            'price_fridge'
        ];
        
        // Update each setting if it was sent
        for (const key of settingKeys) {
            if (updates[key] !== undefined) {
                await db.update(
                    'UPDATE settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?',
                    [updates[key].toString(), key]
                );
            }
        }
        
        // Send success message back
        res.json({ success: true, message: 'Settings updated successfully' });
        
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;