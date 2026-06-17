import { NextResponse } from 'next/server';
import { verifyAccessToken, deleteTokensSession } from '@/lib/auth';

export async function POST() {
    try {
        // 1. check user via Access Token
        const session = await verifyAccessToken();

        if (session && session.userId) {
            // 💡 clear session + tokens
            await deleteTokensSession(session.userId);
        } else {
            // if Access Token expired, we use server root rights to force clear
            const cookieStore = require('next/headers').cookies();
            const { ACCESS_COOKIE, REFRESH_COOKIE } = require('@/lib/auth');

            const store = await cookieStore;
            store.delete(ACCESS_COOKIE);
            store.delete(REFRESH_COOKIE);
        }

        return NextResponse.json({
            success: true,
            message: 'Session successfully revoked and cookies cleared.'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
