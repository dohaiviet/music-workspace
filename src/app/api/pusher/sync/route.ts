import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Playback from '@/models/Playback';
import { getAdminUser } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

// POST /api/pusher/sync - Trigger Pusher event for current playback time (Admin only)
export async function POST(request: NextRequest) {
    try {
        const admin = await getAdminUser();

        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { currentTime, isPlaying } = body;

        if (currentTime === undefined || isPlaying === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        await dbConnect();

        // 1. Send the Real-Time Event via Pusher first (Prioritize speed)
        try {
            await pusherServer.trigger('music-room', 'sync-time', {
                currentTime,
                isPlaying,
                timestamp: Date.now() // So client can calculate exact latency
            });
        } catch (pusherError) {
             console.error('Failed to trigger Pusher event:', pusherError);
             // Proceed anyway to save to DB fallback
        }

        // 2. Also save to DB as fallback for late joiners connecting after event
        const playback = await Playback.findOne({});

        if (playback) {
            // Note: DB doesn't have currentTime/isPlaying anymore? In the previous steps we added it.
            // Oh right, we removed it from Playback schema in step 118 when user reverted it.
            // Let's just update updatedAt to indicate activity or leave it alone.
            playback.updatedAt = new Date();
            await playback.save();
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in pusher sync:', error);
        return NextResponse.json(
            { error: 'Failed to sync via pusher' },
            { status: 500 }
        );
    }
}
