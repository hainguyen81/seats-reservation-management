import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-key-change-me-in-prod');
const SESSION_EXPIRY = process.env.SESSION_EXPIRY;
const SESSION_EXPIRY_DAYS = SESSION_EXPIRY ? parseInt(SESSION_EXPIRY, 10) : 1;
const COOKIE_KEY = "seats-reservation-token"

export async function createSession(userId: string) {
    const token = await new SignJWT({ userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_EXPIRY_DAYS} days`)
        .sign(JWT_SECRET);

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_KEY, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60, // 90 days in seconds
        path: '/',
    });
    return token;
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_KEY)?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { userId: string };
    } catch (e) {
        console.error("Exception while detect token from cookie", e);
        return null;
    }
}

/**
 * Clear Cookie for log out
 */
export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_KEY);
}
