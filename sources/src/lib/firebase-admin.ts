import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth as getFirebaseAdminAuth } from 'firebase-admin/auth';

let authAdmin: any = null;

// 🕵️ if using firebase provider, initialize admin authetication instance
if (process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'firebase') {
    try {
        if (!getApps().length) {
            if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
                throw new Error("Missing critical Firebase Service Account environment variables.");
            }
            initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    // process new line separator for Docker/Linux environment
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                }),
            });
            authAdmin = getFirebaseAdminAuth();
            console.log("🔥 [Backend] Firebase Admin SDK initialized successfully.");
        }
    } catch (e) {
        console.error("❌ [Backend] Firebase Admin initialization failed:", e);
    }
} else {
    console.log("🔒 [Backend] AUTH_PROVIDER is set to Custom. Skipping Firebase Admin initialization.");
}
export const firebaseAuthAdmin = authAdmin;
