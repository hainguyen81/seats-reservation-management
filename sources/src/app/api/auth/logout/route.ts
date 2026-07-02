/**
 * -------------------------------------------------
 * 🔥 Export mode outputs a static site without a runtime server.
 * Features that require the Next.js runtime are not supported,
 * because this mode produces a static site, and no runtime server.
 * -------------------------------------------------
 */
export const dynamic = 'force-static';

import { NextResponse } from 'next/server';
import { withGlobalErrorHandler } from '@/lib/apiWrapper';
import { userService } from '@/lib/service.user';

// API
export const POST = withGlobalErrorHandler(async (req: Request) => {
    const response = await userService.unAuth(req);
    return NextResponse.json(response, { status: response?.status || 500 });
}, false);
