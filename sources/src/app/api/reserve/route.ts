import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';
import { auditLog } from '@/lib/audit';
import { Prisma } from '@prisma/client';
import { redis } from '@/lib/redis';

const SEATS_CACHE_KEY = 'seat_matrix_layout';

export async function POST(req: Request) {
    const session = await verifyAccessToken();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized - Access Token Expired' }, { status: 401 });
    }

    const { seatIds, mockPaymentSuccess } = await req.json();
    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
        return NextResponse.json({ error: 'Invalid or empty seat list' }, { status: 400 });
    }

    try {
        // sequential (ACID Transaction) to prevent Race Condition
        const now = new Date();
        const cleanSeatIds = seatIds.map(id => String(id).trim());
        const result = await prisma.$transaction(async (tx) => {
            // 🕵️ OCC LAYER: Loop via every seat to check lock by version
            for (const seatId of cleanSeatIds) {
                // check seat existing
                const seat = await tx.seat.findUnique({ where: { id: seatId } });
                if (!seat) throw new Error(`Seat ${seatId} does not exist.`);

                // check booking existing
                const booking = await tx.booking.findFirst({
                    where: {
                        seatId: seatId,
                        userId: session.userId,
                        status: 'PENDING',
                        expiresAt: { gte: now },
                    },
                });
                if (!booking) {
                    throw new Error(`Hold expired or invalid for seat ${seat.number}.`);
                }

                // 3. Mock Payment with version
                if (mockPaymentSuccess) {
                    await tx.seat.update({
                        where: { id: seatId, version: seat.version },
                        data: { status: 'BOOKED', version: seat.version + 1 },
                    });
                } else {
                    await tx.seat.update({
                        where: { id: seatId, version: seat.version },
                        data: { status: 'AVAILABLE', version: seat.version + 1 },
                    });
                }
            }

            // update all booking
            await tx.booking.updateMany({
                where: { seatId: { in: cleanSeatIds }, userId: session.userId, status: 'PENDING' },
                data: { status: mockPaymentSuccess ? 'COMPLETED' : 'FAILED' },
            });
        });

        // cache invalidation
        try {
            await redis.del(SEATS_CACHE_KEY);
        } catch(e) {
            console.error('📊 [Cache Miss - Redis Down]: [ RESERVE ] Could not clear seats cache', e);
        }

        // audit
        await auditLog({
            userId: session.userId,
            action: mockPaymentSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
            target: seatIds.join(', '),
            status: 'SUCCESS',
            details: { mockPaymentSuccess },
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
                target: seatIds.join(', '),
                status: 'FAILED',
                details: { error: "[ P2025 ] Concurrency Conflict: One of your selected seats was mutated by a system process. Transaction rolled back." },
                req
            });
            return NextResponse.json({ error: 'Concurrency Conflict: One of your selected seats was mutated by a system process. Transaction rolled back.' }, { status: 409 });
        }

        // audit
        await auditLog({
            userId: session.userId,
            action: mockPaymentSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
            target: seatIds.join(', '),
            status: 'FAILED',
            details: { error: error.message },
            req
        });
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
