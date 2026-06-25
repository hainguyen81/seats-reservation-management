import { test, expect } from '@playwright/test';

// Configuration parameter bounds checking
const BASE_URL = process.env.TARGET_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'playwright-seats-reservation-management-secret-key-2026-v1.0';
const API_SEATS_RELEASE = "/api/release";

// 🔥 run test sequential
test.describe.configure({ mode: 'serial' });

test.describe('🧱 Core Infrastructure Administrative Housekeeping Suite', () => {

    test('🧹 Reset all cluster seats state back to AVAILABLE via API Egress', async ({ request }) => {
        console.log(`📡 Transmitting state eviction signal to: ${BASE_URL}${API_SEATS_RELEASE}`);

        // Dispatch synchronous POST request to trigger the Background Sweeper logic
        const response = await request.post(`${BASE_URL}${API_SEATS_RELEASE}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-App-Benchmark-Client': 'playwright-admin-sweeper-engine',
                // Optional security token boundary signature mapping
                'Authorization': `Bearer ${JWT_SECRET}`
            }
        });

        // Enforce transaction validation checking patterns [3.2]
        expect(response.status()).toBe(200);

        const responseBody = await response.json();
        expect(responseBody.success).toBe(true);

        console.log(`✅ [Infrastructure Clear] ${responseBody.message}`);
        console.log(`📊 Total seat counts synchronized: ${responseBody.releasedCount}`);
    });
});
