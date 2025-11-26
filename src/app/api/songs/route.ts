import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Song from '@/models/Song';
import Playback from '@/models/Playback';
import { getCurrentUser, getAdminUser } from '@/lib/auth';
import { extractVideoId, getVideoMetadata } from '@/lib/youtube';

// GET /api/songs - Get all songs in queue with current playing
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        // Sort by order (asc) then createdAt (asc) for consistent queue
        const songs = await Song.find({}).sort({ order: 1, createdAt: 1 });
        const playback = await Playback.findOne({});

        // Treat missing status as 'queued' for backward compatibility
        const queue = songs.filter(s => s.status === 'queued' || !s.status);

        return NextResponse.json({
            songs: queue,
            currentSongId: playback?.currentSongId || null,
        });
    } catch (error) {
        console.error('Error fetching songs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch songs' },
            { status: 500 }
        );
    }
}

// POST /api/songs - Add new song to queue
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { youtubeUrl } = body;

        if (!youtubeUrl) {
            return NextResponse.json(
                { error: 'YouTube URL is required' },
                { status: 400 }
            );
        }

        const videoId = extractVideoId(youtubeUrl);

        if (!videoId) {
            return NextResponse.json(
                { error: 'Invalid YouTube URL' },
                { status: 400 }
            );
        }

        const metadata = await getVideoMetadata(videoId);

        if (!metadata) {
            return NextResponse.json(
                { error: 'Failed to fetch video metadata' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Get max order to append to end
        const lastSong = await Song.findOne({ status: 'queued' }).sort({ order: -1 });
        const newOrder = lastSong && lastSong.order !== undefined ? lastSong.order + 1 : 0;

        const song = await Song.create({
            youtubeUrl,
            videoId,
            title: metadata.title,
            thumbnail: metadata.thumbnail,
            addedBy: user._id,
            addedByName: user.name,
            addedByAvatar: user.avatar,
            order: newOrder,
        });

        // If no song is currently playing, set this as the current song
        let playback = await Playback.findOne({});

        if (!playback) {
            playback = await Playback.create({
                currentSongId: song._id,
                startedAt: new Date(),
            });
        } else if (!playback.currentSongId) {
            playback.currentSongId = song._id;
            playback.startedAt = new Date();
            playback.updatedAt = new Date();
            await playback.save();
        }

        return NextResponse.json({ song }, { status: 201 });
    } catch (error) {
        console.error('Error adding song:', error);
        return NextResponse.json(
            { error: 'Failed to add song' },
            { status: 500 }
        );
    }
}
