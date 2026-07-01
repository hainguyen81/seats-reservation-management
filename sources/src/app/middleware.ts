// sources/middleware.ts
import { withGlobalErrorHandler } from '@/lib/apiWrapper';
import { handleRateLimit } from '@/lib/rate-limiter';
import { NextResponse } from 'next/server';

// =========================================================================
// 🎛️ PIPELINE ORCHESTRATION LAYER: EXECUTE PLUGINS IN SEQUENTIAL ORDER
// =========================================================================
export const middleware = withGlobalErrorHandler(async (req) => {
    // handle rate limit
    const rateLimitResult = await handleRateLimit(req);
    if (!rateLimitResult || (rateLimitResult?.status === 200)) {
        // ok, go next
        return NextResponse.next();
    }

    // prevent exceeding requests limit
    return NextResponse.json(rateLimitResult, { status: rateLimitResult?.status || 409 });
}, false);

/**
 * 🔒 ROUTING MATCHER CONFIGURATION
 * Configure Next.js to load Middleware.
 * Next.js Engine only activate Middleware when request matched patterns
 */
export const config = {
    // Only scan `/api`
    // Save 100% CPU for server, because it ignored static assets, css, js requests
    matcher: [
        "/api/:path*"
    ],
};
