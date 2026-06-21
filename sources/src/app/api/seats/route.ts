import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';

const REDIS_TTL = process.env.REDIS_TTL;
const REDIS_TTL_SECONDS = REDIS_TTL ? parseInt(REDIS_TTL, 10) : 3;
const SEATS_CACHE_KEY = 'seat_matrix_layout';
const SEATS_CACHE_TTL = REDIS_TTL_SECONDS; // 💡 expired in 3 seconds

export async function GET() {
    try {
        // 🕵️ CACHE READ: check from Redis Cache
        try {
            const cachedSeats = await redis.get(SEATS_CACHE_KEY);
            if (cachedSeats) {
                return NextResponse.json(JSON.parse(cachedSeats));
            }
        } catch (err) {
            console.error('📊 [Cache Miss - Redis Down]: Fetching directly from database', err);
        }

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

        // fetch all seats from DB
        const freshSeats = await prisma.seat.findMany({
            orderBy: { number: 'asc' },
        });

        // 💡 CACHE WRITE: cache AVAILABLE seats expired in 3 seconds
        try {
            await redis.setex(SEATS_CACHE_KEY, SEATS_CACHE_TTL, JSON.stringify(freshSeats));
        } catch (err) {
            console.error('📊 [Cache Miss - Redis Down]: Could not cache the fetched `AVAILABLE` seats', err);
        }

        return NextResponse.json(freshSeats);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
