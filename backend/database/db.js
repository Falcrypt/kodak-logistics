// backend/database/db.js
// This file connects to MySQL database

const mysql = require('mysql2');

// Create a connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Kodak@123',
    database: process.env.DB_NAME || 'kodak_logistics',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Convert to promises
const promisePool = pool.promise();

// Test the connection
async function testConnection() {
    try {
        const connection = await promisePool.getConnection();
        console.log('✅ Database connected successfully!');
        connection.release();
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
        
        const [rows] = await promisePool.execute(sql, params);
        return rows;
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
        
        const [result] = await promisePool.execute(sql, params);
        console.log('✅ Insert result:', result);
        return result.insertId;
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
        
        const [result] = await promisePool.execute(sql, params);
        return result.affectedRows;
    } catch (error) {
        console.error('❌ update error:', error.message);
        throw error;
    }
}

// Helper to check if a table exists
async function tableExists(tableName) {
    try {
        const result = await query(
            "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?",
            [process.env.DB_NAME || 'kodak_logistics', tableName]
        );
        return result[0].count > 0;
    } catch (error) {
        console.error('❌ tableExists error:', error.message);
        return false;
    }
}

// ✅✅✅ CRITICAL: EXPORT ALL FUNCTIONS ✅✅✅
module.exports = {
    testConnection: testConnection,
    query: query,
    getOne: getOne,
    insert: insert,
    update: update,
    tableExists: tableExists
};