import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
    try {
        const now = new Date();

        // Check expired booking that hasn't paid yet
        const expiredBookings = await prisma.booking.findMany({
            where: {
                status: 'PENDING',
                expiresAt: { lt: now },
            },
        });

        if (expiredBookings.length === 0) {
            return NextResponse.json({ message: 'No expired reservations found.' });
        }

        const seatIdsToRelease = expiredBookings.map((b) => b.seatId);

        // Cancel booking and reverse seat to `AVAILABLE`
        await prisma.$transaction([
            prisma.booking.updateMany({
                where: { id: { in: expiredBookings.map((b) => b.id) } },
                data: { status: 'FAILED' },
            }),
            prisma.seat.updateMany({
                where: { id: { in: seatIdsToRelease } },
                data: { status: 'AVAILABLE' },
            }),
        ]);

        return NextResponse.json({
            success: true,
            releasedCount: expiredBookings.length,
            message: `Successfully released ${expiredBookings.length} expired seats.`,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
