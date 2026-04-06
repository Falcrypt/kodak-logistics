// backend/routes/bookings.js
const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { sendAdminNotification, sendCustomerConfirmation } = require('../utils/email');
const router = express.Router();

// ========== PUBLIC ENDPOINT ==========
router.post('/', async (req, res) => {
    try {
        console.log("📥 RECEIVED BOOKING DATA:", req.body);
        const { name, email, phone, hostel, date, time, description, items, total } = req.body;
        if (!name || !email || !phone || !hostel || !date || !time || !items || items.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const itemsSummary = items.map(item => `${item.quantity}x ${item.type}`).join(', ');
        
        // Insert without booking_ref first
        const sql = `INSERT INTO bookings 
            (customer_name, customer_email, customer_phone, hostel_name, 
             booking_date, booking_time, items, items_summary, total_amount, status, description) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [ name, email, phone, hostel, date, time,
            JSON.stringify(items), itemsSummary, total, 'pending', description || '' ];
        
        const result = await db.insert(sql, params);
        const insertId = result;

        // Generate booking reference: KDL- + 6‑digit padded ID
        const bookingRef = 'KDL-' + String(insertId).padStart(6, '0');
        
        // Update the record with the reference
        await db.update('UPDATE bookings SET booking_ref = ? WHERE id = ?', [bookingRef, insertId]);

        // Prepare data for emails
        const newBooking = {
            booking_ref: bookingRef,
            customer_name: name,
            customer_email: email,
            customer_phone: phone,
            hostel_name: hostel,
            booking_date: date,
            booking_time: time,
            items_summary: itemsSummary,
            total_amount: total,
            status: 'pending'
        };

        // Send emails in background
        sendAdminNotification(newBooking).catch(console.error);
        sendCustomerConfirmation(newBooking).catch(console.error);

        // Return the reference to the frontend
        res.status(201).json({ 
            success: true, 
            bookingId: insertId,
            bookingRef: bookingRef 
        });
        
    } catch (error) {
        console.error('❌ Create booking error:', error);
        res.status(500).json({ error: 'Failed to create booking: ' + error.message });
    }
});

// ========== ADMIN ENDPOINTS ==========

// GET /api/bookings – with search, filter, pagination
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log("📥 Bookings request received with params:", req.query);
        
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;
        
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        
        let whereConditions = [];
        let params = [];
        
        if (search) {
            // Also search by booking_ref
            whereConditions.push('(customer_name LIKE ? OR customer_phone LIKE ? OR hostel_name LIKE ? OR booking_ref LIKE ?)');
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        if (status !== 'all') {
            whereConditions.push('status = ?');
            params.push(status);
        }
        
        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';
        
        const countSql = `SELECT COUNT(*) as total FROM bookings ${whereClause}`;
        const countResult = await db.getOne(countSql, params);
        const total = countResult?.total || 0;
        
        const dataSql = `SELECT * FROM bookings ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        const bookings = await db.query(dataSql, params);
        
        console.log(`✅ Found ${bookings.length} bookings (total ${total})`);
        
        res.json({
            bookings,
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('❌ Get bookings error:', error);
        res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
    }
});

// GET /api/bookings/stats – dashboard stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const todayResult = await db.getOne('SELECT COUNT(*) as count FROM bookings WHERE DATE(booking_date) = ?', [today]);
        const pendingResult = await db.getOne("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'");
        const confirmedResult = await db.getOne("SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'");
        const revenueResult = await db.getOne("SELECT SUM(total_amount) as total FROM bookings WHERE status IN ('confirmed', 'completed')");
        res.json({
            today: todayResult?.count || 0,
            pending: pendingResult?.count || 0,
            confirmed: confirmedResult?.count || 0,
            revenue: revenueResult?.total || 0
        });
    } catch (error) {
        console.error('❌ Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// GET /api/bookings/export – all bookings for CSV
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const bookings = await db.query('SELECT * FROM bookings ORDER BY created_at DESC');
        res.json(bookings);
    } catch (error) {
        console.error('❌ Export error:', error);
        res.status(500).json({ error: 'Failed to export bookings' });
    }
});

// PUT /api/bookings/:id – update status
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'Status required' });
        await db.update('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Update booking error:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

module.exports = router;