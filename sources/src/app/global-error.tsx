'use client';

import { useTranslations } from "next-intl";
import { useEffect } from "react";

// global-error must explicitly define raw html/body elements because layout.tsx is broken
export default function AbsoluteGlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const i18n = useTranslations();
    
    useEffect(() => {
        // Log telemetry exceptions directly to remote instrumentation nodes (e.g., Sentry)
        console.error(`💀 CRITICAL INFRASTRUCTURE CRASH`, error, error.message, error.digest);
    }, [error]);

    return (
        <html lang="en">
            <body className="bg-black text-white flex items-center justify-center min-h-screen font-sans">
                <div className="text-center space-y-4">
                    <h1 className="text-3xl font-black text-red-600">${i18n('💀 CRITICAL INFRASTRUCTURE CRASH')}</h1>
                    <p className="text-gray-400">${i18n('❌ The application root container execution state collapsed.')}</p>
                    {error && (
                        <p className="text-slate-400 text-sm">
                            <strong><u>${i18n('⚠️ Details')}:</u></strong> ${(error.message || '').length && error.message}
                            <span>${error.stack}</span>
                            <span>${error.digest}</span>
                        </p>
                    )}
                    <button
                        onClick={() => reset()}
                        className="px-4 py-2 bg-red-600 rounded-md font-bold text-sm"
                    >
                        ${i18n('🔄 Force Application Recovery Loop')}
                    </button>
                </div>
            </body>
        </html>
    );
}
