import { NextResponse } from 'next/server';
import { withGlobalErrorHandler } from '@/lib/apiWrapper';
import { userService } from '@/lib/service.user';

export const POST = withGlobalErrorHandler(async (req: Request) => {
    const response = await userService.auth(req);
    return NextResponse.json(response, { status: response?.status || 500 });
}, false);
