import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { redis, redisBreaker } from "./redis";
import { seatMutexLock } from "./seat.mutexLock";
import { auditLog } from "./audit";
import { prisma } from "./db";

// Define global registry to maintain singleton state across Next.js Hot-Reloads
const globalForThis = global as unknown as {
    seatService: SeatService | undefined;
};

const RESERVE_EXPIRY = process.env.RESERVE_EXPIRY;
const RESERVE_EXPIRY_MINUTES = RESERVE_EXPIRY ? parseInt(RESERVE_EXPIRY, 10) : 1;
const REDIS_TTL = process.env.REDIS_TTL;
const REDIS_TTL_SECONDS = REDIS_TTL ? parseInt(REDIS_TTL, 10) : 3;
const SEATS_CACHE_TTL = REDIS_TTL_SECONDS; // 💡 expired in 3 seconds
const MUTEX_GROUP_KEY = 'default';
const SEATS_CACHE_KEY = 'seat_matrix_layout';

export class SeatService {

    private async lockSeatMutex(seatId: string, lockStatus: string) {
        let isLockedInRam = false;
        const errorConflictCode = 'CONFLICT_SEAT_LOCKED_IN_RAM';
        const mutexLockInRamFn: Function = (): boolean => seatMutexLock.lock(MUTEX_GROUP_KEY, seatId, lockStatus, 10000);
        try {
            const ramLockAcquired = await redisBreaker.execute(async () => {
                return mutexLockInRamFn(); // lock seat as example `PENDING` in 10 seconds
            });
            if (!ramLockAcquired) {
                // if RAM already locked (`PENDING`) before, fail-fast
                throw new Error(errorConflictCode);
            }
            isLockedInRam = true;
        } catch (breakerError: any) {
            // if Circuit Breaker is OPEN (Redis broken), or seat was kept in RAM
            if (breakerError.message === errorConflictCode || !isLockedInRam) {
                return {
                    error: `[ MUTEX ${lockStatus} ] Race condition '${errorConflictCode}' mitigated: 
                            This seat is concurrently locked at host memory tier!`,
                    status: 409
                };
            }

            // ⚡ Fallback Bypass: 
            // if breakerError, it means Redis was down, or Timeout.
            // So force calling RAM mutex directly, bypass Redis!
            console.warn(`[CIRCUIT BREAKER OPENED / REDIS DEAD] Initiating emergency local execution loop. Reason: ${breakerError.message}`);
            // Force calling mutex in Pod's RAM
            const emergencyLockAcquired = mutexLockInRamFn();
            if (!emergencyLockAcquired) {
                // still be error
                return {
                    error: `[ MUTEX ${lockStatus} ] Fallback Gatekeeper: Seat is locked on this runtime container pod node!`,
                    status: 409
                };
            }

            // locked seat in RAM successful
            isLockedInRam = true;
            console.log(`[ RESILIENCE MUTEX SUCCESS ${lockStatus} ] Seat ${seatId} successfully secured under degraded in-memory local state layout!`);
        }
        return null;
    }

    private async updateLockSeatMutex(seatId: string, oldLockStatus: string, newLockStatus: string) {
        let isLockedInRam = false;
        const errorConflictCode = 'INVALID_SEAT_STATE_FOR_RESERVATION';
        const mutexUpdateLockInRamFn: Function = (): boolean => seatMutexLock.updateLock(MUTEX_GROUP_KEY, seatId, oldLockStatus, newLockStatus);
        try {
            const ramLockAcquired = await redisBreaker.execute(async () => {
                return mutexUpdateLockInRamFn(); // update lock seat as example `PENDING` --> `BOOKED` in 10 seconds
            });
            if (!ramLockAcquired) {
                // if RAM already wasn't locked (`PENDING`) before, fail-fast
                throw new Error(errorConflictCode);
            }
            isLockedInRam = true;
        } catch (breakerError: any) {
            // if Circuit Breaker is OPEN (Redis broken), or seat was kept in RAM
            if (breakerError.message === errorConflictCode || !isLockedInRam) {
                return {
                    error: `[ MUTEX | OLD: ${oldLockStatus} | NEW: ${newLockStatus} ] Invalid operation '${errorConflictCode}': This seat cannot be reserved because it is not currently held by any session!`,
                    status: 400
                };
            }

            // ⚡ Fallback Bypass: 
            // if breakerError, it means Redis was down, or Timeout.
            // So force calling RAM mutex directly, bypass Redis!
            console.warn(`[CIRCUIT BREAKER OPENED] Redis dead on Reserve. Forcing direct local emergency memory check. Reason: ${breakerError.message}`);
            // Force calling mutex in Pod's RAM
            const emergencyLockAcquired = mutexUpdateLockInRamFn();
            if (!emergencyLockAcquired) {
                // still be error
                return {
                    error: `[ MUTEX | OLD: ${oldLockStatus} | NEW: ${newLockStatus} ] Fallback Gatekeeper: Seat is locked on this runtime container pod node!`,
                    status: 400
                };
            }

            // locked seat in RAM successful
            isLockedInRam = true;
            console.log(`[ RESILIENCE MUTEX SUCCESS | OLD: ${oldLockStatus} | NEW: ${newLockStatus} ] Seat ${seatId} successfully secured under degraded in-memory local state layout!`);
        }
        return null;
    }

