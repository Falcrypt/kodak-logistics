// backend/scripts/seed-admin.js
// One-time setup: creates (or resets the password for) the admin account
// defined by ADMIN_USERNAME / ADMIN_PASSWORD in your .env file.
//
// Run manually whenever you need to create the first admin or reset a
// forgotten password:
//   node backend/scripts/seed-admin.js

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../database/db');

async function seedAdmin() {
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
        console.error('❌ Set ADMIN_USERNAME and ADMIN_PASSWORD in your .env file first.');
        process.exit(1);
    }

    const connected = await db.testConnection();
    if (!connected) {
        console.error('❌ Could not connect to the database.');
        process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await db.getOne('SELECT id FROM admin_users WHERE username = $1', [username]);

    if (existing) {
        await db.update('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [passwordHash, existing.id]);
        console.log(`✅ Password reset for existing admin "${username}"`);
    } else {
        const id = await db.insert(
            'INSERT INTO admin_users (username, password_hash, email) VALUES ($1, $2, $3)',
            [username, passwordHash, process.env.ADMIN_EMAIL || 'admin@kodak.com']
        );
        console.log(`✅ Admin "${username}" created with ID ${id}`);
    }

    process.exit(0);
}

seedAdmin().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
