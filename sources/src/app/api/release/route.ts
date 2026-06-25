import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { verifyAccessToken } from '@/lib/auth';
import { seatService } from '@/lib/service.seat';

/**
 * Background Sweeper for releasing EXPIRED seats
 */

export async function POST(req: Request) {
    const session = await verifyAccessToken();
    return NextResponse.json(seatService.release(session, req));
}
