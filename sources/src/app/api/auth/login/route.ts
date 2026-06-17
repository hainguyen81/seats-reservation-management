import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

        // if not PROD, create user if not found
        let user = await prisma.user.findUnique({
            where: { username: username.trim() },
        });
        if (!user && process.env.NODE_ENV !== 'production') {
            user = await prisma.user.create({
                data: { username, password } // need to hash password
            });
        }

        // check password match if valid user
        if (user && user.password !== password) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // create token
        await createSession(user.id);

        // response valid user info
        return NextResponse.json({
            success: true,
            user: { id: user.id, username: user.username },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
