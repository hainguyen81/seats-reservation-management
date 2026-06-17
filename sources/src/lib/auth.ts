import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'linkz-assessment-senior-lead-secret-key-2026');
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY;
const ACCESS_TOKEN_EXPIRY_MINUTES = ACCESS_TOKEN_EXPIRY ? parseInt(ACCESS_TOKEN_EXPIRY, 10) : 1;
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY;
const REFRESH_TOKEN_EXPIRY_DAYS = REFRESH_TOKEN_EXPIRY ? parseInt(REFRESH_TOKEN_EXPIRY, 10) : 1;

export const ACCESS_COOKIE = 'seat-access-token';
export const REFRESH_COOKIE = 'seat-refresh-token';

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
    const accessToken = await generateAccessToken(userId);
    const refreshToken = await generateRefreshToken(userId);

    // 1. Store Refresh Token into Database to manage whitelist/blacklist
    await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: refreshToken }
    });

    const cookieStore = await cookies();

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

export async function verifyAccessToken() {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE)?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { userId: string };
    } catch {
        return null; // expired or invalid
    }
}

export async function deleteTokensSession(userId: string) {
    const cookieStore = await cookies();
    cookieStore.delete(ACCESS_COOKIE);
    cookieStore.delete(REFRESH_COOKIE);

    // Remove Refresh Token from DB to log out
    try {
        await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
    } catch (e) {
        console.error('Exception while removing refresh token from DB', e);
    }
}
