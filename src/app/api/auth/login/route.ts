import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession, createUserSession, verifyAdminCredentials } from '@/lib/auth';

// POST /api/auth/login - Admin login
export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!password) {
            return NextResponse.json(
                { error: 'Password is required' },
                { status: 400 }
            );
        }

        const result = await verifyAdminCredentials(username, password);

        if (!result) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Create admin session
        await createAdminSession(result.user?._id);

        // Create regular user session (for search, adding songs, etc.)
        // Assuming result.user?._id is the user ID needed for createUserSession
        if (result.user?._id) {
            await createUserSession(result.user._id);
        }

        const response = NextResponse.json({ success: true });

        // The original logic for setting 'sessionId' cookie is now handled by createUserSession
        // if (result.user && result.user.sessionId) {
        //     response.cookies.set('sessionId', result.user.sessionId, {
        //         httpOnly: true,
        //         secure: process.env.NODE_ENV === 'production',
        //         sameSite: 'lax',
        //         maxAge: 60 * 60 * 24 * 30, // 30 days
        //     });
        // }

        return response;
    } catch (error) {
        console.error('Error logging in:', error);
        return NextResponse.json(
            { error: 'Failed to login' },
            { status: 500 }
        );
    }
}
