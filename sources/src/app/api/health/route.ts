// Enforce Next.js Server to treat this controller as an uncacheable, purely runtime dynamic route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

// API
export async function GET() {
    return NextResponse.json({ status: 'UP', timestamp: new Date().toISOString() }, { status: 200 });
}