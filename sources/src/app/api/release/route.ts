import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';

/**
 * Background Sweeper for releasing EXPIRED seats
 */

export async function POST(req: Request) {
    try {
        const now = new Date();

        const result = await prisma.$transaction(async (tx) => {
            // find EXPIRED Booking PENDING
            const expiredBookings = await tx.booking.findMany({
                where: { status: 'PENDING', expiresAt: { lt: now } },
                select: { id: true, seatId: true },
            });
            if (expiredBookings.length === 0) return { count: 0, seatIds: [] };

            let count = 0;
            let releasedSeats = [];

            // 🕵️ SOLUTION Optimistic Concurrency Control OCC
            for (const booking of expiredBookings) {
                try {
                    const seat = await tx.seat.findUnique({ where: { id: booking.seatId } });
                    if (seat && seat.status === 'PENDING') {
                        // reset seat
                        await tx.seat.update({
                            where: { id: booking.seatId, version: seat.version },
                            data: { status: 'AVAILABLE', version: seat.version + 1 },
                        });

                        // FAILED booking
                        await tx.booking.update({
                            where: { id: booking.id },
                            data: { status: 'FAILED' },
                        });

                        releasedSeats.push(seat.id);
                        count++;
                    }
                } catch (err) {
                    // if conflict P2025 (by other request booked this seat),
                    // ignore and continue other seats because this is background sweeper
                    continue;
                }
            }
            return { count: expiredBookings.length, seatIds: releasedSeats };
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
