import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { seatService } from '@/lib/service.seat';

export async function GET() {
    const session = await verifyAccessToken();
    return NextResponse.json(seatService.fetch(session));
}