    // -------------------------------------------------
    // FETCH SEATS
    // -------------------------------------------------
    public async fetch(session?: {
        userId: string;
    } | {
        userId: string;
        email: any;
    }): Promise<{
        data?: any;
        status?: number;
    } | {
        error?: string;
        status?: number;
    }> {
        try {
            // 🕵️ CACHE READ: check from Redis Cache
            try {
                const cachedSeats = await redis.get(SEATS_CACHE_KEY);
                if (cachedSeats) {
                    return JSON.parse(cachedSeats);
                }
            } catch (err) {
                console.warn(`📊 [Cache Miss - Redis Down | User: ${session?.userId}]: Fetching directly from database`);
            }

            // fecth seats from DB
            const freshSeats = await this.fetchTransaction();

            // 💡 CACHE WRITE: cache AVAILABLE seats expired in 3 seconds
            try {
                await redis.setex(SEATS_CACHE_KEY, SEATS_CACHE_TTL, JSON.stringify(freshSeats));
            } catch (err) {
                console.warn(`📊 [Cache Miss - Redis Down | User: ${session?.userId}]: Could not cache the fetched 'AVAILABLE' seats`);
            }

            return { data: freshSeats, status: 200 };
        } catch (error: any) {
            return { error: error.message, status: 500 };
        }
    }

    private async fetchTransaction() {
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
        return await prisma.seat.findMany({
            orderBy: { number: 'asc' },
        });
    }

    // -------------------------------------------------
    // HOLD
    // -------------------------------------------------
    public async hold(
        session: {
            userId: string;
        } | {
            userId: string;
            email: any;
        },
        req: Request
    ): Promise<{
        success?: boolean;
        expiresAt?: string;
        status?: number;
    } | {
        error?: string;
        status?: number;
    }> {
        const { seatId } = await req.json();
        const mutexLockStatus = 'PENDING';
        let mutexLockError;
        try {
            // =========================================================================
            // STEP 1: MUTEX LOCK IN RAM VIA CIRCUIT BREAKER
            // =========================================================================
            mutexLockError = await this.lockSeatMutex(seatId, mutexLockStatus);
            if (mutexLockError && (mutexLockError?.error || '').length) {
                await auditLog({
                    userId: session.userId,
                    action: 'HOLD',
                    target: seatId,
                    status: 'FAILED',
                    details: { error: mutexLockError.error },
                    req
                });
                return mutexLockError;
            }

            // =========================================================================
            // STEP 2: TRANSACTION VIA OCC
            // =========================================================================
            const result = await prisma.$transaction(async (tx) => seatService.holdTransaction(tx, seatId, session));

            // cache invalidation
            try {
                await redis.del(SEATS_CACHE_KEY);
            } catch (e) {
                console.warn('📊 [Cache Miss - Redis Down]: [ HOLD ] Could not clear seats cache');
            }

            // audit
            await auditLog({
                userId: session.userId,
                action: 'HOLD',
                target: seatId,
                status: 'SUCCESS',
                req
            });
            return { success: true, expiresAt: result.expiresAt.toISOString(), status: 200 };
        } catch (error: any) {
            // 💡 CACHE CONCURRENCY VIOLATION:
            // if error is P2025, it means WHERE (id + old version) didn't exist;
            // because other Pod/Request already changed version.
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                // audit
                await auditLog({
                    userId: session.userId,
                    action: 'HOLD',
                    target: seatId,
                    status: 'FAILED',
                    details: { error: "[ P2025 ] Race condition detected: This seat was captured by another user at the same millisecond!" },
                    req
                });
                return {
                    error: '[ P2025 ] Race condition detected: This seat was captured by another user at the same millisecond!',
                    status: 409
                };
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
            return { error: error.message, status: 500 };
        } finally {
            // unlock mutex in RAM
            if (!mutexLockError || !(mutexLockError?.error || '').length) {
                seatMutexLock.unlock(MUTEX_GROUP_KEY, seatId, mutexLockStatus);
            }
        }
    }

