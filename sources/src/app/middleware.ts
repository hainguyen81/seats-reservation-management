// sources/middleware.ts
import { withGlobalErrorHandler } from '@/lib/apiWrapper';
import { handleRateLimit } from '@/lib/rate-limiter';
import { NextResponse } from 'next/server';

// =========================================================================
// 🎛️ PIPELINE ORCHESTRATION LAYER: EXECUTE PLUGINS IN SEQUENTIAL ORDER
// =========================================================================
export const middleware = withGlobalErrorHandler(async (req) => {
    // Handle preflight OPTIONS requests seamlessly for cross-origin handshakes
    if (req.method === 'OPTIONS') {
        const response = NextResponse.next();

        // 🕵️ ANTI-CORS BOUNDARY LEAK DETECTOR:
        // Allow standard localhost ports used natively by Capacitor WebView (Android/iOS) to fetch data
        response.headers.set('Access-Control-Allow-Origin', 'http://localhost');
        response.headers.set('Access-Control-Allow-Credentials', 'true'); // Require Cookie for authentication
        response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

        // success OPTIONS method
        return new NextResponse(null, { status: 200, headers: response.headers });
    }

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
    // 🎯 THE EXCLUSION MATRIX: Using native Negative Lookahead Regex syntax
    // The '(?!...)' syntax instructs the compiler: "Intercept ALL routes EXCEPT these specific boundaries"
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static production assets files)
         * - _next/image (image optimization metadata pipelines)
         * - favicon.ico (system browser icon requests)
         * - assets (your custom project static media directory)
         * - (/api/health).*
         */
        '/((?!_next/static|_next/image|favicon.ico|assets|api/health).*)',
    ],
};
