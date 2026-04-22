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

// ========== EXPORT ALL FUNCTIONS ==========
module.exports = {
    testConnection,
    query,
    getOne,
    insert,
    update,
    tableExists,
    ensurePaymentColumns  // ADD THIS
};