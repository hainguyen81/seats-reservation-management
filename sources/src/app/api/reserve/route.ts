import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { seatIds, mockPaymentSuccess } = await req.json();
    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
        return NextResponse.json({ error: 'Invalid or empty seat list' }, { status: 400 });
    }

    try {
        // sequential (ACID Transaction) to prevent Race Condition
        const result = await prisma.$transaction(async (tx) => {
            const targetSeats = await tx.seat.findMany({
                where: { id: { in: seatIds } },
            });
            if (targetSeats.length !== seatIds.length) {
                throw new Error('Some requested seats do not exist');
            }

            // check AVAILABLE
            const currentBookings = await tx.booking.findMany({
                where: {
                    seatId: { in: seatIds },
                    userId: session.userId,
                    status: 'PENDING',
                    expiresAt: { gte: new Date() }, // not expired in reserving
                },
            });
            if (currentBookings.length !== seatIds.length) {
                throw new Error('Transaction timeout: Your temporary seat holds have already expired and been released.');
            }

            // Mock Payment
            if (mockPaymentSuccess) {
                // Payment Success -> `BOOKED`
                await tx.seat.updateMany({
                    where: { id: { in: seatIds } },
                    data: { status: 'BOOKED' },
                });

                // `COMPLETED` booking
                await tx.booking.updateMany({
                    where: {
                        seatId: { in: seatIds },
                        userId: session.userId,
                        status: 'PENDING',
                    },
                    data: { status: 'COMPLETED' },
                });
            } else {
                // Payment Failed -> reset to `AVAILABLE`
                await tx.seat.updateMany({
                    where: { id: { in: seatIds } },
                    data: { status: 'AVAILABLE' },
                });

                // `FAILED` booking
                await tx.booking.updateMany({
                    where: {
                        seatId: { in: seatIds },
                        userId: session.userId,
                        status: 'PENDING',
                    },
                    data: { status: 'FAILED' },
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
