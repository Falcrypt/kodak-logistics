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

// DELETE /api/customers/:phone - Permanently delete a customer and all their data
router.delete('/:phone', authenticateToken, async (req, res) => {
    try {
        const phone = decodeURIComponent(req.params.phone);

        const bookingIds = await db.query('SELECT id FROM bookings WHERE customer_phone = $1', [phone]);
        if (bookingIds.length === 0) {
            return res.status(404).json({ error: 'No customer found with that phone number' });
        }
        const ids = bookingIds.map(b => b.id);

        // Delete dependent rows first (reviews/return_requests reference bookings.id
        // with no cascade), then the bookings themselves.
        await db.query('DELETE FROM reviews WHERE booking_id = ANY($1::int[])', [ids]);
        await db.query('DELETE FROM return_requests WHERE booking_id = ANY($1::int[])', [ids]);
        const result = await db.query('DELETE FROM bookings WHERE customer_phone = $1', [phone]);

        res.json({ success: true, message: 'Customer and all associated data deleted', bookings_removed: ids.length });
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({ error: 'Failed to delete customer: ' + error.message });
    }
});

module.exports = router;