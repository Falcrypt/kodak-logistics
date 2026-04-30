// backend/routes/returns.js
const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { sendReturnRequestConfirmation, sendReturnRequestNotification, sendReturnStatusUpdateEmail } = require('../utils/email');
const router = express.Router();

// ========== HELPER FUNCTIONS ==========

// Generate return reference (e.g., RTR-000001)
async function generateReturnRef() {
    const result = await db.query("SELECT COUNT(*) as count FROM return_requests");
    const count = parseInt(result[0].count) + 1;
    return `RTR-${String(count).padStart(6, '0')}`;
}

// Check daily request limit
async function checkDailyLimit(requestDate) {
    const dateStr = requestDate.split('T')[0];
    
    // Get or create daily counter
    let counter = await db.getOne(
        "SELECT * FROM return_daily_counter WHERE request_date = $1",
        [dateStr]
    );
    
    if (!counter) {
        await db.query(
            "INSERT INTO return_daily_counter (request_date, request_count) VALUES ($1, 0)",
            [dateStr]
        );
        counter = { request_count: 0, daily_limit: 40 };
    }
    
    return {
        remaining: counter.daily_limit - counter.request_count,
        limit: counter.daily_limit,
        current: counter.request_count
    };
}

// Increment daily counter
async function incrementDailyCounter(requestDate) {
    const dateStr = requestDate.split('T')[0];
    await db.query(
        `INSERT INTO return_daily_counter (request_date, request_count) 
         VALUES ($1, 1) 
         ON CONFLICT (request_date) 
         DO UPDATE SET request_count = return_daily_counter.request_count + 1`,
        [dateStr]
    );
}

// ========== PUBLIC ENDPOINTS (Customer) ==========

// POST /api/returns/verify-booking - Check if booking exists and is eligible
router.post('/verify-booking', async (req, res) => {
    try {
        const { booking_ref } = req.body;
        
        if (!booking_ref) {
            return res.status(400).json({ error: 'Booking reference required' });
        }
        
        // Find the booking
        const booking = await db.getOne(
            `SELECT id, booking_ref, customer_name, customer_email, customer_phone, 
                    hostel_name, items_summary, created_at, status
             FROM bookings 
             WHERE booking_ref = $1`,
            [booking_ref.toUpperCase()]
        );
        
        if (!booking) {
            return res.status(404).json({ 
                error: 'Booking not found. Please check your reference number.',
                not_found: true
            });
        }
        
        // Check if booking is still active
        if (booking.status === 'completed') {
            return res.status(400).json({ 
                error: 'This booking has already been completed. Items have been returned.',
                completed: true
            });
        }
        
        // Check if customer already has a pending return request
        const existingRequest = await db.getOne(
            "SELECT id, status, request_ref FROM return_requests WHERE booking_id = $1 AND status IN ('pending', 'confirmed')",
            [booking.id]
        );
        
        if (existingRequest) {
            return res.status(400).json({ 
                error: `You already have a ${existingRequest.status} return request (${existingRequest.request_ref}). Please wait for confirmation.`,
                existing: true,
                request_ref: existingRequest.request_ref
            });
        }
        
        // Check storage duration (minimum 14 days)
        const storageDate = new Date(booking.created_at);
        const today = new Date();
        const daysStored = Math.floor((today - storageDate) / (1000 * 60 * 60 * 24));
        
        if (daysStored < 14) {
            const availableDate = new Date(storageDate);
            availableDate.setDate(availableDate.getDate() + 14);
            return res.status(400).json({
                error: `You can only request return after 14 days of storage. You stored your items on ${storageDate.toLocaleDateString()}. Available from ${availableDate.toLocaleDateString()}.`,
                too_early: true,
                available_date: availableDate.toISOString().split('T')[0]
            });
        }
        
        // Calculate total items count
        const itemCount = (booking.items_summary.match(/x/g) || []).length;
        
        res.json({
            success: true,
            booking: {
                id: booking.id,
                booking_ref: booking.booking_ref,
                customer_name: booking.customer_name,
                customer_email: booking.customer_email,
                customer_phone: booking.customer_phone,
                hostel_name: booking.hostel_name,
                items_summary: booking.items_summary,
                total_items: itemCount || 1,
                storage_date: booking.created_at
            }
        });
        
    } catch (error) {
        console.error('Verify booking error:', error);
        res.status(500).json({ error: 'Failed to verify booking' });
    }
});

