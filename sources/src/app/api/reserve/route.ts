import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { seatService } from '@/lib/service.seat';

export async function POST(req: Request) {
    const session = await verifyAccessToken();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized - Access Token Expired' }, { status: 401 });
    }

    // reserve seat as `BOOKED`
    const response = await seatService.reserve(session, req);
    return NextResponse.json(response);
}
