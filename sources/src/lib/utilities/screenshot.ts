/**
 * Utilities support for capturing the webpage or element on webpage,
 * using Playwright
 * - Requires:
 *      # Playwright and deps to compile
 *      npm install playwright
 *      npm install -D typescript ts-node @types/node
 *      # Chromium to open the captured webpage URL
 *      npx playwright install chromium --with-deps
 */

import { chromium, LocatorScreenshotOptions, Page, PageScreenshotOptions } from 'playwright';

interface ScreenshotOptions {
    url: string;
    output: string;
    element?: string; // Optional element locator like XPath, CSS. If omitted, it defaults to capturing the full page.
    timeout?: 3000; // timeout to wait for opening url
    wholePageIfNotFoundElement?: boolean, // capture whole page if not found element
    pageScreenshotOptions?: PageScreenshotOptions;
    elementScreenShotOptions?: LocatorScreenshotOptions;
}

/**
 * Captures a screenshot of a webpage or a specific element inside it.
 * Automatically falls back to capturing the full page if the specified element is not found.
 */
export async function captureWebpage(options: ScreenshotOptions): Promise<void> {
    const { url, output, element, elementScreenShotOptions, pageScreenshotOptions, wholePageIfNotFoundElement, timeout } = options;

    // 1. Launch a headless browser instance
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 } // Set a large standard viewport size
    });
    const page: Page = await context.newPage();

    try {
        console.log(`- 📸 Navigating to: ${url}`);

        // 2. Wait until there are no remaining network requests (XHR/Fetch) for at least 500ms
        await page.goto(url, { waitUntil: 'networkidle', timeout: timeout || 3000 });

        // Allow an extra 5 seconds for complex charts or dashboards to finish rendering smooth graphics
        await page.waitForTimeout(5000);

        let elementCaptured = false;

        // 3. If an element selector is provided, attempt to locate and capture that specific component
        if ((element || '').length) {
            console.log(`- 🔍 Searching for element: ${element}`);
            try {
                const pageElement = await page.locator(element || '');
                if (pageElement) {
                    console.log(`- 📸 Capturing element: ${element}`);
                    let opts = elementScreenShotOptions || { path: output };
                    opts.path = output;
                    await pageElement.screenshot(opts);
                    console.log(`--- 💯 Success: Captured specific element '${element}'`);
                    elementCaptured = true;
                } else {
                    console.log(`--- ⚠️ Element '${element}' was not found in the DOM.`);
                }
            } catch (error: any) {
                console.log(`--- ⚠️ Error while locating element: ${error.message}`);
            }
        }

        // 4. Fallback Mechanism: Capture the full webpage if no selector was specified or if the element target was missing
        if (!(element || '').length || (!elementCaptured && wholePageIfNotFoundElement)) {
            console.log('- 📸 Proceeding to capture the full page as a fallback option...');
            let opts = pageScreenshotOptions || { path: output, fullPage: true };
            opts.path = output;
            opts.fullPage = true;
            await page.screenshot(opts);
            console.log('--- 💯 Full page screenshot captured successfully!');
        }

    } catch (error: any) {
        console.error(`- ❌ Critical error during execution: ${error.message}`);
        throw error;
    } finally {
        // 5. Always close the browser instance to release system memory and resources
        await browser.close();
    }
}

// ==========================================
// USAGE EXAMPLE (CAN BE REMOVED):
// ==========================================
// (async () => {
//   await captureWebpage({
//     url: 'https://example.com',
//     outputPath: 'sources/.assets/.prometheus/prometheus_dashboard.png',
//     elementSelector: 'div.react-grid-layout'
//   });
// })();
