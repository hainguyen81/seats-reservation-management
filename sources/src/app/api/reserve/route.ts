import { NextResponse } from 'next/server';
import { seatService } from '@/lib/service.seat';
import { withGlobalErrorHandler } from '@/lib/apiWrapper';

export const POST = withGlobalErrorHandler(async (req: Request, session) => {
    // reserve seat as `BOOKED`
    const response = await seatService.reserve(session, req);
    return NextResponse.json(response, { status: response?.status || 500 });
});
