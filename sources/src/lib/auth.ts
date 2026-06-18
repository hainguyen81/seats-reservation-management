import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './db';
import { firebaseAuthAdmin } from './firebase-admin';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'linkz-assessment-senior-lead-secret-key-2026');
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY;
const ACCESS_TOKEN_EXPIRY_MINUTES = ACCESS_TOKEN_EXPIRY ? parseInt(ACCESS_TOKEN_EXPIRY, 10) : 1;
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY;
const REFRESH_TOKEN_EXPIRY_DAYS = REFRESH_TOKEN_EXPIRY ? parseInt(REFRESH_TOKEN_EXPIRY, 10) : 1;

export const ACCESS_COOKIE = 'seat-access-token';
export const REFRESH_COOKIE = 'seat-refresh-token';
export const FIREBASE_COOKIE = 'seat-firebase-session';

const getAuthProvider = () => process.env.AUTH_PROVIDER || 'custom';

export async function generateAccessToken(userId: string) {
    return await new SignJWT({ userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${ACCESS_TOKEN_EXPIRY_MINUTES} minutes`) // 💡 expiry in minutes
        .sign(JWT_SECRET);
}

export async function generateRefreshToken(userId: string) {
    return await new SignJWT({ userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${REFRESH_TOKEN_EXPIRY_DAYS} days`) // 💡 expiry in days
        .sign(JWT_SECRET);
}

export async function createTokensSession(userId: string) {
    const provider = getAuthProvider();
    const cookieStore = await cookies();

    // firebase
    if (provider === 'firebase') {
        const expiresIn = 60 * 60 * 24 * 14 * 1000;
        const sessionCookie = await firebaseAuthAdmin.createSessionCookie(userId, { expiresIn });
        cookieStore.set(FIREBASE_COOKIE, sessionCookie, {
            httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
            maxAge: 60 * 60 * 24 * REFRESH_TOKEN_EXPIRY_DAYS, // in days
        });

        // custom
    } else {
        const accessToken = await generateAccessToken(userId);
        const refreshToken = await generateRefreshToken(userId);

        // 1. Store Refresh Token into Database to manage whitelist/blacklist
        await prisma.user.update({
            where: { id: userId },
            data: { refreshToken: refreshToken }
        });

        // 2. Store Access Token Cookie
        cookieStore.set(ACCESS_COOKIE, accessToken, {
            httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
            maxAge: ACCESS_TOKEN_EXPIRY_MINUTES * 60, // in minutes
        });

        // 3. Store Refresh Token Cookie
        cookieStore.set(REFRESH_COOKIE, refreshToken, {
            httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
            maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60, // in days
        });
    }
}

export async function verifyAccessToken() {
    const provider = getAuthProvider();
    const cookieStore = await cookies();

    // firebase
    if (provider === 'firebase') {
        // 🔒 Thẩm định Cookie Firebase
        const sessionCookie = cookieStore.get(FIREBASE_COOKIE)?.value;
        if (!sessionCookie) return null;
        try {
            const decodedClaims = await firebaseAuthAdmin.verifySessionCookie(sessionCookie, true);
            // check user from DB
            const user = await prisma.user.findUnique({ where: { username: decodedClaims.email } });
            return user ? { userId: user.id, email: decodedClaims.email } : null;
        } catch (e) {
            console.error('Exception while verify Firebase token', e);
            return null;
        }

        // custom
    } else {
        const token = cookieStore.get(ACCESS_COOKIE)?.value;
        if (!token) return null;

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            return payload as { userId: string };
        } catch(e) {
            console.error('Exception while verify access token', e);
            return null; // expired or invalid
        }
    }
}

export async function deleteTokensSession(userId: string) {
    const provider = getAuthProvider();
    const cookieStore = await cookies();
    cookieStore.delete(ACCESS_COOKIE);
    cookieStore.delete(REFRESH_COOKIE);
    cookieStore.delete(FIREBASE_COOKIE);

    // Remove Refresh Token from DB to log out
    if (userId && provider === 'custom') {
        try {
            await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
        } catch (e) {
            console.error('Exception while removing refresh token from DB', e);
        }
    }
}
