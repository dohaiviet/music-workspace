import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { createUserSession, getAdminUser } from '@/lib/auth';
import { nanoid } from 'nanoid';

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
    try {
        const { name, avatar } = await request.json();

        if (!name || !avatar) {
            return NextResponse.json(
                { error: 'Name and avatar are required' },
                { status: 400 }
            );
        }

        await dbConnect();

        const sessionId = nanoid();
        const user = await User.create({
            name,
            avatar,
            sessionId,
        });

        // Set session cookie
        const response = NextResponse.json({ user }, { status: 201 });
        response.cookies.set('sessionId', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        return response;
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
}

// GET /api/users - List all users (admin only)
export async function GET(request: NextRequest) {
    try {
        const adminUser = await getAdminUser();

        if (!adminUser) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await dbConnect();
        const users = await User.find({}).sort({ createdAt: -1 });

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}
