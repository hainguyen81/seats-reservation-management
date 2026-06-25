import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { seatService } from '@/lib/service.seat';

export async function GET() {
    try {
        const session = await verifyAccessToken();
        const response = await seatService.fetch(session);
        return NextResponse.json(response, { status: response?.status || 500 });
    } catch(e) {
        return NextResponse.json({ error: e }, { status: 500 });
    }
}
