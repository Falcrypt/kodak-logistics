// backend/routes/customers.js
const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// GET /api/customers - Get all customers
router.get('/', authenticateToken, async (req, res) => {
    try {
        const customers = await db.query(`
            SELECT 
                customer_name as name,
                customer_phone as phone,
                customer_email as email,
                COUNT(*) as total_bookings,
                MAX(booking_date) as last_booking
            FROM bookings 
            GROUP BY customer_phone, customer_name, customer_email
            ORDER BY last_booking DESC
        `);
        
        res.json(customers);
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

module.exports = router;