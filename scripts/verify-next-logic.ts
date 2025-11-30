
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import mongoose from 'mongoose';
import Song from '../src/models/Song';
import dbConnect from '../src/lib/mongodb';

async function verifyNextLogic() {
    await dbConnect();

    console.log('--- Simulating /api/songs/next logic ---');

    // 1. Find current song (first queued)
    const currentSong = await Song.findOne({ status: 'queued' }).sort({ order: 1, createdAt: 1 });

    if (!currentSong) {
        console.log('No current song found (queue empty).');
        return;
    }

    console.log(`Current Song (would be marked played): ${currentSong.title} (Order: ${currentSong.order})`);

    // 2. Simulate marking it played (we won't save this to avoid changing state)
    // We just search for the NEXT one assuming current is played.
    // The query for next song is the SAME: findOne({ status: 'queued' })...
    // But since we didn't save the status change, we need to skip the first one or filter it out.

    // Actually, let's find ALL queued songs to see the order.
    const queuedSongs = await Song.find({ status: 'queued' }).sort({ order: 1, createdAt: 1 });

    console.log('Queued Songs Order:');
    queuedSongs.forEach((s, i) => {
        console.log(`${i}. ${s.title} (Order: ${s.order})`);
    });

    if (queuedSongs.length > 1) {
        console.log(`Expected Next Song: ${queuedSongs[1].title}`);
    } else {
        console.log('No next song in queue.');
    }

    process.exit(0);
}

verifyNextLogic();
