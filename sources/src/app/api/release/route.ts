import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';

export async function POST(req: Request) {
    try {
        const now = new Date();

        const result = await prisma.$transaction(async (tx) => {
            // Check expired booking that hasn't paid yet
            const expiredBookings = await prisma.booking.findMany({
                where: {
                    status: 'PENDING',
                    expiresAt: { lt: now },
                },
            });

            if (expiredBookings.length === 0) {
                return { count: 0, seatIds: [] };
            }

            const expiredBookingIds = expiredBookings.map((b) => b.id);
            const expiredSeatIds = expiredBookings.map((b) => b.seatId);

            // Cancel booking and reverse seat to `AVAILABLE`
            await tx.booking.updateMany({
                where: { id: { in: expiredBookingIds } },
                data: { status: 'FAILED' },
            });
            await tx.seat.updateMany({
                where: { id: { in: expiredSeatIds } },
                data: { status: 'AVAILABLE' },
            });
            return { count: expiredBookings.length, seatIds: expiredSeatIds };
        });

        // audit
        if (result.count > 0) {
            await auditLog({
                userId: null, // 💡 Cron/Worker
                action: 'RELEASE_EXPIRED',
                target: `Seats: ${result.seatIds.join(', ')}`,
                status: 'SUCCESS',
                details: { releasedCount: result.count, automaticTrigger: true },
                req
            });
        }

        return NextResponse.json({
            success: true,
            releasedCount: result.count,
            releasedSeats: result.seatIds,
            message: `Successfully released ${result.count} expired seat reservations via global sweeper.`,
        });
    } catch (error: any) {
        // audit
        await auditLog({
            userId: null,
            action: 'RELEASE_EXPIRED',
            target: 'All `PENDING` expired seats',
            status: 'FAILED',
            details: { error: error.message },
            req
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
