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

    if (!adminSessionId) {
        return null;
    }

    // Check if it's a DB admin session
    await dbConnect();
    const adminUser = await User.findOne({ adminSessionId, isAdmin: true });

    if (adminUser) {
        return { isAdmin: true, ...adminUser.toObject() };
    }

    // Fallback: Check if it's a legacy env session (if we want to keep supporting it temporarily)
    // For now, let's assume if it's not in DB, it might be the legacy session ID if we didn't clear it.
    // But to be safe and strict, we should probably rely on DB if possible.
    // However, the previous implementation just stored a random ID in cookie and didn't check against anything server-side other than existence?
    // Wait, the previous implementation was:
    // cookieStore.set('adminSessionId', sessionId, ...)
    // And getAdminUser just checked: if (adminSessionId) return { isAdmin: true }
    // This was very insecure if the session ID wasn't validated against anything! 
    // Anyone could set a cookie named adminSessionId? No, because it's httpOnly and signed? No, Next.js cookies are secure but if I just check for existence...
    // Actually, the previous implementation generated a random ID and set it. It didn't store it anywhere server-side.
    // So yes, it was stateless and relied on the fact that only the server could set it.
    // But we want stateful now.

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
