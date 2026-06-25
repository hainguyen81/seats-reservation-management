import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { seatService } from '@/lib/service.seat';

/**
 * Passive Release Expired Booking
 */

export async function POST(req: Request) {
    const session = await verifyAccessToken();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized - Access Token Expired' }, { status: 401 });
    }

    // release seat as `AVAILABLE`
    const response = await seatService.singleRelease(session, req);
    return NextResponse.json(response, { status: response?.status || 500 });
}
