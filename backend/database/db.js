// backend/database/db.js - PostgreSQL Version (COMPLETE) with Payment Columns
const { Pool } = require('pg');

// Create a connection pool for PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/kodak_logistics',
    ssl: { rejectUnauthorized: false }
});

// Test the connection
async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('✅ Database connected successfully!');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Helper function to run SQL queries
async function query(sql, params = []) {
    try {
        if (!Array.isArray(params)) {
            params = [params];
        }
        
        console.log('🔍 Executing query:', sql.substring(0, 100));
        console.log('📦 With params:', params);
        
        const result = await pool.query(sql, params);
        return result.rows;
    } catch (error) {
        console.error('❌ Database query error:');
        console.error('   SQL:', sql);
        console.error('   Params:', JSON.stringify(params));
        console.error('   Error:', error.message);
        throw error;
    }
}

// Helper to get a single row
async function getOne(sql, params = []) {
    try {
        const rows = await query(sql, params);
        return rows[0];
    } catch (error) {
        console.error('❌ getOne error:', error.message);
        throw error;
    }
}

// Helper to insert and get ID
async function insert(sql, params = []) {
    try {
        if (!Array.isArray(params)) {
            params = [params];
        }
        
        console.log('🔍 Insert query:', sql.substring(0, 100));
        console.log('📦 Insert params:', params);
        
        const result = await pool.query(sql + ' RETURNING id', params);
        console.log('✅ Insert result:', result.rows[0]);
        return result.rows[0].id;
    } catch (error) {
        console.error('❌ insert error:', error.message);
        console.error('   SQL:', sql);
        console.error('   Params:', JSON.stringify(params));
        throw error;
    }
}

// Helper to update
async function update(sql, params = []) {
    try {
        if (!Array.isArray(params)) {
            params = [params];
        }
        
        const result = await pool.query(sql, params);
        return result.rowCount;
    } catch (error) {
        console.error('❌ update error:', error.message);
        throw error;
    }
}

// Helper to check if a table exists
async function tableExists(tableName) {
    try {
        const result = await query(
            `SELECT COUNT(*) as count FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = $1`,
            [tableName]
        );
        return parseInt(result[0].count) > 0;
    } catch (error) {
        console.error('❌ tableExists error:', error.message);
        return false;
    }
}

// ========== NEW: AUTO-CREATE PAYMENT COLUMNS ==========
async function ensurePaymentColumns() {
    try {
        console.log('🔧 Checking/Adding payment columns to bookings table...');
        
        // Check if bookings table exists
        const tableExists = await query(`
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'bookings'
        `);
        
        if (parseInt(tableExists[0].count) === 0) {
            console.log('⚠️ Bookings table does not exist yet. Skipping column check.');
            return;
        }
        
        // Add payment_method column
        await query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='bookings' AND column_name='payment_method') THEN
                    ALTER TABLE bookings ADD COLUMN payment_method VARCHAR(20) DEFAULT 'pickup';
                    RAISE NOTICE 'Added payment_method column';
                END IF;
            END $$;
        `);
        
        // Add transaction_id column
        await query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='bookings' AND column_name='transaction_id') THEN
                    ALTER TABLE bookings ADD COLUMN transaction_id VARCHAR(100);
                    RAISE NOTICE 'Added transaction_id column';
                END IF;
            END $$;
        `);
        
        // Add payment_status column
        await query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='bookings' AND column_name='payment_status') THEN
                    ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(30) DEFAULT 'unpaid';
                    RAISE NOTICE 'Added payment_status column';
                END IF;
            END $$;
        `);
        
        // Add payment_verified_at column
        await query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='bookings' AND column_name='payment_verified_at') THEN
                    ALTER TABLE bookings ADD COLUMN payment_verified_at TIMESTAMP;
                    RAISE NOTICE 'Added payment_verified_at column';
                END IF;
            END $$;
        `);
        
        // Add payment_verified_by column
        await query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='bookings' AND column_name='payment_verified_by') THEN
                    ALTER TABLE bookings ADD COLUMN payment_verified_by VARCHAR(100);
                    RAISE NOTICE 'Added payment_verified_by column';
                END IF;
            END $$;
        `);
        
        console.log('✅ Payment columns verified/added successfully!');
    } catch (error) {
        console.log('⚠️ Note: Could not add columns:', error.message);
    }
}

// Add this function to automatically create return tables
async function ensureReturnTables() {
    try {
        console.log('🔧 Creating return tables if not exists...');
        
        // Create return_requests table
        await query(`
            CREATE TABLE IF NOT EXISTS return_requests (
                id SERIAL PRIMARY KEY,
                request_ref VARCHAR(20) UNIQUE,
                booking_id INTEGER REFERENCES bookings(id),
                booking_ref VARCHAR(20) NOT NULL,
                customer_name VARCHAR(100) NOT NULL,
                customer_email VARCHAR(100) NOT NULL,
                customer_phone VARCHAR(20) NOT NULL,
                original_hostel VARCHAR(200),
                items_summary TEXT,
                total_items_stored INTEGER,
                return_date DATE NOT NULL,
                return_time TIME NOT NULL,
                delivery_fee DECIMAL(10,2) DEFAULT 30.00,
                payment_method VARCHAR(20) DEFAULT 'delivery',
                transaction_id VARCHAR(100),
                payment_status VARCHAR(30) DEFAULT 'unpaid',
                special_instructions TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                status_history JSONB DEFAULT '[]',
                admin_notes TEXT,
                confirmed_by VARCHAR(100),
                confirmed_at TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ return_requests table ready');
        
        // Create return_daily_counter table
        await query(`
            CREATE TABLE IF NOT EXISTS return_daily_counter (
                id SERIAL PRIMARY KEY,
                request_date DATE UNIQUE NOT NULL,
                request_count INTEGER DEFAULT 0,
                daily_limit INTEGER DEFAULT 40,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ return_daily_counter table ready');
        
        // Create indexes for faster queries
        await query(`
            CREATE INDEX IF NOT EXISTS idx_return_requests_booking_ref ON return_requests(booking_ref);
            CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);
            CREATE INDEX IF NOT EXISTS idx_return_requests_return_date ON return_requests(return_date);
            CREATE INDEX IF NOT EXISTS idx_return_requests_customer_email ON return_requests(customer_email);
        `);
        console.log('✅ Return tables indexes created');
        
        console.log('✅ All return tables are ready!');
        
    } catch (error) {
        console.error('❌ Error creating return tables:', error.message);
    }
}

// ========== EXPORT ALL FUNCTIONS ==========
module.exports = {
    testConnection,
    query,
    getOne,
    insert,
    update,
    tableExists,
    ensurePaymentColumns,
    ensureReturnTables  // ADD THIS LINE
};

