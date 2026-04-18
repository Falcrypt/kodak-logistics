// backend/routes/settings.js - UPGRADED VERSION (All specific items, no generic)
const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const router = express.Router();

// ========== PUBLIC ENDPOINT (no login required) ==========

// GET /api/settings/public - Get public settings (prices only)
router.get('/public', async (req, res) => {
    try {
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

// PUT /api/settings - Update settings (UPGRADED with all specific items)
router.put('/', authenticateToken, async (req, res) => {
    try {
        const updates = req.body;
        const userId = req.user.id;
        
        console.log('📥 Received updates:', JSON.stringify(updates, null, 2));
        
        // ===== HANDLE PASSWORD CHANGE =====
        if (updates.current_password && updates.new_password) {
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
        
        // ===== ALL SPECIFIC PRICE KEYS (NO generic items) =====
        const priceKeys = [
            // Bags
            'duffle_small', 'duffle_big',
            'jute_small', 'jute_medium', 'jute_big',
            'travel_small', 'travel_medium', 'travel_big',
            
            // Appliances
            'microwave',
            'fridge_tabletop', 'fridge_doubledoor', 'fridge_small',
            
            // Gas Cylinders
            'gas_small', 'gas_medium', 'gas_big',
            
            // Containers
            'container_small', 'container_big',
            
            // Free items
            'buckets'
        ];
        
        // Save each price
        let savedCount = 0;
        for (const key of priceKeys) {
            const fullKey = `price_${key}`;
            let value = updates[fullKey];
            
            // Also check without prefix (just in case)
            if (value === undefined && updates[key] !== undefined) {
                value = updates[key];
            }
            
            if (value !== undefined) {
                console.log(`💾 Saving ${fullKey} = ${value}`);
                await db.update(
                    'UPDATE settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2',
                    [value.toString(), fullKey]
                );
                savedCount++;
            }
        }
        
        // ===== HANDLE CONTACT SETTINGS =====
        if (updates.whatsapp_number !== undefined) {
            console.log(`💾 Saving whatsapp_number = ${updates.whatsapp_number}`);
            await db.update(
                'UPDATE settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2',
                [updates.whatsapp_number, 'whatsapp_number']
            );
            savedCount++;
        }
        
        if (updates.business_email !== undefined) {
            console.log(`💾 Saving business_email = ${updates.business_email}`);
            await db.update(
                'UPDATE settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2',
                [updates.business_email, 'business_email']
            );
            savedCount++;
        }
        
        console.log(`✅ Settings updated successfully! (${savedCount} values saved)`);
        res.json({ success: true, message: 'Settings updated successfully' });
        
    } catch (error) {
        console.error('❌ Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings: ' + error.message });
    }
});

// GET /api/settings/contact - Public contact settings (no login required)
router.get('/contact', async (req, res) => {
    try {
        const settings = await db.query(
            "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('whatsapp_number', 'business_email')"
        );
        
        const contactInfo = {};
        settings.forEach(s => {
            contactInfo[s.setting_key] = s.setting_value;
        });
        
        res.json(contactInfo);
    } catch (error) {
        console.error('Get contact settings error:', error);
        res.status(500).json({ error: 'Failed to fetch contact settings' });
    }
});

module.exports = router;