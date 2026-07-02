'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalErrorBoundary({ error, reset }: GlobalErrorProps) {
    const i18n = useTranslations();

    useEffect(() => {
        // Log telemetry exceptions directly to remote instrumentation nodes (e.g., Sentry)
        console.error('🚨 [Root UI Error Boundary Trapped]:', error.message, error.digest);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
            <div className="max-w-md text-center space-y-4">
                <h2 className="text-2xl font-bold text-red-500">${i18n('⚠️ Something went wrong inside the UI!')}</h2>
                <p className="text-slate-400 text-sm">
                    ${i18n('⚠️ An unhandled error occurred during application execution runtime loop.')}
                </p>
                {error && (
                    <p className="text-slate-400 text-sm">
                        <strong><u>${i18n('⚠️ Details')}:</u></strong> ${(error.message || '').length && error.message}
                        <span>${error.stack}</span>
                    </p>
                )}
                <div className="flex justify-center gap-4 pt-2">
                    <button
                        onClick={() => reset()} // Re-render the segment route to attempt execution recovery
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all text-sm font-semibold"
                    >
                        ${i18n('🔄 Try Again')}
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all text-sm font-semibold"
                    >
                        ${i18n('🏠 Hard Refresh')}
                    </button>
                </div>
            </div>
        </div>
    );
}
