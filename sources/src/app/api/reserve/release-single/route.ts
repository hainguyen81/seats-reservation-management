import { NextResponse } from 'next/server';
import { seatService } from '@/lib/service.seat';
import { withGlobalErrorHandler } from '@/lib/apiWrapper';

/**
 * Passive Release Expired Booking
 */

export const POST = withGlobalErrorHandler(async (req: Request, session) => {
    // release seat as `AVAILABLE`
    const response = await seatService.singleRelease(session, req);
    return NextResponse.json(response, { status: response?.status || 500 });
});
