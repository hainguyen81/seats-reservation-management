import { NextResponse } from 'next/server';
import { seatService } from '@/lib/service.seat';
import { withGlobalErrorHandler } from '@/lib/apiWrapper';

// API
export const GET = withGlobalErrorHandler(async (req, session) => {
    const response = await seatService.fetch(session);
    return NextResponse.json(response, { status: response?.status || 500 });
}, false);
