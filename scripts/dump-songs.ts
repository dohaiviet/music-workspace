import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import mongoose from 'mongoose';
import Song from '../src/models/Song';
import dbConnect from '../src/lib/mongodb';

async function dumpSongs() {
    await dbConnect();
    const songs = await Song.find({}).sort({ order: 1, createdAt: 1 }).lean();

    console.log('--- Current DB State ---');
    console.log('ID | Order | Status | Title | CreatedAt');
    songs.forEach(s => {
        console.log(`${s._id} | ${s.order} | ${s.status} | ${s.title} | ${s.createdAt}`);
    });
    console.log('------------------------');

    process.exit(0);
}

dumpSongs();
