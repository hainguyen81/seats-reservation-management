import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { verifyAccessToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

/**
 * Passive Release Expired Booking
 */

export async function POST(req: Request) {
    const session = await verifyAccessToken();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized - Access Token Expired' }, { status: 401 });
    }

    const { seatId } = await req.json();
    const targetSeatId = String(seatId).trim();

    try {
        await prisma.$transaction(async (tx) => {
            // check seat existing
            const seat = await tx.seat.findUnique({ where: { id: targetSeatId } });
            if (!seat) throw new Error('Seat not found.');

            // check booking
            const booking = await tx.booking.findFirst({
                where: { seatId: targetSeatId, userId: session.userId, status: 'PENDING' },
            });
            if (!booking) throw new Error('No active reservation found under your account.');

            // 💡 SOLUTION Optimistic Concurrency Control OCC: Reset `AVAILABLE` seat
            await tx.seat.update({
                where: { id: targetSeatId, version: seat.version },
                data: { status: 'AVAILABLE', version: seat.version + 1 },
            });

            // delete temporary booking
            await tx.booking.delete({ where: { id: booking.id } });
        });

        // audit
        await auditLog({
            userId: session.userId,
            action: 'RELEASE',
            target: targetSeatId,
            status: 'SUCCESS',
            req
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        // 💡 CACHE CONCURRENCY VIOLATION:
        // if error is P2025, it means WHERE (id + old version) didn't exist;
        // because other Pod/Request already changed version.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            // audit
            await auditLog({
                userId: session.userId,
                action: 'HOLD',
                target: targetSeatId,
                status: 'FAILED',
                details: { error: "[ P2025 ] Conflict: This seat state was modified. Refreshing dashboard." },
                req
            });
            return NextResponse.json({ error: '[ P2025 ] Conflict: This seat state was modified. Refreshing dashboard.' }, { status: 409 });
        }
        
        // audit
        await auditLog({
            userId: session.userId,
            action: 'HOLD',
            target: seatId.join(', '),
            status: 'FAILED',
            details: { error: error.message },
            req
        });
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