// POST /api/returns - Create new return request
router.post('/', async (req, res) => {
    try {
        const {
            booking_id, booking_ref, customer_name, customer_email, customer_phone,
            original_hostel, items_summary, total_items_stored,
            return_date, return_time, special_instructions,
            payment_method, transaction_id
        } = req.body;
        
        // Validate required fields
        if (!booking_id || !booking_ref || !return_date || !return_time) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Check daily limit
        const dailyLimit = await checkDailyLimit(return_date);
        if (dailyLimit.remaining <= 0) {
            return res.status(429).json({ 
                error: `Daily request limit reached (${dailyLimit.limit}/day). Please try again tomorrow.`,
                limit_reached: true
            });
        }
        
        // Check return date restrictions (minimum 24 hours notice)
        const requestedDate = new Date(return_date);
        const today = new Date();
        const minDate = new Date();
        minDate.setDate(today.getDate() + 1); // 24 hours = 1 day minimum
        
        if (requestedDate < minDate) {
            return res.status(400).json({
                error: `Return must be scheduled at least 24 hours in advance. Earliest available: ${minDate.toISOString().split('T')[0]}`,
                too_soon: true,
                min_date: minDate.toISOString().split('T')[0]
            });
        }
        
        // Check maximum advance (30 days)
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + 30);
        if (requestedDate > maxDate) {
            return res.status(400).json({
                error: `Return cannot be scheduled more than 30 days in advance. Latest available: ${maxDate.toISOString().split('T')[0]}`,
                too_far: true,
                max_date: maxDate.toISOString().split('T')[0]
            });
        }
        
        // Generate reference
        const request_ref = await generateReturnRef();
        
        // Set payment status
        let paymentStatus = 'unpaid';
        if (payment_method === 'momo' && transaction_id) {
            paymentStatus = 'pending_verification';
        }
        
        // Insert return request
        const insertSql = `
            INSERT INTO return_requests (
                request_ref, booking_id, booking_ref, customer_name, customer_email,
                customer_phone, original_hostel, items_summary, total_items_stored,
                return_date, return_time, special_instructions, delivery_fee,
                payment_method, transaction_id, payment_status, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING id
        `;
        
        const params = [
            request_ref, booking_id, booking_ref, customer_name, customer_email,
            customer_phone, original_hostel, items_summary, total_items_stored,
            return_date, return_time, special_instructions || '', 30.00,
            payment_method || 'delivery', transaction_id || null, paymentStatus, 'pending'
        ];
        
        const result = await db.query(insertSql, params);
        const returnId = result[0].id;
        
        // Increment daily counter
        await incrementDailyCounter(return_date);
        
        // Create return request object for email
        const returnRequest = {
            id: returnId,
            request_ref: request_ref,
            booking_ref: booking_ref,
            customer_name: customer_name,
            customer_email: customer_email,
            customer_phone: customer_phone,
            original_hostel: original_hostel,
            items_summary: items_summary,
            return_date: return_date,
            return_time: return_time,
            delivery_fee: 30.00,
            payment_method: payment_method || 'delivery',
            payment_status: paymentStatus,
            special_instructions: special_instructions || ''
        };
        
        // Send email notifications
        sendReturnRequestConfirmation(returnRequest).catch(console.error);
        sendReturnRequestNotification(returnRequest).catch(console.error);
        
        res.status(201).json({
            success: true,
            request_ref: request_ref,
            remaining_slots: dailyLimit.remaining - 1,
            message: 'Return request submitted successfully'
        });
        
    } catch (error) {
        console.error('Create return request error:', error);
        res.status(500).json({ error: 'Failed to create return request' });
    }
});

// GET /api/returns/customer/:email - Get return history for customer
router.get('/customer/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        const requests = await db.query(
            `SELECT id, request_ref, booking_ref, items_summary, return_date, return_time,
                    delivery_fee, payment_method, payment_status, status, created_at, completed_at
             FROM return_requests 
             WHERE customer_email = $1 
             ORDER BY created_at DESC`,
            [decodeURIComponent(email)]
        );
        
        res.json(requests);
        
    } catch (error) {
        console.error('Get customer returns error:', error);
        res.status(500).json({ error: 'Failed to fetch return history' });
    }
});

