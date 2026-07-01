// Enforce Next.js Server to treat this controller as an uncacheable, purely runtime dynamic route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { seatService } from '@/lib/service.seat';
import { withGlobalErrorHandler } from '@/lib/apiWrapper';

/**
 * API: Background Sweeper for releasing EXPIRED seats
 */

export const POST = withGlobalErrorHandler(async (req: Request, session) => {
    const response = await seatService.release(session, req);
    return NextResponse.json(response, { status: response?.status || 500 });
}, false);
