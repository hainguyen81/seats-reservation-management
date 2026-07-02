/**
 * -------------------------------------------------
 * 🔥 Export mode outputs a static site without a runtime server.
 * Features that require the Next.js runtime are not supported,
 * because this mode produces a static site, and no runtime server.
 * -------------------------------------------------
 */
export const dynamic = 'force-static';

import { NextResponse } from 'next/server';

// API
export async function GET() {
    return NextResponse.json({ status: 'UP', timestamp: new Date().toISOString() }, { status: 200 });
}