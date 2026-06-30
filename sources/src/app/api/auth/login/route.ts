import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createTokensSession } from '@/lib/auth';
import { hashPassword, comparePassword } from '@/lib/hash';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const provider = process.env.AUTH_PROVIDER || 'custom';

        // firebase
        if (provider === 'firebase') {
            const { idToken, username } = body;
            if (!idToken) return NextResponse.json({ error: 'Identity token is missing' }, { status: 400 });

            // handle DB
            let user = await prisma.user.findUnique({ where: { username } });
            if (!user) {
                user = await prisma.user.create({
                    data: { username, password: 'EXTERNAL_FIREBASE_AUTH' }
                });
            }

            await createTokensSession(idToken); // process idToken by Firebase Admin
            return NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
        }

        // custom
        const { username, password } = body;

        // 🕵️ Validate
        if (!username || !password) {
            return NextResponse.json(
                { error: 'Both username and password fields are strictly required.' },
                { status: 400 }
            );
        }

        const cleanUsername = username.trim();
        const cleanPassword = password.trim();

        // check from database (Postgres / SQLite)
        let user = await prisma.user.findUnique({
            where: { username: cleanUsername },
        });

        // 💡 FIXME Auto creating user if not found, should removing on PROD
        if (!user) {
            user = await prisma.user.create({
                data: {
                    username: cleanUsername,
                    password: await hashPassword(cleanPassword), // hash password
                },
            });
        } else {
            // 💡 check by password
            const isPasswordValid = await comparePassword(cleanPassword, user.password);
            if (!isPasswordValid) {
                return NextResponse.json(
                    { error: 'Invalid credentials. Please verify your password and try again.' },
                    { status: 401 }
                );
            }
        }

        // 💡 Generate DUAL-TOKEN: Access Token + Refresh Token
        await createTokensSession(user.id);

        // Response to front-end
        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
