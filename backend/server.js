// backend/server.js - UPGRADED VERSION (No more generic items)
// This starts everything and connects all the pieces

// ===== STEP 1: LOAD ENVIRONMENT VARIABLES =====
require('dotenv').config();

// ===== STEP 2: IMPORT PACKAGES =====
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./database/db');

// ===== STEP 3: IMPORT ROUTES =====
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const settingsRoutes = require('./routes/settings');
const customersRoutes = require('./routes/customers');

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
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// 5.3 Additional CORS middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.some(allowed => origin === allowed || (allowed.includes('*') && origin && origin.includes('onrender.com')))) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
        console.log('📋 Handling preflight request');
        return res.sendStatus(200);
    }
    next();
});

// 5.4 Parse JSON bodies
app.use(express.json());

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
            ['whatsapp_number', '233545025296'],
            ['business_email', 'Philiptesimbo@gmail.com'],
            
            // ===== BAGS =====
            // Ghana Must Go Bag
            ['price_ghana_must_go', '40'],
            
            // Duffle Bags
            ['price_duffle_small', '29.99'],
            ['price_duffle_big', '49.99'],
            
            // Jute Bags
            ['price_jute_small', '39.99'],
            ['price_jute_medium', '59.99'],
            ['price_jute_big', '79.99'],
            
            // Traveling Bags / Suitcases
            ['price_travel_small', '29.99'],
            ['price_travel_medium', '49.99'],
            ['price_travel_big', '69.99'],
            
            // ===== APPLIANCES =====
            // Microwave
            ['price_microwave', '30'],
            
            // Fridges (specific sizes)
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
            
            // ===== FREE ITEMS =====
            ['price_buckets', '0']
        ];
        
        for (const [key, value] of defaultSettings) {
            await db.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO NOTHING',
                [key, value]
            );
        }
        
        // Optional: Delete old generic settings if they exist (comment out if you want to keep them)
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

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
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