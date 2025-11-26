import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Song from '@/models/Song';
import { getAdminUser } from '@/lib/auth';

// PUT /api/songs/reorder - Update song order (Admin only)
export async function PUT(request: NextRequest) {
    try {
        const admin = await getAdminUser();

        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { orderedIds } = body;

        if (!Array.isArray(orderedIds)) {
            return NextResponse.json(
                { error: 'Invalid data format' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Update order for each song
        const operations = orderedIds.map((id, index) => {
            return {
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(id) },
                    update: { $set: { order: index } }
                }
            };
        });

        console.log('Reordering songs:', orderedIds);
        console.log('Operations count:', operations.length);

        if (operations.length > 0) {
            const result = await Song.collection.bulkWrite(operations);
            console.log('BulkWrite result:', result);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error reordering songs:', error);
        return NextResponse.json(
            { error: 'Failed to reorder songs', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
