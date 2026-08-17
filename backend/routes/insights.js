// backend/routes/insights.js - Admin analytics computed from real booking data
const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const ITEM_LABELS = {
    duffle_small: 'Duffle Bag (Small)', duffle_big: 'Duffle Bag (Big)',
    jute_small: 'Jute Bag (Small)', jute_medium: 'Jute Bag (Medium)', jute_big: 'Jute Bag (Big)',
    travel_small: 'Travel Bag (Small)', travel_medium: 'Travel Bag (Medium)', travel_big: 'Travel Bag (Big)',
    microwave: 'Microwave',
    fridge_tabletop: 'Fridge (Table Top)', fridge_doubledoor: 'Fridge (Double Door)', fridge_small: 'Fridge (Small)',
    gas_small: 'Gas Cylinder (Small)', gas_medium: 'Gas Cylinder (Medium)', gas_big: 'Gas Cylinder (Big)',
    container_small: 'Container (Small)', container_big: 'Container (Big)',
    tv_small: 'Television (Small)', tv_medium: 'Television (Medium)',
    tv_large: 'Television (Large)', tv_xlarge: 'Television (Extra Large)',
    buckets: 'Buckets'
};

// GET /api/insights/popular-items - Most-booked item types (admin)
router.get('/popular-items', authenticateToken, async (req, res) => {
    try {
        const rows = await db.query('SELECT items FROM bookings WHERE items IS NOT NULL', []);

        const counts = {};
        for (const row of rows) {
            let parsed;
            try {
                parsed = JSON.parse(row.items);
            } catch {
                continue;
            }
            if (!Array.isArray(parsed)) continue;
            for (const item of parsed) {
                const key = item.type;
                const qty = parseInt(item.quantity) || 0;
                if (!key) continue;
                counts[key] = (counts[key] || 0) + qty;
            }
        }

        const popular = Object.entries(counts)
            .map(([key, count]) => ({ key, label: ITEM_LABELS[key] || key, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

        res.json(popular);
    } catch (error) {
        console.error('Popular items insight error:', error);
        res.status(500).json({ error: 'Failed to compute popular items' });
    }
});

// GET /api/insights/revenue-trend?days=30 - Daily revenue for a chart (admin)
router.get('/revenue-trend', authenticateToken, async (req, res) => {
    try {
        const days = Math.min(90, Math.max(7, parseInt(req.query.days) || 30));

        const rows = await db.query(
            `SELECT DATE(created_at) AS day, COALESCE(SUM(total_amount), 0) AS revenue
             FROM bookings
             WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
               AND status IN ('confirmed', 'completed')
             GROUP BY DATE(created_at)
             ORDER BY day ASC`,
            [days]
        );

        // Fill in zero-revenue days so the chart has a continuous timeline
        const byDay = {};
        rows.forEach(r => { byDay[r.day.toISOString().split('T')[0]] = parseFloat(r.revenue); });

        const trend = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            trend.push({ date: key, revenue: byDay[key] || 0 });
        }

        res.json(trend);
    } catch (error) {
        console.error('Revenue trend insight error:', error);
        res.status(500).json({ error: 'Failed to compute revenue trend' });
    }
});

// GET /api/insights/customer-growth - New vs returning customers (admin)
router.get('/customer-growth', authenticateToken, async (req, res) => {
    try {
        const totalResult = await db.getOne(
            'SELECT COUNT(DISTINCT customer_phone) AS count FROM bookings', []
        );

        const newLast30Result = await db.getOne(`
            SELECT COUNT(DISTINCT customer_phone) AS count FROM bookings b
            WHERE NOT EXISTS (
                SELECT 1 FROM bookings b2
                WHERE b2.customer_phone = b.customer_phone AND b2.created_at < NOW() - INTERVAL '30 days'
            )
            AND b.created_at >= NOW() - INTERVAL '30 days'
        `, []);

        const repeatResult = await db.getOne(`
            SELECT COUNT(*) AS count FROM (
                SELECT customer_phone FROM bookings GROUP BY customer_phone HAVING COUNT(*) > 1
            ) t
        `, []);

        res.json({
            total_customers: parseInt(totalResult.count) || 0,
            new_last_30_days: parseInt(newLast30Result.count) || 0,
            repeat_customers: parseInt(repeatResult.count) || 0
        });
    } catch (error) {
        console.error('Customer growth insight error:', error);
        res.status(500).json({ error: 'Failed to compute customer growth' });
    }
});

module.exports = router;
