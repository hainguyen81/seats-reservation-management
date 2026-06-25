import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { seatService } from '@/lib/service.seat';

export async function POST(req: Request) {
    try {
        const session = await verifyAccessToken();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized - Access Token Expired' }, { status: 401 });
        }

        // hold seat as `PENDING`
        const response = await seatService.hold(session, req);
        return NextResponse.json(response, { status: response?.status || 500 });
    } catch (e) {
        return NextResponse.json({ error: e }, { status: 500 });
    }
}
