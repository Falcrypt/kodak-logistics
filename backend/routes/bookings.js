const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { sendAdminNotification, sendCustomerConfirmation } = require('../utils/email');
const router = express.Router();

// ========== PUBLIC ENDPOINT ==========
router.post('/', async (req, res) => {
    try {
        console.log("📥 RECEIVED BOOKING DATA:", req.body);
        const { 
            name, email, phone, hostel, date, time, description, items, total,
            payment_method, transaction_id 
        } = req.body;
        
        if (!name || !email || !phone || !hostel || !date || !time || !items || items.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const itemsSummary = items.map(item => `${item.quantity}x ${item.type}`).join(', ');
        
        // Set payment status based on method
        let paymentStatus = 'unpaid';
        if (payment_method === 'momo' && transaction_id) {
            paymentStatus = 'pending_verification';
        } else if (payment_method === 'momo' && !transaction_id) {
            paymentStatus = 'pending_verification'; // They intend to pay but no ID yet
        } else {
            paymentStatus = 'unpaid'; // Pay on pickup
        }
        
        // PostgreSQL INSERT with payment fields
        const sql = `INSERT INTO bookings 
            (customer_name, customer_email, customer_phone, hostel_name, 
             booking_date, booking_time, items, items_summary, total_amount, status, description,
             payment_method, transaction_id, payment_status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`;
        
        const params = [ 
            name, email, phone, hostel, date, time,
            JSON.stringify(items), itemsSummary, total, 'pending', description || '',
            payment_method || 'pickup',
            transaction_id || null,
            paymentStatus
        ];
        
        const result = await db.insert(sql, params);
        const insertId = result;
        const bookingRef = 'KDL-' + String(insertId).padStart(6, '0');
        
        await db.update('UPDATE bookings SET booking_ref = $1 WHERE id = $2', [bookingRef, insertId]);

        // Create booking object with ALL data for emails
        const newBooking = {
            id: insertId,
            booking_ref: bookingRef,
            customer_name: name,
            customer_email: email,
            customer_phone: phone,
            hostel_name: hostel,
            booking_date: date,
            booking_time: time,
            items_summary: itemsSummary,
            total_amount: total,
            status: 'pending',
            payment_method: payment_method || 'pickup',
            transaction_id: transaction_id || null,
            payment_status: paymentStatus
        };

        // Send notifications with payment data
        sendAdminNotification(newBooking).catch(console.error);
        sendCustomerConfirmation(newBooking).catch(console.error);

        res.status(201).json({ 
            success: true, 
            bookingId: insertId,
            bookingRef: bookingRef,
            payment_status: paymentStatus
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
        let paramCounter = 1;
        
        if (search) {
            whereConditions.push(`(customer_name LIKE $${paramCounter} OR customer_phone LIKE $${paramCounter+1} OR hostel_name LIKE $${paramCounter+2} OR booking_ref LIKE $${paramCounter+3})`);
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            paramCounter += 4;
        }
        if (status !== 'all') {
            whereConditions.push(`status = $${paramCounter}`);
            params.push(status);
            paramCounter++;
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
        const todayResult = await db.getOne('SELECT COUNT(*) as count FROM bookings WHERE DATE(booking_date) = $1', [today]);
        const pendingResult = await db.getOne("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'");
        const confirmedResult = await db.getOne("SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'");
        const revenueResult = await db.getOne("SELECT SUM(total_amount) as total FROM bookings WHERE status IN ('confirmed', 'completed') AND payment_status = 'verified'");
        
        // Payment stats
        const pendingPaymentResult = await db.getOne("SELECT COUNT(*) as count FROM bookings WHERE payment_status = 'pending_verification'");
        const verifiedPaymentResult = await db.getOne("SELECT SUM(total_amount) as total FROM bookings WHERE payment_status = 'verified'");
        
        res.json({
            today: todayResult?.count || 0,
            pending: pendingResult?.count || 0,
            confirmed: confirmedResult?.count || 0,
            revenue: revenueResult?.total || 0,
            pending_payments: pendingPaymentResult?.count || 0,
            verified_revenue: verifiedPaymentResult?.total || 0
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

// PUT /api/bookings/:id – update status (UPDATED to handle payment status)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'Status required' });
        await db.update('UPDATE bookings SET status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Update booking error:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

// ========== VERIFY PAYMENT ENDPOINT (NEW) ==========
router.put('/:id/verify-payment', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_status, verified_by } = req.body;
        
        if (!payment_status) {
            return res.status(400).json({ error: 'Payment status required' });
        }
        
        // Get booking details before update for email
        const bookingResult = await db.query('SELECT * FROM bookings WHERE id = $1', [id]);
        
        let booking = null;
        if (Array.isArray(bookingResult) && bookingResult.length > 0) {
            booking = bookingResult[0];
        } else if (bookingResult && bookingResult.rows && bookingResult.rows.length > 0) {
            booking = bookingResult.rows[0];
        } else {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Update payment status
        await db.update(
            'UPDATE bookings SET payment_status = $1, payment_verified_at = NOW(), payment_verified_by = $2 WHERE id = $3',
            [payment_status, verified_by || 'admin', id]
        );
        
        // If verified, also update booking status to confirmed
        if (payment_status === 'verified') {
            await db.update('UPDATE bookings SET status = $1 WHERE id = $2', ['confirmed', id]);
            booking.status = 'confirmed';
        }
        
        // Update booking object for email
        booking.payment_status = payment_status;
        booking.payment_verified_by = verified_by;
        
        // Send verification email to customer
        const { sendPaymentVerificationEmail } = require('../utils/email');
        sendPaymentVerificationEmail(booking).catch(console.error);
        
        res.json({ 
            success: true, 
            message: `Payment ${payment_status === 'verified' ? 'verified' : 'rejected'} successfully`,
            payment_status: payment_status
        });
        
    } catch (error) {
        console.error('❌ Verify payment error:', error);
        res.status(500).json({ error: 'Failed to verify payment: ' + error.message });
    }
});

// ========== RESET ALL BOOKINGS ==========
router.delete('/reset', authenticateToken, async (req, res) => {
    try {
        console.log('🗑️ Resetting all bookings...');
        
        // Delete all bookings
        await db.query('DELETE FROM bookings');
        
        // Reset the sequence so IDs start from 1 again
        await db.query('ALTER SEQUENCE bookings_id_seq RESTART WITH 1');
        
        console.log('✅ All bookings deleted and sequence reset');
        res.json({ success: true, message: 'All bookings have been deleted' });
        
    } catch (error) {
        console.error('❌ Reset bookings error:', error);
        res.status(500).json({ error: 'Failed to reset bookings' });
    }
});

// ========== DELETE SINGLE BOOKING ==========
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    
    try {
        // First, check if booking exists
        const checkResult = await db.query('SELECT booking_ref FROM bookings WHERE id = $1', [id]);
        
        let bookingRef = null;
        
        if (Array.isArray(checkResult) && checkResult.length > 0) {
            bookingRef = checkResult[0].booking_ref;
        } else if (checkResult && checkResult.rows && checkResult.rows.length > 0) {
            bookingRef = checkResult.rows[0].booking_ref;
        } else if (checkResult && checkResult.booking_ref) {
            bookingRef = checkResult.booking_ref;
        } else {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Delete the booking
        await db.query('DELETE FROM bookings WHERE id = $1', [id]);
        
        res.json({ 
            message: 'Booking deleted successfully', 
            booking_id: id,
            booking_ref: bookingRef
        });
        
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

module.exports = router;