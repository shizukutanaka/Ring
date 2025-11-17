#!/usr/bin/env node

/**
 * Migration: Hash Plain Text Passwords
 *
 * This migration fixes a critical security vulnerability by hashing
 * all plain text passwords in the database using bcrypt.
 *
 * CRITICAL: Run this immediately after deploying the password hashing fix
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/webrtc_recorder'
});

const SALT_ROUNDS = 12;

async function migratePasswords() {
  const client = await pool.connect();

  try {
    console.log('🔐 Starting password migration...');

    // Get all users with plain text passwords (those that don't start with $2a or $2b)
    const result = await client.query(`
      SELECT id, username, password_hash
      FROM users
      WHERE password_hash IS NOT NULL
      AND password_hash NOT LIKE '$2%'
      AND LENGTH(password_hash) < 100
    `);

    const usersToMigrate = result.rows;
    console.log(`Found ${usersToMigrate.length} users with plain text passwords`);

    if (usersToMigrate.length === 0) {
      console.log('✅ No plain text passwords found. Migration complete.');
      return;
    }

    await client.query('BEGIN TRANSACTION');

    let migratedCount = 0;
    let errorCount = 0;

    for (const user of usersToMigrate) {
      try {
        // Hash the plain text password
        const hashedPassword = await bcrypt.hash(user.password_hash, SALT_ROUNDS);

        // Update in database
        await client.query(
          'UPDATE users SET password_hash = $1 WHERE id = $2',
          [hashedPassword, user.id]
        );

        migratedCount++;
        console.log(`✓ Migrated user: ${user.username}`);
      } catch (err) {
        errorCount++;
        console.error(`✗ Error migrating user ${user.username}:`, err.message);
      }
    }

    await client.query('COMMIT');

    console.log(`\n📊 Migration Results:`);
    console.log(`✅ Successfully migrated: ${migratedCount} users`);
    console.log(`❌ Failed: ${errorCount} users`);
    console.log(`Total: ${migratedCount + errorCount} users processed`);

    if (errorCount === 0) {
      console.log('\n✅ Password migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors. Review the output above.');
      process.exit(1);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migratePasswords();
