import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { verifyAccessToken } from '@/lib/auth';

/**
 * Passive Release Expired Booking
 */

export async function POST(req: Request) {
    const session = await verifyAccessToken();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized - Access Token Expired' }, { status: 401 });
    }

    const { seatId } = await req.json();

    try {
        const now = new Date();

        // 🕵️ Step 1: Find all `EXPIRED` booking `PENDING`
        const expiredBookings = await prisma.booking.findMany({
            where: {
                status: 'PENDING',
                expiresAt: { lt: now },
            },
            select: {
                id: true,
                seatId: true,
            },
        });

        // Not found any expired booking, do nothing
        if (expiredBookings.length === 0) {
            return NextResponse.json({ success: true, releasedCount: 0, message: 'No expired seats found.' });
        }

        const expiredBookingIds = expiredBookings.map((b) => b.id);
        const expiredSeatIds = expiredBookings.map((b) => b.seatId);

        // 🕵️ Step 2: in transaction
        await prisma.$transaction([
            // update booking -> `FAILED`
            prisma.booking.updateMany({
                where: { id: { in: expiredBookingIds } },
                data: { status: 'FAILED' },
            }),

            // Reset `AVAILABLE` seats
            prisma.seat.updateMany({
                where: { id: { in: expiredSeatIds } },
                data: { status: 'AVAILABLE' },
            }),
        ]);

        // audit
        await auditLog({
            userId: session.userId,
            action: 'RELEASE',
            target: seatId.join(', '),
            status: 'SUCCESS',
            req
        });

        return NextResponse.json({
            success: true,
            releasedCount: expiredBookings.length,
            message: `Successfully released ${expiredBookings.length} expired seat reservations.`,
        });
    } catch (error: any) {
        // audit
        await auditLog({
            userId: session.userId,
            action: 'HOLD',
            target: seatId.join(', '),
            status: 'FAILED',
            details: { error: error.message },
            req
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