// GET /api/returns/daily-limit - Check available slots
router.get('/daily-limit', async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        const limit = await checkDailyLimit(targetDate);
        
        res.json({
            date: targetDate,
            remaining: limit.remaining,
            limit: limit.limit,
            current: limit.current,
            percentage: Math.round((limit.current / limit.limit) * 100)
        });
        
    } catch (error) {
        console.error('Daily limit error:', error);
        res.status(500).json({ error: 'Failed to check daily limit' });
    }
});

// ========== ADMIN ENDPOINTS (require authentication) ==========

// GET /api/returns - Get all return requests (admin)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, search } = req.query;
        
        let whereConditions = [];
        let params = [];
        let paramCounter = 1;
        
        if (status && status !== 'all') {
            whereConditions.push(`status = $${paramCounter}`);
            params.push(status);
            paramCounter++;
        }
        
        if (search) {
            whereConditions.push(`(customer_name ILIKE $${paramCounter} OR booking_ref ILIKE $${paramCounter + 1} OR request_ref ILIKE $${paramCounter + 2})`);
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
            paramCounter += 3;
        }
        
        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';
        
        const requests = await db.query(`
            SELECT * FROM return_requests 
            ${whereClause}
            ORDER BY 
                CASE status 
                    WHEN 'pending' THEN 1 
                    WHEN 'confirmed' THEN 2 
                    WHEN 'completed' THEN 3 
                    WHEN 'cancelled' THEN 4 
                END,
                created_at DESC
        `, params);
        
        res.json(requests);
        
    } catch (error) {
        console.error('Get returns error:', error);
        res.status(500).json({ error: 'Failed to fetch returns' });
    }
});

// PUT /api/returns/:id/status - Update return request status (admin)
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_notes, confirmed_by } = req.body;
        
        if (!status) {
            return res.status(400).json({ error: 'Status required' });
        }
        
        let updateFields = `status = $1, updated_at = NOW()`;
        let params = [status];
        
        if (status === 'confirmed') {
            updateFields += `, confirmed_by = $${params.length + 1}, confirmed_at = NOW()`;
            params.push(confirmed_by || 'admin');
        } else if (status === 'completed') {
            updateFields += `, completed_at = NOW()`;
        }
        
        if (admin_notes !== undefined) {
            updateFields += `, admin_notes = $${params.length + 1}`;
            params.push(admin_notes);
        }
        
        params.push(id);
        
        await db.query(`
            UPDATE return_requests 
            SET ${updateFields}
            WHERE id = $${params.length}
        `, params);
        
        // Get updated request for email
        const updated = await db.getOne("SELECT * FROM return_requests WHERE id = $1", [id]);
        
        // Send status update email to customer
        sendReturnStatusUpdateEmail(updated).catch(console.error);
        
        res.json({ 
            success: true, 
            message: `Return request ${status}`,
            request: updated
        });
        
    } catch (error) {
        console.error('Update return status error:', error);
        res.status(500).json({ error: 'Failed to update return status' });
    }
});

// GET /api/returns/stats/summary - Return statistics (admin)
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const pending = await db.getOne("SELECT COUNT(*) as count FROM return_requests WHERE status = 'pending'");
        const confirmed = await db.getOne("SELECT COUNT(*) as count FROM return_requests WHERE status = 'confirmed'");
        const completed = await db.getOne("SELECT COUNT(*) as count FROM return_requests WHERE status = 'completed'");
        const todayRequests = await db.getOne("SELECT COUNT(*) as count FROM return_requests WHERE DATE(return_date) = $1", [today]);
        const dailyLimit = await checkDailyLimit(today);
        
        res.json({
            pending: pending?.count || 0,
            confirmed: confirmed?.count || 0,
            completed: completed?.count || 0,
            today_requests: todayRequests?.count || 0,
            today_limit: dailyLimit.limit,
            today_remaining: dailyLimit.remaining
        });
        
    } catch (error) {
        console.error('Returns stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;