import { NextResponse } from 'next/server';
import { seatService } from '@/lib/service.seat';
import { withGlobalErrorHandler } from '@/lib/apiWrapper';

// API
export const POST = withGlobalErrorHandler(async (req: Request, session) => {
    // hold seat as `PENDING`
    const response = await seatService.hold(session, req);
    return NextResponse.json(response, { status: response?.status || 500 });
});
