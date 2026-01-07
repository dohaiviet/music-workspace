import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Song from '@/models/Song';

// GET /api/songs/history - Get played songs
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const total = await Song.countDocuments({ status: 'played' });
        const songs = await Song.find({ status: 'played' })
            .sort({ playedAt: -1, updatedAt: -1 })
            .skip(skip)
            .limit(limit);

        return NextResponse.json({
            songs,
            pagination: {
                current: page,
                total,
                pages: Math.ceil(total / limit),
            }
        });
    } catch (error) {
        console.error('Error fetching history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch history' },
            { status: 500 }
        );
    }
}

// DELETE /api/songs/history - Clear all played songs
export async function DELETE(request: NextRequest) {
    try {
        await dbConnect();

        await Song.deleteMany({ status: 'played' });

        return NextResponse.json({ message: 'History cleared' });
    } catch (error) {
        console.error('Error clearing history:', error);
        return NextResponse.json(
            { error: 'Failed to clear history' },
            { status: 500 }
        );
    }
}
