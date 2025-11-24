import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
    try {
        const { username, password, name } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Check if username exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return NextResponse.json(
                { error: 'Username already exists' },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const sessionId = nanoid();

        const user = await User.create({
            name: name || 'Admin',
            username,
            password: hashedPassword,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            isAdmin: true,
            sessionId,
        });

        return NextResponse.json({ success: true, user: { username: user.username, isAdmin: user.isAdmin } });
    } catch (error) {
        console.error('Error creating admin:', error);
        return NextResponse.json(
            { error: 'Failed to create admin' },
            { status: 500 }
        );
    }
}
