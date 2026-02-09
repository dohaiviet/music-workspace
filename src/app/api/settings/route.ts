import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SystemSetting from '@/models/SystemSetting';
import { getAdminUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const settings = await SystemSetting.find({});
        const result = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, any>);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const admin = await getAdminUser();
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        await dbConnect();

        const updates = Object.keys(body).map(key => ({
            updateOne: {
                filter: { key },
                update: { $set: { value: body[key] } },
                upsert: true
            }
        }));

        if (updates.length > 0) {
            await SystemSetting.bulkWrite(updates);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
