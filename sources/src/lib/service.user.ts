import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { prisma } from "./db";
import { createTokensSession, deleteTokensSession, verifyAccessToken } from "./auth";
import { comparePassword, hashPassword } from "./hash";

const AUTH_PROVIDER = process.env.AUTH_PROVIDER || 'custom';

// Define global registry to maintain singleton state across Next.js Hot-Reloads
const globalForThis = global as unknown as {
    userService: UserService | undefined;
};

export class UserService {

    public async auth(req: Request): Promise<{
        status: number;
        success?: boolean;
        user?: {
            id: string;
            username: string;
            password?: string;
        }
    } | {
        status: number;
        stack?: any;
        error?: string;
    }> {
        try {
            let authData = await req.json();
            let cleanPassword = '';
            const provider = AUTH_PROVIDER;
            // hash password
            if (provider !== 'firebase') {
                cleanPassword = (authData['password'] || '').trim();
                authData['hashedPassword'] = await hashPassword(cleanPassword);
                authData['password'] = cleanPassword;
            }

            // authenticate
            const result: any = await prisma.$transaction(async (tx) => this.authTransaction(tx, provider, authData));

            // check password matching if login, not registering new user
            if (provider !== 'firebase' && result?.success) {
                // not registering new user
                if (result?.status === 200) {
                    const isMatchedPassword = await comparePassword(cleanPassword, result?.user?.password);
                    if (!isMatchedPassword) {
                        return { error: '🚫 Invalid credentials. Please verify your password and try again.', status: 401 };
                    }
                }

                // 💡 Generate DUAL-TOKEN: Access Token + Refresh Token
                await createTokensSession(result?.user?.id);
                result.user && result.user.password && delete result.user.password;
            }
            return result;
        } catch (error: any) {
            return { error: error.message, status: 500, stack: error };
        }
    }

    private async authTransaction(
        tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
        authProvider: string, authData: any
    ): Promise<{
        status: number;
        success?: boolean;
        user?: {
            id: string;
            username: string;
            password?: string;
        }
    } | {
        status: number;
        stack?: any;
        error?: string;
    }> {
        // 🕵️ OCC LAYER: Loop via every seat to check lock by version
        // firebase
        if (authProvider === 'firebase') {
            const { idToken, username } = authData;
            if (!idToken) return { error: '🛡️ Identity token is missing', status: 400 };

            // handle DB
            let user = await tx.user.findUnique({ where: { username } });
            let status: number = 200;
            if (!user) {
                user = await tx.user.create({
                    data: { username, password: 'EXTERNAL_FIREBASE_AUTH' }
                });
                status = 201;
            }

            await createTokensSession(idToken); // process idToken by Firebase Admin
            return { success: true, status: status, user: { id: user.id, username: user.username } };
        }

        // custom
        const { username, password, hashedPassword } = authData;

        // 🕵️ Validate
        if (!username || !password || !hashedPassword) {
            return { error: '⚠️ Both username and password fields are strictly required.', status: 400 };
        }

        const cleanUsername = username.trim();
        const cleanHashedPassword = (hashedPassword || '').trim();

        // check from database (Postgres / SQLite)
        let user = await tx.user.findUnique({
            where: { username: cleanUsername },
        });
        let status: number = 200;

        // 💡 FIXME Auto creating user if not found, should removing on PROD
        if (!user) {
            user = await tx.user.create({
                data: {
                    username: cleanUsername,
                    password: cleanHashedPassword, // hash password
                },
            });
            status = 201;
        }

        // Response to front-end
        return {
            success: true,
            status: status,
            user: {
                id: user.id,
                username: user.username,
                password: user.password
            },
        };
    }

    public async unAuth(req: Request): Promise<{
        status: number;
        success?: boolean;
        message?: string;
    } | {
        status: number;
        stack?: any;
        error?: string;
    }> {
    try {
        // 1. check user via Access Token
        const session = await verifyAccessToken();

        if (session && session.userId) {
            // 💡 clear session + tokens
            await deleteTokensSession(session.userId);
        } else {
            // if Access Token expired, we use server root rights to force clear
            const cookieStore = require('next/headers').cookies();
            const { ACCESS_COOKIE, REFRESH_COOKIE } = require('@/lib/auth');

            const store = await cookieStore;
            store.delete(ACCESS_COOKIE);
            store.delete(REFRESH_COOKIE);
        }

        return {
            status: 200,
            success: true,
            message: '🎉 Session successfully revoked and cookies cleared.'
        };
    } catch (error: any) {
        return { error: error.message, status: 500, stack: error };
    }
}
}

// Enforce Singleton layout compliance
if (!globalForThis.userService) {
    globalForThis.userService = new UserService();
}

// export module
export const userService = globalForThis.userService;