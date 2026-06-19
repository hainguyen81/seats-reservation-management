import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests', // tesst scripts folder
    testMatch: '**/*.spec.ts',
    fullyParallel: true, // parallel test
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0, // try times if deploying on CI/CD
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html', // create test report web

    use: {
        // test URL
        baseURL: 'http://127.0.0.1:3000',
        trace: 'on-first-retry', // trace test error on first retry time
        screenshot: 'only-on-failure', // capture test failed to debug
        video: 'retain-on-failure', // record video if failure
    },

    /* 💡 Package server: auto start/stop application */
    webServer: {
        command: 'npx prisma db push && npm run dev',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        env: {
            DATABASE_PROVIDER: "sqlite",
            AUTH_PROVIDER: "custom",
            NEXT_PUBLIC_AUTH_PROVIDER: "custom",
            DATABASE_URL: "file:./sqlite-test.db",
            DIRECT_DATABASE_URL: "file:./sqlite-test.db",
            REDIS_URL: "redis://localhost:6379",
            JWT_SECRET: "github-seats-reservation-secret-key-2026-v1.0",
            TOTAL_SEATS: "15",
            SHOULD_SEED: "true",
            NODE_ENV: 'test'
        }
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
