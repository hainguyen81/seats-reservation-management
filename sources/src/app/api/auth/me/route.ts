import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
    // check session
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ loggedIn: false }, { status: 401 });
    }

    // check user from database
    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, username: true },
    });

    // not found user
    if (!user) return NextResponse.json({ loggedIn: false }, { status: 404 });
    return NextResponse.json({ loggedIn: true, user });
}
