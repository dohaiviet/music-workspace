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

        if (!playback) {
            // If no playback document exists, create one
            const newPlayback = new Playback({
                currentSongId: null,
                startedAt: null,
                updatedAt: new Date(),
            });
            await newPlayback.save();
            // Then proceed with the new playback object
            // Or, if the intention is to always have a playback document,
            // the following logic will handle the 'no song playing' case.
        }

        // Find the current song (first queued song)
        const currentSong = await Song.findOne({ status: 'queued' }).sort({ order: 1, createdAt: 1 });

        if (!currentSong) {
            return NextResponse.json(
                { error: 'No song is currently playing' },
                { status: 400 }
            );
        }

        // Mark current song as played
        currentSong.status = 'played';
        currentSong.playedAt = new Date();
        await currentSong.save();

        // Find next song: prioritize queued songs (sorted by order), then fall back to oldest played song
        let nextSong = await Song.findOne({ status: 'queued' }).sort({ order: 1, createdAt: 1 });

        if (!nextSong) {
            // No queued songs, pick oldest played song for auto-replay
            nextSong = await Song.findOne({ status: 'played' }).sort({ playedAt: 1 });

            if (nextSong) {
                // Mark it as queued again for replay
                nextSong.status = 'queued';
                // Put it at the end of the queue if new songs are added
                const lastSong = await Song.findOne({ status: 'queued' }).sort({ order: -1 });
                nextSong.order = lastSong && lastSong.order !== undefined ? lastSong.order + 1 : 0;
                await nextSong.save();
            }
        }

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
