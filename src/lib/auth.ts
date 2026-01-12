import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import dbConnect from './mongodb';
import User from '@/models/User';

import bcrypt from 'bcryptjs';

export async function getCurrentUser() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sessionId')?.value;

    if (!sessionId) {
        return null;
    }

    await dbConnect();
    const user = await User.findOne({ sessionId });
    return user;
}

export async function createUserSession(userId: string) {
    const sessionId = nanoid();
    const cookieStore = await cookies();

    await dbConnect();
    await User.findByIdAndUpdate(userId, { sessionId });

    cookieStore.set('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return sessionId;
}

export async function getAdminUser() {
    const cookieStore = await cookies();
    const adminSessionId = cookieStore.get('adminSessionId')?.value;

    await dbConnect();

    // 1. Try Admin Session Cookie
    if (adminSessionId) {
        const adminUser = await User.findOne({ adminSessionId, isAdmin: true });
        if (adminUser) {
            return { isAdmin: true, ...adminUser.toObject() };
        }
    }

    // 2. Fallback: Check Regular Session (for promoted admins)
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.isAdmin) {
         return { isAdmin: true, ...currentUser.toObject() };
    }

    return null;
}

export async function verifyAdminCredentials(username?: string, password?: string) {
    // 1. Check DB for username/password
    if (username && password) {
        await dbConnect();
        const user = await User.findOne({ username }).select('+password');

        if (user && user.isAdmin && user.password) {
            const isValid = await bcrypt.compare(password, user.password);
            if (isValid) {
                return { type: 'db', user };
            }
        }
    }

    // 2. Fallback: Check ENV password (legacy/root admin)
    // Only if username is NOT provided (legacy flow) OR if it matches a specific "root" username?
    // Let's say if username is empty, we check ENV password.
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!username && password && adminPassword && password === adminPassword) {
        return { type: 'env' };
    }

    return null;
}

export async function createAdminSession(userId?: string) {
    const sessionId = nanoid();
    const cookieStore = await cookies();

    if (userId) {
        await dbConnect();
        await User.findByIdAndUpdate(userId, { adminSessionId: sessionId });
    }

    cookieStore.set('adminSessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 1 day
    });

    return sessionId;
}
