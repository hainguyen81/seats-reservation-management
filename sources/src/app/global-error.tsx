'use client';

// global-error must explicitly define raw html/body elements because layout.tsx is broken
export default function AbsoluteGlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body className="bg-black text-white flex items-center justify-center min-h-screen font-sans">
                <div className="text-center space-y-4">
                    <h1 className="text-3xl font-black text-red-600">CRITICAL INFRASTRUCTURE CRASH</h1>
                    <p className="text-gray-400">The application root container execution state collapsed.</p>
                    <button
                        onClick={() => reset()}
                        className="px-4 py-2 bg-red-600 rounded-md font-bold text-sm"
                    >
                        Force Application Recovery Loop
                    </button>
                </div>
            </body>
        </html>
    );
}
