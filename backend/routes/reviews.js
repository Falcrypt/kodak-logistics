// backend/routes/reviews.js
const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { publicWriteLimiter } = require('../middleware/rateLimiters');
const router = express.Router();

// Keep only digits, and only the last 9 (same normalization as returns.js so
// "0541249742", "233541249742" and "+233541249742" all compare equal)
function normalizePhone(phone) {
    return (phone || '').replace(/\D/g, '').slice(-9);
}

// ========== PUBLIC ENDPOINTS ==========

// POST /api/reviews/verify-booking - Check a booking is eligible for review
router.post('/verify-booking', publicWriteLimiter, async (req, res) => {
    try {
        const { booking_ref, phone } = req.body;

        if (!booking_ref || !phone) {
            return res.status(400).json({ error: 'Booking reference and phone number are required' });
        }

        const booking = await db.getOne(
            `SELECT id, booking_ref, customer_name, customer_phone, status
             FROM bookings WHERE booking_ref = $1`,
            [booking_ref.toUpperCase()]
        );

        if (!booking || normalizePhone(phone) !== normalizePhone(booking.customer_phone)) {
            return res.status(404).json({
                error: 'Booking not found. Please check your reference number and phone number.',
                not_found: true
            });
        }

        if (!['confirmed', 'completed'].includes(booking.status)) {
            return res.status(400).json({
                error: 'This booking is not eligible for a review yet.',
                not_eligible: true
            });
        }

        const existing = await db.getOne('SELECT id FROM reviews WHERE booking_ref = $1', [booking.booking_ref]);
        if (existing) {
            return res.status(400).json({
                error: 'You have already submitted a review for this booking. Thank you!',
                already_reviewed: true
            });
        }

        res.json({
            success: true,
            booking: {
                id: booking.id,
                booking_ref: booking.booking_ref,
                customer_name: booking.customer_name
            }
        });
    } catch (error) {
        console.error('Verify booking for review error:', error);
        res.status(500).json({ error: 'Failed to verify booking' });
    }
});

// POST /api/reviews - Submit a review
router.post('/', publicWriteLimiter, async (req, res) => {
    try {
        const { booking_ref, phone, rating, comment } = req.body;

        if (!booking_ref || !phone || !rating) {
            return res.status(400).json({ error: 'Booking reference, phone number, and rating are required' });
        }

        const ratingNum = parseInt(rating);
        if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({ error: 'Rating must be a whole number between 1 and 5' });
        }

        const booking = await db.getOne(
            `SELECT id, booking_ref, customer_name, customer_email, customer_phone, status
             FROM bookings WHERE booking_ref = $1`,
            [booking_ref.toUpperCase()]
        );

        if (!booking || normalizePhone(phone) !== normalizePhone(booking.customer_phone)) {
            return res.status(404).json({ error: 'Booking not found. Please check your reference number and phone number.' });
        }

        if (!['confirmed', 'completed'].includes(booking.status)) {
            return res.status(400).json({ error: 'This booking is not eligible for a review yet.' });
        }

        const insertSql = `
            INSERT INTO reviews (booking_id, booking_ref, customer_name, customer_email, rating, comment)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        const reviewId = await db.insert(insertSql, [
            booking.id, booking.booking_ref, booking.customer_name,
            booking.customer_email, ratingNum, (comment || '').trim().substring(0, 1000)
        ]);

        res.status(201).json({ success: true, id: reviewId, message: 'Thank you for your review!' });
    } catch (error) {
        if (error.code === '23505') { // unique_violation on booking_ref
            return res.status(400).json({ error: 'You have already submitted a review for this booking.' });
        }
        console.error('Submit review error:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

// GET /api/reviews/public - Published reviews for the public site
router.get('/public', async (req, res) => {
    try {
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const reviews = await db.query(
            `SELECT customer_name, rating, comment, created_at
             FROM reviews WHERE status = 'published'
             ORDER BY created_at DESC LIMIT $1`,
            [limit]
        );
        res.json(reviews);
    } catch (error) {
        console.error('Get public reviews error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// ========== ADMIN ENDPOINTS ==========

// GET /api/reviews - All reviews (admin)
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
            whereConditions.push(`(customer_name ILIKE $${paramCounter} OR booking_ref ILIKE $${paramCounter + 1})`);
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
            paramCounter += 2;
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const reviews = await db.query(
            `SELECT * FROM reviews ${whereClause} ORDER BY created_at DESC`,
            params
        );

        res.json(reviews);
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// GET /api/reviews/stats/summary - Rating stats (admin)
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const summary = await db.getOne(`
            SELECT
                COUNT(*) AS total,
                COALESCE(AVG(rating), 0) AS average_rating,
                COUNT(*) FILTER (WHERE rating = 5) AS five_star,
                COUNT(*) FILTER (WHERE rating = 4) AS four_star,
                COUNT(*) FILTER (WHERE rating = 3) AS three_star,
                COUNT(*) FILTER (WHERE rating = 2) AS two_star,
                COUNT(*) FILTER (WHERE rating = 1) AS one_star,
                COUNT(*) FILTER (WHERE status = 'published') AS published
            FROM reviews
        `);

        res.json({
            total: parseInt(summary.total) || 0,
            average_rating: parseFloat(summary.average_rating) || 0,
            published: parseInt(summary.published) || 0,
            breakdown: {
                5: parseInt(summary.five_star) || 0,
                4: parseInt(summary.four_star) || 0,
                3: parseInt(summary.three_star) || 0,
                2: parseInt(summary.two_star) || 0,
                1: parseInt(summary.one_star) || 0
            }
        });
    } catch (error) {
        console.error('Review stats error:', error);
        res.status(500).json({ error: 'Failed to fetch review stats' });
    }
});

// PUT /api/reviews/:id/status - Publish/hide a review (admin)
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['published', 'hidden'].includes(status)) {
            return res.status(400).json({ error: 'Status must be "published" or "hidden"' });
        }

        await db.update('UPDATE reviews SET status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true, message: `Review ${status}` });
    } catch (error) {
        console.error('Update review status error:', error);
        res.status(500).json({ error: 'Failed to update review' });
    }
});

// DELETE /api/reviews/:id - Remove a review (admin)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM reviews WHERE id = $1', [id]);
        res.json({ success: true, message: 'Review deleted' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
});

module.exports = router;
