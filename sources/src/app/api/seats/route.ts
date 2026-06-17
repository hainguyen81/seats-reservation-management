import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const now = new Date();

        // 💡 Passive Release: fetch all `EXPIRED` seats
        const expiredBookings = await prisma.booking.findMany({
            where: { status: 'PENDING', expiresAt: { lt: now } },
            select: { id: true, seatId: true }
        });

        if (expiredBookings.length > 0) {
            await prisma.$transaction([
                prisma.booking.updateMany({
                    where: { id: { in: expiredBookings.map(b => b.id) } },
                    data: { status: 'FAILED' }
                }),
                prisma.seat.updateMany({
                    where: { id: { in: expiredBookings.map(b => b.seatId) } },
                    data: { status: 'AVAILABLE' }
                })
            ]);
        }

        // return all seats for showing
        let seats = await prisma.seat.findMany({
            orderBy: { number: 'asc' },
        });

        return NextResponse.json(seats);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
