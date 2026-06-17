import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Passive Release Expired Booking
 */

export async function POST() {
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

        return NextResponse.json({
            success: true,
            releasedCount: expiredBookings.length,
            message: `Successfully released ${expiredBookings.length} expired seat reservations.`,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
