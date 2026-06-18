import { initializeApp, getApps, getAuth, getAnalytics } from 'firebase/app';
import { getAuth as getFirebaseAuth, getAnalytics as getFirebaseAnalytics } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "MOCK_KEY",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "://firebaseapp.com",
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DB_URL || "://db.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJET || "MOCK-PROJECT",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "://appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER || "000000000000",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-0000000000"
};

let firebaseClientAuthInstance: any = null;
let firebaseClientAnalyticsInstance: any = null;

// 🕵️ if using firebase provider, initialize client authetication instance
if (process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'firebase') {
    try {
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        firebaseClientAuthInstance = getFirebaseAuth(app);
        firebaseClientAnalyticsInstance = getFirebaseAnalytics(app);
    } catch (e) {
        console.warn("⚠️ Firebase Client failed to initialize. Fallback active.", e);
    }
}
export const firebaseClientAuth = firebaseClientAuthInstance;
export const firebaseClientAnalytics = firebaseClientAnalyticsInstance;
