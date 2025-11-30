
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import mongoose from 'mongoose';
import Song from '../src/models/Song';
import dbConnect from '../src/lib/mongodb';

async function migrateStatus() {
    await dbConnect();

    console.log('Finding songs with missing status...');
    // Use $exists: false to find documents where the field is missing
    const result = await Song.updateMany(
        { status: { $exists: false } },
        { $set: { status: 'queued' } }
    );

    console.log(`Updated ${result.modifiedCount} songs.`);

    process.exit(0);
}

migrateStatus();
