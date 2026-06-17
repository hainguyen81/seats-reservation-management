import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { seatId, mockPaymentSuccess } = await req.json();

    try {
        // sequential (ACID Transaction) to prevent Race Condition
        const result = await prisma.$transaction(async (tx) => {
            const seat = await tx.seat.findUnique({
                where: { id: seatId },
            });

            if (!seat || seat.status !== 'AVAILABLE') {
                throw new Error('Seat is no longer available');
            }

            // 1. Reserve seat - `PENDING`
            await tx.seat.update({
                where: { id: seatId },
                data: { status: 'PENDING' },
            });

            // 2. Booking
            const booking = await tx.booking.create({
                data: {
                    userId: session.userId,
                    seatId: seatId,
                    status: 'PENDING',
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // expired in 5 minutes if payment gateway is down
                },
            });

            // 3. Mock Payment
            if (!mockPaymentSuccess) {
                throw new Error('Payment Failed'); // Trigger rollback
            }

            // 4. Success payment -> `BOOKED`
            await tx.seat.update({
                where: { id: seatId },
                data: { status: 'BOOKED' },
            });

            // 5. Completed booking -> `COMPLETED`
            return await tx.booking.update({
                where: { id: booking.id },
                data: { status: 'COMPLETED' },
            });
        });

        return NextResponse.json({ success: true, booking: result });
    } catch (error: any) {
        // General exception, revert seat status -> `AVAILABLE`
        if (error.message === 'Payment Failed') {
            await prisma.seat.update({ where: { id: seatId }, data: { status: 'AVAILABLE' } });
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