    private async holdTransaction(
        tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
        seatId: string,
        session: {
            userId: string;
        } | {
            userId: string;
            email: any;
        }
    ) {
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
        return tx.booking.create({
            data: {
                userId: session.userId,
                seatId: seatId,
                status: 'PENDING',
                expiresAt: new Date(Date.now() + RESERVE_EXPIRY_MINUTES * 60 * 1000), // expired in 5 minutes
            },
        });
    }

    // -------------------------------------------------
    // SINGLE RELEASE
    // -------------------------------------------------
    public async singleRelease(
        session: {
            userId: string;
        } | {
            userId: string;
            email: any;
        },
        req: Request
    ): Promise<{
        success?: boolean;
        expiresAt?: string;
        status?: number;
    } | {
        error?: string;
        status?: number;
    }> {
        const { seatId } = await req.json();
        const mutexLockStatus = 'PENDING';

        // =========================================================================
        // STEP 1: MUTEX LOCK IN RAM VIA CIRCUIT BREAKER
        // =========================================================================
        seatMutexLock.unlock(MUTEX_GROUP_KEY, seatId, mutexLockStatus);

        // =========================================================================
        // STEP 2: TRANSACTION VIA OCC
        // =========================================================================
        try {
            // OCC
            await prisma.$transaction(async (tx) => this.singleReleaseTransaction(tx, seatId, session));

            // audit
            await auditLog({
                userId: session.userId,
                action: 'SINGLE_RELEASE',
                target: seatId,
                status: 'SUCCESS',
                req
            });
            return { success: true, status: 200 };
        } catch (error: any) {
            // 💡 CACHE CONCURRENCY VIOLATION:
            // if error is P2025, it means WHERE (id + old version) didn't exist;
            // because other Pod/Request already changed version.
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                // audit
                await auditLog({
                    userId: session.userId,
                    action: 'SINGLE_RELEASE',
                    target: seatId,
                    status: 'FAILED',
                    details: { error: "[ P2025 ] Conflict: This seat state was modified. Refreshing dashboard." },
                    req
                });
                return {
                    error: '[ P2025 ] Conflict: This seat state was modified. Refreshing dashboard.',
                    status: 409
                };
            }

            // audit
            await auditLog({
                userId: session.userId,
                action: 'SINGLE_RELEASE',
                target: seatId,
                status: 'FAILED',
                details: { error: error.message },
                req
            });
            return { error: error.message, status: 500 };
        }
    }

    private async singleReleaseTransaction(
        tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
        seatId: string,
        session: {
            userId: string;
        } | {
            userId: string;
            email: any;
        }
    ) {
        // check seat existing
        const seat = await tx.seat.findUnique({ where: { id: seatId } });
        if (!seat) throw new Error('Seat not found.');

        // check booking
        const booking = await tx.booking.findFirst({
            where: { seatId: seatId, userId: session.userId, status: 'PENDING' },
        });
        if (!booking) throw new Error('No active reservation found under your account.');

        // 💡 SOLUTION Optimistic Concurrency Control OCC: Reset `AVAILABLE` seat
        await tx.seat.update({
            where: { id: seatId, version: seat.version },
            data: { status: 'AVAILABLE', version: seat.version + 1 },
        });

        // delete temporary booking
        await tx.booking.delete({ where: { id: booking.id } });
    }

    // -------------------------------------------------
    // RESERVE (`BOOKED`)
    // -------------------------------------------------
    public async reserve(
        session: {
            userId: string;
        } | {
            userId: string;
            email: any;
        },
        req: Request
    ): Promise<{
        success?: boolean;
        expiresAt?: string;
        status?: number;
    } | {
        error?: string;
        status?: number;
    }> {
        const { seatIds, mockPaymentSuccess } = await req.json();
        const mutexLockPendingStatus = 'PENDING';
        const mutexLockBookedStatus = 'BOOKED';
        let mutexLockError: any[];
        if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
            return { error: 'Invalid or empty seat list', status: 400 };
        }

        try {
            // =========================================================================
            // STEP 1: MUTEX LOCK IN RAM VIA CIRCUIT BREAKER
            // =========================================================================
            const updateMutexPromises: Promise<any>[] = [...seatIds]
                .map((v) => this.updateLockSeatMutex(v, mutexLockPendingStatus, mutexLockBookedStatus));
            const mutexLockResults = await Promise.all(updateMutexPromises);
            mutexLockError = mutexLockResults.filter(res => res && (res?.error || '').length);
            if (mutexLockError && mutexLockError.length) {
                await auditLog({
                    userId: session.userId,
                    action: 'RESERVED',
                    target: seatIds.join(','),
                    status: 'FAILED',
                    details: { error: mutexLockError.map(v => v.error).join(' | ') },
                    req
                });
                return { error: mutexLockError.map(v => v.error).join(' | '), status: 409 };
            }

            // =========================================================================
            // STEP 2: TRANSACTION VIA OCC
            // =========================================================================
            await prisma.$transaction(async (tx) => this.reserveTransaction(tx, seatIds, session, mockPaymentSuccess));

            // cache invalidation
            try {
                await redis.del(SEATS_CACHE_KEY);
            } catch (e) {
                console.error('📊 [Cache Miss - Redis Down]: [ RESERVE ] Could not clear seats cache', e);
            }

            // audit
            await auditLog({
                userId: session.userId,
                action: 'RESERVED',
                target: seatIds.join(', '),
                status: 'SUCCESS',
                details: { 'payment': mockPaymentSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED' },
                req
            });
            await auditLog({
                userId: session.userId,
                action: mockPaymentSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
                target: seatIds.join(', '),
                status: 'SUCCESS',
                details: { mockPaymentSuccess },
                req
            });
            return { success: true, status: 200 };
        } catch (error: any) {
            // =========================================================================
            // 🔥 RESERVE MUTEX RAM (ATOMIC DYNAMIC COMPENSATING TRANSACTION)
            // =========================================================================
            // Due to DB Transaction rollback/went down, must unlock mutex RAM!
            try {
                // Status to reserve mutex RAM:
                // - if error P2025 (conflict version OCC), or payment failed -> `PENDING`
                // - if system went down -> `AVAILABLE` unlock mutex RAM
                const rollbackTargetStatus = (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
                    ? 'PENDING' : 'AVAILABLE';
                console.warn(`[CRITICAL TRANSACTION ROLLBACK] Database execution collapsed. Reverting RAM state of [${seatIds.join(', ')}] back to [${rollbackTargetStatus}]`);

                // unlock mutex RAM
                await Promise.all(
                    [...seatIds].map(async (v) => {
                        if (rollbackTargetStatus === 'AVAILABLE') {
                            // release `PENDING`, `BOOKED`
                            seatMutexLock.forceUnlock(MUTEX_GROUP_KEY, v);
                        } else {
                            // `BOOKED` --> `PENDING`
                            seatMutexLock.updateLock(MUTEX_GROUP_KEY, v, mutexLockBookedStatus, mutexLockPendingStatus);
                        }
                    })
                );
                console.log('✅ RAM State compensation completed successfully. Deadlock prevented!');
            } catch (rollbackRamError) {
                console.error('🚨 [FATAL ARCHITECTURE ERROR] Critical Failure: Could not recover RAM state!', rollbackRamError);
            }

            // 💡 CACHE CONCURRENCY VIOLATION:
            // if error is P2025, it means WHERE (id + old version) didn't exist;
            // because other Pod/Request already changed version.
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                // audit
                await auditLog({
                    userId: session.userId,
                    action: 'RESERVED',
                    target: seatIds.join(', '),
                    status: 'FAILED',
                    details: { 'payment': mockPaymentSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED' },
                    req
                });
                return {
                    error: '[ P2025 ] Conflict: This seat state was modified. Refreshing dashboard.',
                    status: 409
                };
            }

            // audit
            await auditLog({
                userId: session.userId,
                action: 'RESERVED',
                target: seatIds.join(', '),
                status: 'FAILED',
                details: { error: error.message },
                req
            });
            return { error: error.message, status: 500 };
        }
    }

    private async reserveTransaction(
        tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
        seatIds: string[],
        session: {
            userId: string;
        } | {
            userId: string;
            email: any;
        },
        mockPaymentSuccess?: boolean
    ) {
        // 🕵️ OCC LAYER: Loop via every seat to check lock by version
        const now = new Date();
        for (const seatId of seatIds) {
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
            where: { seatId: { in: seatIds }, userId: session.userId, status: 'PENDING' },
            data: { status: mockPaymentSuccess ? 'COMPLETED' : 'FAILED' },
        });
    }

    // -------------------------------------------------
    // RELEASE (`AVAILABLE`)
    // -------------------------------------------------
    public async release(
        session: {
            userId: string;
        } | {
            userId: string;
            email: any;
        },
        req: Request
    ): Promise<{
        success?: boolean;
        releasedCount?: number;
        releasedSeats?: string | string[];
        message?: string;
        status?: number;
    } | {
        error?: string;
        status?: number;
    }> {
        const { seatIds, mockPaymentSuccess } = await req.json();
        const mutexLockPendingStatus = 'PENDING';
        const mutexLockBookedStatus = 'BOOKED';
        if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
            return { error: 'Invalid or empty seat list', status: 400 };
        }

        try {
            // =========================================================================
            // STEP 1: TRANSACTION VIA OCC
            // =========================================================================
            const result = await prisma.$transaction(async (tx) => this.releaseTransaction(tx, session));

            // =========================================================================
            // STEP 2: MUTEX LOCK IN RAM VIA CIRCUIT BREAKER
            // =========================================================================
            if (result.count > 0) {
                try {
                    // unlock all DB released seats to unlock mutex in RAM
                    await Promise.all(
                        result.seatIds.map(async (seatId) => seatMutexLock.forceUnlock(MUTEX_GROUP_KEY, seatId))
                    );

                    // delete redis cache to re-update from DB
                    await redis.del(SEATS_CACHE_KEY);
                    console.log(`[Sweeper RAM Sync] Successfully evicted ${result.count} expired tokens from runtime memory.`);
                } catch (ramSyncError) {
                    console.error('🚨 [Sweeper Core Error] Could not clear RAM state for expired seats:', ramSyncError);
                }
            }

            // audit
            if (result.count > 0) {
                await auditLog({
                    userId: session?.userId, // 💡 Cron/Worker
                    action: 'RELEASE_EXPIRED',
                    target: `Seats: ${result.seatIds.join(', ')}`,
                    status: 'SUCCESS',
                    details: { releasedCount: result.count, automaticTrigger: true },
                    req
                });
            }

            return {
                success: true,
                releasedCount: result.count,
                releasedSeats: result.seatIds,
                message: `Successfully released ${result.count} expired seat reservations via global sweeper.`,
                status: 200
            };
        } catch (error: any) {
            // audit
            await auditLog({
                userId: null,
                action: 'RELEASE_EXPIRED',
                target: 'All `PENDING` expired seats',
                status: 'FAILED',
                details: { error: error.message },
                req
            });
            return { error: error.message, status: 500 };
        }
    }

    private async releaseTransaction(
        tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
        session: {
            userId: string;
        } | {
            userId: string;
            email: any;
        }
    ) {
        const now = new Date();

        // find EXPIRED Booking PENDING
        const expiredBookings = await tx.booking.findMany({
            where: { status: 'PENDING', expiresAt: { lt: now } },
            select: { id: true, seatId: true },
        });
        if (expiredBookings.length === 0) return { count: 0, seatIds: [] };

        let count = 0;
        let releasedSeats = [];

        // 🕵️ SOLUTION Optimistic Concurrency Control OCC
        for (const booking of expiredBookings) {
            try {
                const seat = await tx.seat.findUnique({ where: { id: booking.seatId } });
                if (seat && seat.status === 'PENDING') {
                    // reset seat
                    await tx.seat.update({
                        where: { id: booking.seatId, version: seat.version },
                        data: { status: 'AVAILABLE', version: seat.version + 1 },
                    });

                    // FAILED booking
                    await tx.booking.update({
                        where: { id: booking.id },
                        data: { status: 'FAILED', userId: session?.userId },
                    });

                    releasedSeats.push(seat.id);
                    count++;
                }
            } catch (err) {
                // if conflict P2025 (by other request booked this seat),
                // ignore and continue other seats because this is background sweeper
                continue;
            }
        }
        return { count: expiredBookings.length, seatIds: releasedSeats };
    }
}

// Enforce Singleton layout compliance
if (!globalForThis.seatService) {
    globalForThis.seatService = new SeatService();
}

// export module
export const seatService = globalForThis.seatService;