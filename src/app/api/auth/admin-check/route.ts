import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth';

// GET /api/auth/admin-check - Check if user has admin session
export async function GET(request: NextRequest) {
    try {
        const admin = await getAdminUser();

        if (!admin) {
            return NextResponse.json(
                { error: 'Not authenticated as admin' },
                { status: 401 }
            );
        }

        return NextResponse.json({ isAdmin: true });
    } catch (error) {
        console.error('Error checking admin:', error);
        return NextResponse.json(
            { error: 'Failed to check admin status' },
            { status: 500 }
        );
    }
}
