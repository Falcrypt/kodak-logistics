// backend/database/db.js - PostgreSQL Version (COMPLETE)
const { Pool } = require('pg');

// Create a connection pool for PostgreSQL
// 🔧 FIX: Always use SSL with rejectUnauthorized: false for Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/kodak_logistics',
    ssl: { rejectUnauthorized: false }  // ✅ THIS IS THE ONLY CHANGE
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
        // Ensure params is always an array
        if (!Array.isArray(params)) {
            params = [params];
        }
        
        console.log('🔍 Executing query:', sql);
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
        
        console.log('🔍 Insert query:', sql);
        console.log('📦 Insert params:', params);
        
        // PostgreSQL needs RETURNING id to get the inserted ID
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

// Helper to check if a table exists (PostgreSQL version)
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

// ✅✅✅ EXPORT ALL FUNCTIONS ✅✅✅
module.exports = {
    testConnection: testConnection,
    query: query,
    getOne: getOne,
    insert: insert,
    update: update,
    tableExists: tableExists
};