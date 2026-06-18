import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';
import { auditLog } from '@/lib/audit';
import { Prisma } from '@prisma/client';
import { redis } from '@/lib/redis';

const RESERVE_EXPIRY = process.env.RESERVE_EXPIRY;
const RESERVE_EXPIRY_MINUTES = RESERVE_EXPIRY ? parseInt(RESERVE_EXPIRY, 10) : 1;
const SEATS_CACHE_KEY = 'seat_matrix_layout';

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

            // 💡 SOLUTION Optimistic Concurrency Control OCC (COMPARE-AND-SWAP):
            // Lock seat with status PENDING
            await tx.seat.update({
                where: {
                    id: String(seatId),
                    version: seat.version
                },
                data: {
                    status: 'PENDING',
                    version: seat.version + 1
                },
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

        // cache invalidation
        try {
            await redis.del(SEATS_CACHE_KEY);
        } catch (e) {
            console.error('📊 [Cache Miss - Redis Down]: [ HOLD ] Could not clear seats cache', e);
        }

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
        // 💡 CACHE CONCURRENCY VIOLATION:
        // if error is P2025, it means WHERE (id + old version) didn't exist;
        // because other Pod/Request already changed version.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            // audit
            await auditLog({
                userId: session.userId,
                action: 'HOLD',
                target: seatId.join(', '),
                status: 'FAILED',
                details: { error: "[ P2025 ] Race condition detected: This seat was captured by another user at the same millisecond!" },
                req
            });
            return NextResponse.json({ error: '[ P2025 ] Race condition detected: This seat was captured by another user at the same millisecond!' }, { status: 409 });
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
