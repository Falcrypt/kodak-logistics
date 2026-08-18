// backend/server.js - UPGRADED VERSION with Payment Columns Auto-Creation & Return Tables
// This starts everything and connects all the pieces

// ===== STEP 1: LOAD ENVIRONMENT VARIABLES =====
require('dotenv').config();

// ===== STEP 2: IMPORT PACKAGES =====
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./database/db');

// ===== IMPORT THE FUNCTIONS FROM db.js =====
const { ensurePaymentColumns, ensureReturnTables, ensureReviewsTable, ensureAdminAvatarColumn } = require('./database/db');

// ===== STEP 3: IMPORT ROUTES =====
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const settingsRoutes = require('./routes/settings');
const customersRoutes = require('./routes/customers');
const returnsRoutes = require('./routes/returns');  // ADD THIS LINE
const reviewsRoutes = require('./routes/reviews');
const insightsRoutes = require('./routes/insights');
const paymentsRoutes = require('./routes/payments');

// ===== STEP 4: CREATE EXPRESS APP =====
const app = express();

// ===== STEP 5: MIDDLEWARE =====

// 5.1 Security headers (relaxed for production)
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// 5.2 CORS configuration - Allow your GitHub Pages domain
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'https://falcrypt.github.io',
    'https://*.onrender.com'
];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.some(allowed => origin === allowed || (allowed.includes('*') && origin.includes('onrender.com')))) {
            callback(null, true);
        } else {
            console.log('❌ CORS blocked for origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// 5.4 Parse JSON bodies
// The verify callback stashes the raw bytes too — Paystack's webhook
// signature is an HMAC over the exact raw body, which is gone once
// express.json() has parsed it into an object.
app.use(express.json({
    limit: '2mb', // raised slightly to fit a resized profile picture
    verify: (req, res, buf) => { req.rawBody = buf; }
}));

// 5.5 Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin || 'unknown'}`);
    next();
});

// ===== STEP 6: DATABASE SETUP =====
async function setupDatabase() {
    try {
        console.log('📦 Setting up database tables...');
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                email VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ admin_users table ready');
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                booking_ref VARCHAR(20) UNIQUE,
                customer_name VARCHAR(100) NOT NULL,
                customer_email VARCHAR(100) NOT NULL,
                customer_phone VARCHAR(20) NOT NULL,
                hostel_name VARCHAR(200) NOT NULL,
                booking_date DATE NOT NULL,
                booking_time TIME NOT NULL,
                items TEXT,
                items_summary VARCHAR(500),
                total_amount DECIMAL(10,2),
                status VARCHAR(20) DEFAULT 'pending',
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ bookings table ready');
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(50) UNIQUE NOT NULL,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ settings table ready');
        
        // ===== ALL NEW SPECIFIC ITEMS (No more generic items) =====
        const defaultSettings = [
            // Contact settings
            ['whatsapp_number', '233541249742'],
            ['business_email', 'Kodaklogisticsservices@gmail.com'],
            
            // ===== BAGS =====
            ['price_duffle_small', '29.99'],
            ['price_duffle_big', '49.99'],
            ['price_jute_small', '39.99'],
            ['price_jute_medium', '59.99'],
            ['price_jute_big', '79.99'],
            ['price_travel_small', '29.99'],
            ['price_travel_medium', '49.99'],
            ['price_travel_big', '69.99'],
            
            // ===== APPLIANCES =====
            ['price_microwave', '30'],
            ['price_fridge_tabletop', '59.99'],
            ['price_fridge_doubledoor', '79.99'],
            ['price_fridge_small', '39.99'],
            
            // ===== GAS CYLINDERS =====
            ['price_gas_small', '29.99'],
            ['price_gas_medium', '34.99'],
            ['price_gas_big', '39.99'],
            
            // ===== CONTAINERS =====
            ['price_container_small', '29.99'],
            ['price_container_big', '49.99'],

            // ===== ELECTRONICS =====
            ['price_tv_small', '39.99'],
            ['price_tv_medium', '54.99'],
            ['price_tv_large', '69.99'],
            ['price_tv_xlarge', '89.99'],

            // ===== FREE ITEMS =====
            ['price_buckets', '0']
        ];
        
        for (const [key, value] of defaultSettings) {
            await db.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO NOTHING',
                [key, value]
            );
        }
        
        // Optional: Delete old generic settings if they exist
        const oldSettings = ['price_small', 'price_medium', 'price_big', 'price_fridge', 'price_gas'];
        for (const oldKey of oldSettings) {
            await db.query('DELETE FROM settings WHERE setting_key = $1', [oldKey]);
        }
        
        console.log('✅ Default settings inserted (specific items only, old generic items removed)');
        console.log('✅ All database tables are ready!');
        
    } catch (error) {
        console.error('❌ Database setup error:', error);
    }
}

// ===== STEP 6.5: ADD PAYMENT COLUMNS & RETURN TABLES =====
async function addPaymentColumns() {
    try {
        console.log('💰 Checking payment columns...');
        await ensurePaymentColumns();
        console.log('✅ Payment columns check complete');
    } catch (error) {
        console.log('⚠️ Payment columns check warning:', error.message);
    }
}

async function addReturnTables() {
    try {
        console.log('📦 Checking return tables...');
        await ensureReturnTables();
        console.log('✅ Return tables check complete');
    } catch (error) {
        console.log('⚠️ Return tables check warning:', error.message);
    }
}

async function addReviewsTable() {
    try {
        console.log('📦 Checking reviews table...');
        await ensureReviewsTable();
        console.log('✅ Reviews table check complete');
    } catch (error) {
        console.log('⚠️ Reviews table check warning:', error.message);
    }
}

// ===== STEP 7: SET UP ROUTES =====

app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Kodak Logistics API is running!',
        time: new Date().toISOString()
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/returns', returnsRoutes);  // ADD THIS LINE
app.use('/api/reviews', reviewsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/payments', paymentsRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'Origin not allowed' });
    }
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ===== STEP 8: START THE SERVER =====

const PORT = process.env.PORT || 3000;

async function startServer() {
    console.log('🚀 Starting Kodak Logistics server...');
    
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
        console.error('❌ Cannot start server without database');
        process.exit(1);
    }
    
    await setupDatabase();
    
    // ADD PAYMENT COLUMNS
    await addPaymentColumns();
    
    // ADD RETURN TABLES
    await addReturnTables();

    // ADD REVIEWS TABLE
    await addReviewsTable();

    // ADD ADMIN AVATAR COLUMN
    try {
        console.log('🖼️ Checking admin avatar column...');
        await ensureAdminAvatarColumn();
        console.log('✅ Admin avatar column check complete');
    } catch (error) {
        console.log('⚠️ Admin avatar column check warning:', error.message);
    }

    // CHECK PAYSTACK CONFIG
    if (process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_PUBLIC_KEY) {
        console.log('✅ Paystack keys detected — online checkout is enabled');
    } else {
        console.log('⚠️ PAYSTACK_SECRET_KEY / PAYSTACK_PUBLIC_KEY not set — online checkout will stay disabled until they are added to .env');
    }

    app.listen(PORT, () => {
        console.log('✅ ==================================');
        console.log(`✅ Server running on http://localhost:${PORT}`);
        console.log(`✅ API available at http://localhost:${PORT}/api`);
        console.log(`✅ Test the API: http://localhost:${PORT}/api/test`);
        console.log('✅ ==================================');
    });
}

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
});

startServer();