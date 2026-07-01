export function register() {
    // 🔥 PERIMETER SECURITY GATE:
    // Only execute heavy monitoring instrumentation boot-ups if running on a live Node.js Node Server fabric
    // This automatically blocks the script from executing and crashing during the GitHub APK static export phase!
    // This hook runs exactly once when the Next.js runtime container boots up on the host pod node!
    if (process.env.NEXT_RUNTIME === 'nodejs') {

        // Catch uncaught exceptions happening anywhere inside the Node.js runtime process
        process.on('uncaughtException', (error) => {
            console.error('🚨 [FATAL UNCAUGHT PROCESS EXCEPTION]:', error.message, error.stack);
            // Optional: push alerts directly into alerting hooks (Slack/Discord channels)
        });

        // Catch unhandled Promise rejections (e.g., detached async task database breaks)
        process.on('unhandledRejection', (reason: any) => {
            console.error('🚨 [FATAL UNHANDLED PROMISE REJECTION]:', reason?.message || reason);
        });
    }
}
