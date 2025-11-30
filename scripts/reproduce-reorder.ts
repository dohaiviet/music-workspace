
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import mongoose from 'mongoose';
import Song from '../src/models/Song';
import dbConnect from '../src/lib/mongodb';

async function reproduce() {
    await dbConnect();

    const allDayId = '69298266d65549c7b8570752';
    const thangMayId = '692bc6824a0eb8447d6bf50f';
    const hoangThuyId = '69298237f96b18e4844fcc6e';

    const orderedIds = [allDayId, thangMayId, hoangThuyId];

    console.log('Sending reorder request with IDs:', orderedIds);

    // Simulate API logic directly to verify Mongoose behavior
    const operations = orderedIds.map((id, index) => {
        return {
            updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(id) },
                update: { $set: { order: index } }
            }
        };
    });

    try {
        const result = await Song.bulkWrite(operations);
        console.log('BulkWrite Result:', result);
    } catch (error) {
        console.error('BulkWrite Error:', error);
    }

    // Verify
    const songs = await Song.find({ _id: { $in: orderedIds } }).sort({ order: 1 });
    console.log('--- New State ---');
    songs.forEach(s => {
        console.log(`${s.title}: ${s.order}`);
    });

    process.exit(0);
}

reproduce();
