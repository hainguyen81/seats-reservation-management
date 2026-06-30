import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { prisma } from "./db";
import { createTokensSession } from "./auth";
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
        }
    } | {
        status: number;
        stack?: any;
        error?: string;
    }> {
        try {
            const authData = await req.json();
            const provider = AUTH_PROVIDER;
            return await prisma.$transaction(async (tx) => this.authTransaction(tx, provider, authData));
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
            if (!idToken) return { error: 'Identity token is missing', status: 400 };

            // handle DB
            let user = await prisma.user.findUnique({ where: { username } });
            let status: number = 200;
            if (!user) {
                user = await prisma.user.create({
                    data: { username, password: 'EXTERNAL_FIREBASE_AUTH' }
                });
                status = 201;
            }

            await createTokensSession(idToken); // process idToken by Firebase Admin
            return { success: true, status: status, user: { id: user.id, username: user.username } };
        }

        // custom
        const { username, password } = authData;

        // 🕵️ Validate
        if (!username || !password) {
            return { error: 'Both username and password fields are strictly required.', status: 400 };
        }

        const cleanUsername = username.trim();
        const cleanPassword = password.trim();

        // check from database (Postgres / SQLite)
        let user = await prisma.user.findUnique({
            where: { username: cleanUsername },
        });
        let status: number = 200;

        // 💡 FIXME Auto creating user if not found, should removing on PROD
        if (!user) {
            user = await prisma.user.create({
                data: {
                    username: cleanUsername,
                    password: await hashPassword(cleanPassword), // hash password
                },
            });
            status = 201;
        } else {
            // 💡 check by password
            const isPasswordValid = await comparePassword(cleanPassword, user.password);
            if (!isPasswordValid) {
                return { error: 'Invalid credentials. Please verify your password and try again.', status: 401 };
            }
        }

        // 💡 Generate DUAL-TOKEN: Access Token + Refresh Token
        await createTokensSession(user.id);

        // Response to front-end
        return {
            success: true,
            status: status,
            user: {
                id: user.id,
                username: user.username,
            },
        };
    }
}

// Enforce Singleton layout compliance
if (!globalForThis.userService) {
    globalForThis.userService = new UserService();
}

// export module
export const userService = globalForThis.userService;