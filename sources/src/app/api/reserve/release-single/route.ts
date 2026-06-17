import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { seatId } = await req.json();

    try {
        await prisma.$transaction([
            prisma.seat.update({
                where: { id: seatId },
                data: { status: 'AVAILABLE' },
            }),
            prisma.booking.deleteMany({
                where: { seatId: seatId, userId: session.userId, status: 'PENDING' },
            }),
        ]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
