/**
 * -------------------------------------------------
 * 🔥 Export mode outputs a static site without a runtime server.
 * Features that require the Next.js runtime are not supported,
 * because this mode produces a static site, and no runtime server.
 * -------------------------------------------------
 */
export const dynamic = 'force-static';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/db';
import { generateAccessToken, ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth';
import { withGlobalErrorHandler } from '@/lib/apiWrapper';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'linkz-secure-secret-key');

// API
export const POST = withGlobalErrorHandler(async () => {
    try {
        const cookieStore = await cookies();
        const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
        if (!refreshToken) {
            return NextResponse.json({ error: '🛡️ Refresh token missing' }, { status: 401 });
        }

        // 1. check Refresh Token
        let payload;
        try {
            const { payload: verifiedPayload } = await jwtVerify(refreshToken, JWT_SECRET);
            payload = verifiedPayload as { userId: string };
        } catch {
            return NextResponse.json({ error: '🛡️ Invalid or expired refresh token' }, { status: 401 });
        }

        // 2. check Refresh Token from DB
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });
        if (!user || user.refreshToken !== refreshToken) {
            return NextResponse.json({ error: '🛡️ Token revoked or session hijacked' }, { status: 401 });
        }

        // 3. Valid: Generate Access Token
        const newAccessToken = await generateAccessToken(user.id);
        cookieStore.set(ACCESS_COOKIE, newAccessToken, {
            httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
            maxAge: 15 * 60,
        });

        return NextResponse.json({ success: true, message: '🛡️ Token rotated successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}, false);
