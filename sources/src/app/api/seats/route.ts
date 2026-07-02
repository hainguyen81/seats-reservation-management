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

// API
export const GET = withGlobalErrorHandler(async (req, session) => {
    const response = await seatService.fetch(session);
    return NextResponse.json(response, { status: response?.status || 500 });
}, false);
