import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Song from '@/models/Song';
import Playback from '@/models/Playback';
import { getAdminUser } from '@/lib/auth';

// POST /api/songs/next - Skip to next song (admin only)
export async function POST(request: NextRequest) {
    try {
        const adminUser = await getAdminUser();

        if (!adminUser) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await dbConnect();

        // Get current playback state
        const playback = await Playback.findOne({});

        if (!playback || !playback.currentSongId) {
            return NextResponse.json(
                { error: 'No song is currently playing' },
                { status: 400 }
            );
        }

        // Delete the current song
        await Song.findByIdAndDelete(playback.currentSongId);

        // Find the next song in queue
        const nextSong = await Song.findOne({}).sort({ createdAt: 1 });

        if (nextSong) {
            playback.currentSongId = nextSong._id;
            playback.startedAt = new Date();
        } else {
            playback.currentSongId = null;
            playback.startedAt = null;
        }

        playback.updatedAt = new Date();
        await playback.save();

        return NextResponse.json({
            currentSongId: playback.currentSongId,
        });
    } catch (error) {
        console.error('Error skipping song:', error);
        return NextResponse.json(
            { error: 'Failed to skip song' },
            { status: 500 }
        );
    }
}
