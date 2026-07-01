// Enforce Next.js Server to treat this controller as an uncacheable, purely runtime dynamic route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withGlobalErrorHandler } from '@/lib/apiWrapper';
import { userService } from '@/lib/service.user';

// API
export const POST = withGlobalErrorHandler(async (req: Request) => {
    const response = await userService.unAuth(req);
    return NextResponse.json(response, { status: response?.status || 500 });
}, false);
