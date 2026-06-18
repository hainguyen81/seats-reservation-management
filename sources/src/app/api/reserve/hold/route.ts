import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';
import { auditLog } from '@/lib/audit';

const RESERVE_EXPIRY = process.env.RESERVE_EXPIRY;
const RESERVE_EXPIRY_MINUTES = RESERVE_EXPIRY ? parseInt(RESERVE_EXPIRY, 10) : 1;

export async function POST(req: Request) {
    const session = await verifyAccessToken();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized - Access Token Expired' }, { status: 401 });
    }

    const { seatId } = await req.json();

    try {
        const expiresAt = new Date(Date.now() + RESERVE_EXPIRY_MINUTES * 60 * 1000); // expired in 5 minutes

        const result = await prisma.$transaction(async (tx) => {
            // validate 1: seat is not BOOKED
            const seat = await tx.seat.findUnique({ where: { id: seatId } });
            if (!seat || seat.status === 'BOOKED') {
                throw new Error('This seat has already been fully booked and sold.');
            }

            // validate 2: seat whether is RESERVED for other
            const activeHoldByOthers = await tx.booking.findFirst({
                where: {
                    seatId: seatId,
                    status: 'PENDING',
                    expiresAt: { gte: new Date() },  // in expired 5 minutes
                    NOT: {
                        userId: session.userId, // not for me
                    },
                },
            });
            if (activeHoldByOthers) {
                throw new Error('This seat is temporarily reserved by another user. Please choose another one.');
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

        // audit
        await auditLog({
            userId: session.userId,
            action: 'HOLD',
            target: seatId.join(', '),
            status: 'SUCCESS',
            req
        });

        return NextResponse.json({ success: true, expiresAt: expiresAt.toISOString() });
    } catch (error: any) {
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
