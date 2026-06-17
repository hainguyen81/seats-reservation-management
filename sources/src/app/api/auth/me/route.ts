import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
    // check session
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ loggedIn: false }, { status: 401 });
    }

    // check user from database
    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, username: true },
    });

    // not found user
    if (!user) return NextResponse.json({ loggedIn: false }, { status: 404 });

    // seats by me -> PENDING
    const activeHolds = await prisma.booking.findMany({
        where: {
            userId: user.id,
            status: 'PENDING',
            expiresAt: { gte: new Date() }, // Phải còn trong hạn giữ chỗ
        },
        select: {
            seatId: true,
            expiresAt: true,
        },
    });

    // early expired
    let earliestExpiry = null;
    if (activeHolds.length > 0) {
        const expTimes = activeHolds.map(h => h.expiresAt.getTime());
        earliestExpiry = new Date(Math.min(...expTimes)).toISOString();
    }
    return NextResponse.json({
        loggedIn: true, user,
        heldSeatIds: activeHolds.map(h => h.seatId),
        expiresAt: earliestExpiry
    });
}
