import { test, expect } from '@playwright/test';

test.describe('Seats Reservation Management - End-to-End Business Flow', () => {

    test.beforeEach(async ({ page }) => {
        // to root before every testing case
        await page.goto('/');
    });

    test('Should block seat matrix for unauthenticated users, then log in and complete reservation loop', async ({ page }) => {
        // 🕵️ CASE 1: check un-authenticate
        // Show login form and not showing seats matrix
        await expect(page.locator('text=Identity Authentication')).toBeVisible();
        await expect(page.locator('text=Select available seats')).not.toBeVisible();

        // 🕵️ CASE 2: check login
        await page.locator('input[placeholder*="hainguyenjc@gmail.com"]').fill('hainguyenjc@gmail.com');
        await page.locator('input[placeholder="••••••••"]').fill('password123');

        // Click Login / Register
        await page.locator('button:has-text("Login / Register")').click();

        // wait for UI loaded
        await page.waitForLoadState('networkidle');

        // const seatMapContainer = page.locator('.seat-map-container');
        // await seatMapContainer.waitFor({ state: 'attached', timeout: 5000 }).catch(() => { });
        // const seatMapHtml = await seatMapContainer.innerHTML();
        // console.log("============== [DEBUG] HTML SEATS MAP: ==============");
        // console.log(seatMapHtml);
        // console.log("===============================================================");

        // check UI
        await expect(page.locator('text=Secured Operator:')).toBeVisible();
        await expect(page.locator('text=Session Active')).toBeVisible();

        // 🕵️ CASE 3: check seats matrix
        const seatSectionHeader = page.locator('text=Select available seats');
        await expect(seatSectionHeader).toBeVisible();

        // 🕵️ CASE 4: Multi-select and Countdown Timer
        // Find available seats (AVAILABLE)
        // Click select 2 seats A1, A2 to simulate multi-select
        const seatA1 = page.locator('button:has-text("A1")').first();
        const seatA2 = page.locator('button:has-text("A2")').first();

        await seatA1.click();
        await page.waitForLoadState('networkidle');

        await seatA2.click();
        await page.waitForLoadState('networkidle');

        // confirm SELECTED/PENDING
        await expect(seatA1.locator('.seat-status')).toContainText('SELECTED', { ignoreCase: true });
        await expect(seatA2.locator('.seat-status')).toContainText('SELECTED', { ignoreCase: true });

        // confirm countdown timer
        await expect(page.locator('text=Complete payment before timeout:')).toBeVisible();

        // read countdown text mm:ss
        const timerValue = page.locator('#countdown-time');
        await expect(timerValue).toHaveText(/^\d{2}[\:]\d{2}$/);

        // 🕵️ CASE 5: Simute payment success
        await page.locator('button:has-text("Simulate Success Payment")').click();
        await page.waitForLoadState('networkidle');

        // wait for payment process: call API Backend, run Database ACID Transaction
        await expect(page.locator('text=Seats successfully booked!')).toBeVisible();

        // check UI: seats A1, A2 to BOOKED
        await expect(seatA1.locator('.seat-status')).toContainText('BOOKED', { ignoreCase: true });
        await expect(seatA2.locator('.seat-status')).toContainText('BOOKED', { ignoreCase: true });

        // and could be selected again
        await expect(seatA1).toBeDisabled();
        await expect(seatA2).toBeDisabled();
    });

    test('Should handle user unselecting a seat properly before payment timeout', async ({ page }) => {
        // Login -> Select seat -> select it again to un-selecting (Unselect)
        await page.locator('input[placeholder*="hainguyenjc@gmail.com"]').fill('hainguyenjc@gmail.com');
        await page.locator('input[placeholder="••••••••"]').fill('password123');
        await page.locator('button:has-text("Login / Register")').click();

        // wait for UI loaded
        await page.waitForLoadState('networkidle');

        // const seatMapContainer = page.locator('.seat-map-container');
        // await seatMapContainer.waitFor({ state: 'attached', timeout: 5000 }).catch(() => { });
        // const seatMapHtml = await seatMapContainer.innerHTML();
        // console.log("============== [DEBUG] HTML SEATS MAP: ==============");
        // console.log(seatMapHtml);
        // console.log("===============================================================");

        // locate seat A3
        const seatA3 = page.locator('button:has-text("A3")').first();

        // click 1: select A3
        await seatA3.click();
        await page.waitForLoadState('networkidle');

        // assert SELECTED
        await expect(seatA3.locator('.seat-status')).toContainText('SELECTED', { ignoreCase: true });

        // click 2: unselect A3 (call API release-single)
        await seatA3.click();
        await page.waitForLoadState('networkidle');

        // check UI: back to AVAILABLE
        await expect(seatA3).toContainText('available');
        await expect(page.locator('text=Complete payment before timeout:')).not.toBeVisible();
    });
});
