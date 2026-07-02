import { NextResponse } from 'next/server';

// API
export async function GET() {
    return NextResponse.json({ status: 'UP', timestamp: new Date().toISOString() }, { status: 200 });
}