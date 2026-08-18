// backend/routes/payments.js - Paystack checkout: verify-on-callback + webhook safety net
const express = require('express');
const crypto = require('crypto');
const db = require('../database/db');
const { publicWriteLimiter } = require('../middleware/rateLimiters');
const { sendAdminNotification, sendCustomerConfirmation } = require('../utils/email');
const router = express.Router();

const PAYSTACK_BASE = 'https://api.paystack.co';

// GET /api/payments/config - public key for the frontend checkout widget
router.get('/config', (req, res) => {
    if (!process.env.PAYSTACK_PUBLIC_KEY) {
        return res.status(503).json({ error: 'Online payment is not configured yet' });
    }
    res.json({ publicKey: process.env.PAYSTACK_PUBLIC_KEY });
});

async function verifyPaystackTransaction(reference) {
    const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
    });
    const data = await response.json();
    if (!response.ok || !data.status) {
        throw new Error(data.message || 'Could not verify transaction with Paystack');
    }
    return data.data;
}

// Creates the booking from a verified Paystack transaction. Idempotent by
// transaction reference, since both the frontend callback and the webhook
// can each try to create it — whichever gets there first wins.
async function createBookingFromPaystack(txn) {
    const existing = await db.getOne('SELECT * FROM bookings WHERE transaction_id = $1', [txn.reference]);
    if (existing) return existing;

    const meta = txn.metadata || {};
    const items = meta.items || [];
    const itemsSummary = items.map(item => `${item.quantity}x ${item.type}`).join(', ');
    const total = txn.amount / 100; // pesewas -> cedis

    const sql = `INSERT INTO bookings
        (customer_name, customer_email, customer_phone, hostel_name,
         booking_date, booking_time, items, items_summary, total_amount, status, description,
         payment_method, transaction_id, payment_status, payment_verified_at, payment_verified_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), $15)`;

    const params = [
        meta.name, txn.customer?.email || meta.email, meta.phone, meta.hostel,
        meta.date, meta.time, JSON.stringify(items), itemsSummary, total, 'confirmed',
        meta.description || '', 'paystack', txn.reference, 'verified', 'Paystack (auto)'
    ];

    const insertId = await db.insert(sql, params);
    const bookingRef = 'KDL-' + String(insertId).padStart(6, '0');
    await db.update('UPDATE bookings SET booking_ref = $1 WHERE id = $2', [bookingRef, insertId]);

    const booking = {
        id: insertId, booking_ref: bookingRef, customer_name: meta.name,
        customer_email: txn.customer?.email || meta.email, customer_phone: meta.phone,
        hostel_name: meta.hostel, booking_date: meta.date, booking_time: meta.time,
        items_summary: itemsSummary, total_amount: total, status: 'confirmed',
        payment_method: 'paystack', transaction_id: txn.reference, payment_status: 'verified'
    };

    sendAdminNotification(booking).catch(console.error);
    sendCustomerConfirmation(booking).catch(console.error);

    return booking;
}

// POST /api/payments/verify-and-book - frontend calls this the moment
// Paystack's popup reports success, so the customer sees confirmation
// instantly rather than waiting on the webhook.
router.post('/verify-and-book', publicWriteLimiter, async (req, res) => {
    try {
        const { reference } = req.body;
        if (!reference) return res.status(400).json({ error: 'Missing payment reference' });

        const txn = await verifyPaystackTransaction(reference);
        if (txn.status !== 'success') {
            return res.status(400).json({ error: 'Payment was not successful', status: txn.status });
        }

        const booking = await createBookingFromPaystack(txn);
        res.status(201).json({
            success: true,
            bookingId: booking.id,
            bookingRef: booking.booking_ref,
            payment_status: 'verified'
        });
    } catch (error) {
        console.error('❌ Verify-and-book error:', error);
        res.status(500).json({ error: 'Failed to confirm payment: ' + error.message });
    }
});

// POST /api/payments/webhook - Paystack's own server-to-server notification.
// Safety net for cases where the customer closes the tab right after paying,
// before the frontend gets a chance to call verify-and-book.
router.post('/webhook', async (req, res) => {
    try {
        const signature = req.headers['x-paystack-signature'];
        const expected = crypto
            .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
            .update(req.rawBody || Buffer.from(''))
            .digest('hex');

        if (!signature || signature !== expected) {
            console.log('⚠️ Paystack webhook signature mismatch');
            return res.sendStatus(401);
        }

        const event = req.body;
        if (event.event === 'charge.success') {
            await createBookingFromPaystack(event.data);
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.sendStatus(200); // acknowledge anyway so Paystack doesn't retry-storm
    }
});

module.exports = router;
