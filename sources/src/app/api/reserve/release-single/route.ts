/**
 * -------------------------------------------------
 * 🔥 Export mode outputs a static site without a runtime server.
 * Features that require the Next.js runtime are not supported,
 * because this mode produces a static site, and no runtime server.
 * -------------------------------------------------
 */
export const dynamic = 'force-static';

import { NextResponse } from 'next/server';
import { seatService } from '@/lib/service.seat';
import { withGlobalErrorHandler } from '@/lib/apiWrapper';

/**
 * API: Passive Release Expired Booking
 */

export const POST = withGlobalErrorHandler(async (req: Request, session) => {
    // release seat as `AVAILABLE`
    const response = await seatService.singleRelease(session, req);
    return NextResponse.json(response, { status: response?.status || 500 });
});
