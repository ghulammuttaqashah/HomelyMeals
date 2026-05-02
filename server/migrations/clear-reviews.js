/**
 * Migration: Clear all reviews from the database.
 * Run once to start fresh with the new ABSA review system.
 *
 * Usage: node server/migrations/clear-reviews.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI not found in environment variables');
    process.exit(1);
}

async function clearReviews() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected');

        const db = mongoose.connection.db;

        // Count before deletion
        const count = await db.collection('reviews').countDocuments();
        console.log(`📊 Found ${count} reviews to delete`);

        if (count === 0) {
            console.log('ℹ️  No reviews to delete. Collection is already empty.');
        } else {
            const result = await db.collection('reviews').deleteMany({});
            console.log(`🗑️  Deleted ${result.deletedCount} reviews`);
        }

        // Drop old indexes that may conflict with new schema
        try {
            await db.collection('reviews').dropIndexes();
            console.log('🔧 Dropped all indexes (they will be recreated on next server start)');
        } catch (indexErr) {
            console.log('ℹ️  Could not drop indexes (may not exist):', indexErr.message);
        }

        console.log('✅ Migration complete. Reviews collection is clean.');
        console.log('🚀 Start the server to recreate indexes with the new schema.');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

clearReviews();
