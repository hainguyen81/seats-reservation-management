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
        await page.locator('input[placeholder*="Username"]').fill('hainguyenjc@gmail.com');
        await page.locator('input[placeholder="••••••••"]').fill('password123');

        // Click Login / Register
        await page.locator('button:has-text("Login / Register")').click();

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
        await seatA2.click();

        // confirm SELECTED/PENDING
        await expect(seatA1).toContainText('SELECTED');
        await expect(seatA2).toContainText('SELECTED');

        // confirm countdown timer
        await expect(page.locator('text=Complete payment before timeout:')).toBeVisible();

        // read countdown text mm:ss
        const timerValue = page.locator('strong:has-text("04:")');
        await expect(timerValue).toBeVisible();

        // 🕵️ CASE 5: Simute payment success
        await page.locator('button:has-text("Simulate Success Payment")').click();

        // wait for payment process: call API Backend, run Database ACID Transaction
        await expect(page.locator('text=Successfully reserved')).toBeVisible();

        // check UI: seats A1, A2 to BOOKED
        await expect(seatA1).toContainText('BOOKED');
        await expect(seatA2).toContainText('BOOKED');

        // and could be selected again
        await expect(seatA1).toBeDisabled();
        await expect(seatA2).toBeDisabled();
    });

    test('Should handle user unselecting a seat properly before payment timeout', async ({ page }) => {
        // Login -> Select seat -> select it again to un-selecting (Unselect)
        await page.locator('input[placeholder*="Username"]').fill('hainguyenjc@gmail.com');
        await page.locator('input[placeholder="••••••••"]').fill('password123');
        await page.locator('button:has-text("Login / Register")').click();

        const seatA3 = page.locator('button:has-text("A3")').first();

        // click 1: select A3
        await seatA3.click();
        await expect(seatA3).toContainText('SELECTED');

        // click 2: unselect A3 (call API release-single)
        await seatA3.click();

        // check UI: back to AVAILABLE
        await expect(seatA3).toContainText('available');
        await expect(page.locator('text=Complete payment before timeout:')).not.toBeVisible();
    });
});
