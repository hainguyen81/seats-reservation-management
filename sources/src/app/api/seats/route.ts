import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        let seats = await prisma.seat.findMany({
            orderBy: { number: 'asc' },
        });

        // if no seat, initial sample 3 seats
        if (seats.length === 0) {
            await prisma.seat.createMany({
                data: [
                    { id: 'seat-1', number: 'A1', status: 'AVAILABLE' },
                    { id: 'seat-2', number: 'A2', status: 'AVAILABLE' },
                    { id: 'seat-3', number: 'A3', status: 'AVAILABLE' },
                ],
            });
            seats = await prisma.seat.findMany({ orderBy: { number: 'asc' } });
        }

        return NextResponse.json(seats);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
