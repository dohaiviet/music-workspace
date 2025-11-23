import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import dbConnect from './mongodb';
import User from '@/models/User';

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

    // Check if admin session exists (from password login)
    if (adminSessionId) {
        return { isAdmin: true }; // Return a simple admin indicator
    }

    return null;
}

export async function verifyAdminPassword(password: string) {
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        throw new Error('ADMIN_PASSWORD not set in environment variables');
    }

    return password === adminPassword;
}

export async function createAdminSession() {
    const sessionId = nanoid();
    const cookieStore = await cookies();

    cookieStore.set('adminSessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 1 day
    });

    return sessionId;
}
