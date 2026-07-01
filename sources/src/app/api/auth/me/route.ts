import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { withGlobalErrorHandler } from '@/lib/apiWrapper';

export const GET = withGlobalErrorHandler(async () => {
    // 1. Check Access Token
    let session = await verifyAccessToken();
    let isRefreshed = false;

    // 2. REFRESH: if Access Token expired, change token [SILENT REFRESH]
    if (!session) {
        // call API refresh
        const cookieStore = require('next/headers').cookies();
        const { REFRESH_COOKIE, ACCESS_COOKIE, generateAccessToken } = require('@/lib/auth');
        const { jwtVerify } = require('jose');
        const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'linkz-assessment-senior-lead-secret-key-2026');

        const refreshToken = (await cookieStore).get(REFRESH_COOKIE)?.value;
        if (refreshToken) {
            try {
                const { payload } = await jwtVerify(refreshToken, JWT_SECRET);
                const user = await prisma.user.findUnique({ where: { id: payload.userId } });

                if (user && user.refreshToken === refreshToken) {
                    const newAccessToken = await generateAccessToken(user.id);
                    (await cookieStore).set(ACCESS_COOKIE, newAccessToken, {
                        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 15 * 60,
                    });
                    session = { userId: user.id }; // Restore session successful
                    isRefreshed = true;
                }
            } catch { }
        }
    }

    if (!session) {
        return NextResponse.json({ loggedIn: false, error: 'Session expired' }, { status: 401 });
    }

    // 3. Request user information
    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, username: true },
    });

    const activeHolds = await prisma.booking.findMany({
        where: { userId: session.userId, status: 'PENDING', expiresAt: { gte: new Date() } },
        select: { seatId: true, expiresAt: true },
    });

    let earliestExpiry = null;
    if (activeHolds.length > 0) {
        earliestExpiry = new Date(Math.min(...activeHolds.map(h => h.expiresAt.getTime()))).toISOString();
    }

    return NextResponse.json({
        loggedIn: true,
        user,
        heldSeatIds: activeHolds.map(h => h.seatId),
        expiresAt: earliestExpiry,
        tokenRotated: isRefreshed
    });
}, false);
