import { NextResponse } from 'next/server';
import { verifyAccessToken } from './auth';

type ApiHandler = (req: Request, session: {
    userId: string;
} | {
    userId: string;
    email: any;
} | any, ...args: any[]) => Promise<NextResponse | Response | any>;

export function withGlobalErrorHandler(handler: ApiHandler, authenticated: boolean = true) {
    return async (req: Request, ...args: any[]) => {
        const session = await verifyAccessToken();
        if (authenticated && !session) {
            return NextResponse.json({ error: 'Unauthorized - Access Token Expired' }, { status: 401 });
        }

        try {
            // Execute the encapsulated route controller logic cleanly
            return await handler(req, session, ...args);
        } catch (error: any) {
            console.error(`🚨 [Global API Route Exception Captured]:`, error.message);

            // Handle typical Node.js streams or parsing anomalies gracefully
            if (error instanceof SyntaxError && error.message.includes('JSON')) {
                return NextResponse.json(
                    { error: 'Malformed JSON payload: Unexpected end of stream or input structure.' },
                    { status: 400 }
                );
            }

            // Handle framework database query exceptions (e.g., Prisma anomalies)
            if (error.code && error.code.startsWith('P')) {
                return NextResponse.json(
                    { error: `Database Transaction Failure [${error.code}]: Concurrency violation.` },
                    { status: 409 }
                );
            }

            // Final automated global fallback gatekeeper response
            return NextResponse.json(
                {
                    error: 'Internal Server Error Pipeline Collapse',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                },
                { status: 500 }
            );
        }
    };
}
