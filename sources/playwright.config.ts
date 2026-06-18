import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests', // tesst scripts folder
    fullyParallel: true, // parallel test
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0, // try times if deploying on CI/CD
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html', // create test report web

    use: {
        // test URL
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry', // trace test error on first retry time
        screenshot: 'only-on-failure', // capture test failed to debug
        video: 'retain-on-failure', // record video if failure
    },

    /* 💡 Package server: auto start/stop application */
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
