import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Playback from '@/models/Playback';
import { getAdminUser } from '@/lib/auth';

// PUT /api/playback/sync - Update current playback time (Admin only)
export async function PUT(request: NextRequest) {
    try {
        const admin = await getAdminUser();

        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { currentTime, isPlaying, broadcastMode } = body;

        if (currentTime === undefined || isPlaying === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        await dbConnect();

        const playback = await Playback.findOne({});

        if (!playback) {
            return NextResponse.json(
                { error: 'No active playback found' },
                { status: 404 }
            );
        }

        playback.currentTime = currentTime;
        playback.isPlaying = isPlaying;
        if (broadcastMode !== undefined) {
            playback.broadcastMode = broadcastMode;
        }
        playback.updatedAt = new Date(); // Reset updatedAt to now
        await playback.save();

        // Trigger pusher event
        if (process.env.PUSHER_APP_ID) {
            const { pusherServer } = await import('@/lib/pusher');
            await pusherServer.trigger('playback', 'sync', {
                currentTime,
                isPlaying,
                broadcastMode: playback.broadcastMode,
                updatedAt: playback.updatedAt,
            });
        }

        return NextResponse.json({ success: true, playback });
    } catch (error) {
        console.error('Error syncing playback:', error);
        return NextResponse.json(
            { error: 'Failed to sync playback' },
            { status: 500 }
        );
    }
}
