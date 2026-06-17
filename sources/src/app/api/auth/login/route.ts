import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createTokensSession } from '@/lib/auth'; // 💡 Gọi hàm sinh 2 token mới
import { hashPassword, comparePassword } from '@/lib/hash'; // Hàm mã hóa Bcrypt

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

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
                    password: hashPassword(cleanPassword), // hash password
                },
            });
        } else {
            // 💡 check by password
            const isPasswordValid = comparePassword(cleanPassword, user.password);
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
