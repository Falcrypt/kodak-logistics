// backend/server.js - MAIN SERVER FILE
// This starts everything and connects all the pieces

// ===== STEP 1: LOAD ENVIRONMENT VARIABLES =====
// This reads the .env file we created
require('dotenv').config();

// ===== STEP 2: IMPORT PACKAGES =====
// These are the tools we installed
const express = require('express');        // Web server
const cors = require('cors');              // Allows cross-origin requests
const helmet = require('helmet');           // Security headers
const db = require('./database/db');        // Our database connection

// ===== STEP 3: IMPORT ROUTES =====
// These are the files we created
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const settingsRoutes = require('./routes/settings');
const customersRoutes = require('./routes/customers');

// ===== STEP 4: CREATE EXPRESS APP =====
const app = express();

// ===== STEP 5: MIDDLEWARE =====
// These run on every request

// 5.1 Security headers (but relaxed for development)
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development
    crossOriginEmbedderPolicy: false
}));

// 5.2 Allow cross-origin requests
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500', 'null'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// 5.3 Additional CORS middleware to handle all requests and preflight
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://127.0.0.1:5500');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        console.log('📋 Handling preflight request');
        return res.sendStatus(200);
    }
    next();
});

// 5.4 Parse JSON bodies (so we can read data from forms)
app.use(express.json());

// 5.5 Log all requests (helpful for debugging)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin || 'unknown'}`);
    next(); // Continue to next middleware
});

// ===== STEP 6: DATABASE SETUP =====
// This creates all the tables if they don't exist

async function setupDatabase() {
    try {
        console.log('📦 Setting up database tables...');
        
        // 6.1 Create admin_users table (PostgreSQL syntax)
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
        
        // 6.2 Create bookings table (PostgreSQL syntax)
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
        
        // 6.3 Create settings table (PostgreSQL syntax)
        await db.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(50) UNIQUE NOT NULL,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ settings table ready');
        
        // 6.4 Insert default settings if they don't exist
        const defaultSettings = [
            ['whatsapp_number', '233545025296'],
            ['business_email', 'Philiptesimbo@gmail.com'],
            ['price_small', '40'],
            ['price_medium', '50'],
            ['price_big', '60'],
            ['price_fridge', '70']
        ];
        
        for (const [key, value] of defaultSettings) {
            await db.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO NOTHING',
                [key, value]
            );
        }
        console.log('✅ default settings inserted');
        
        console.log('✅ All database tables are ready!');
        
    } catch (error) {
        console.error('❌ Database setup error:', error);
    }
}

// ===== STEP 7: SET UP ROUTES =====
// This connects our route files to specific URLs

// 7.1 Test route - to check if server is running
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Kodak Logistics API is running!',
        time: new Date().toISOString()
    });
});

// 7.2 Mount our routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customersRoutes);

// 7.3 404 handler for unknown routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// 7.4 Error handler
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ===== STEP 8: START THE SERVER =====

const PORT = process.env.PORT || 3000;

async function startServer() {
    console.log('🚀 Starting Kodak Logistics server...');
    
    // 8.1 Test database connection
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
        console.error('❌ Cannot start server without database');
        console.error('💡 Make sure MySQL is installed and running');
        console.error('💡 Check your .env file has correct DB_PASSWORD');
        process.exit(1); // Stop the server
    }
    
    // 8.2 Setup database tables
    await setupDatabase();
    
    // 8.3 Start listening for requests
    app.listen(PORT, () => {
        console.log('✅ ==================================');
        console.log(`✅ Server running on http://localhost:${PORT}`);
        console.log(`✅ API available at http://localhost:${PORT}/api`);
        console.log(`✅ Test the API: http://localhost:${PORT}/api/test`);
        console.log('✅ ==================================');
    });
}

// 8.4 Handle errors
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
});

// Start everything
startServer();