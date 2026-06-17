import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

const RESERVE_EXPIRY = process.env.RESERVE_EXPIRY;
const RESERVE_EXPIRY_MINUTES = RESERVE_EXPIRY ? parseInt(RESERVE_EXPIRY, 10) : 1;

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { seatId } = await req.json();

    try {
        const expiresAt = new Date(Date.now() + RESERVE_EXPIRY_MINUTES * 60 * 1000); // expired in 5 minutes

        const result = await prisma.$transaction(async (tx) => {
            const seat = await tx.seat.findUnique({ where: { id: seatId } });

            if (!seat || seat.status !== 'AVAILABLE') {
                throw new Error('Seat is no longer available');
            }

            // Lock seat with status PENDING
            await tx.seat.update({
                where: { id: seatId },
                data: { status: 'PENDING' },
            });

            // Create Booking PENDING
            return await tx.booking.create({
                data: {
                    userId: session.userId,
                    seatId: seatId,
                    status: 'PENDING',
                    expiresAt: expiresAt,
                },
            });
        });

        return NextResponse.json({ success: true, expiresAt: expiresAt.toISOString() });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
