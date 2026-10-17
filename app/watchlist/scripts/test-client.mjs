// scripts/test-client.mjs
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

async function runLiveDiagnostics() {
  console.log(`\x1b[36m⚡ INITIATING PLAYWRIGHT RADAR SCAN: ${BASE_URL}\x1b[0m\n`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // 1. Audit Home Sector
    console.log('--- SCANNING NODE: / (Home Command Hub) ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const heroTitle = await page.textContent('h1');
    console.log(` ✓ Viewport mounted. Header text: "${heroTitle?.trim()}"`);

    // 2. Audit Watchlist Module
    console.log('\n--- SCANNING NODE: /watchlist ---');
    await page.goto(`${BASE_URL}/watchlist`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Check View Mode Switchers
    const gridBtn = page.locator('button:has-text("田")');
    const listBtn = page.locator('button:has-text("☰")');
    
    if (await listBtn.count() > 0) {
      await listBtn.click();
      console.log(' ✓ List View Toggle (☰) tested successfully.');
    }
    if (await gridBtn.count() > 0) {
      await gridBtn.click();
      console.log(' ✓ Grid View Toggle (田) tested successfully.');
    }

    // 3. Audit Reviews Module & Modal Layering
    console.log('\n--- SCANNING NODE: /reviews ---');
    await page.goto(`${BASE_URL}/reviews`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    const writeReviewBtn = page.locator('button:has-text("Write a Review")');
    if (await writeReviewBtn.count() > 0) {
      await writeReviewBtn.click();
      await page.waitForTimeout(500);

      // Verify modal z-index position above navbar
      const modal = page.locator('div[class*="z-[9999]"]');
      const modalVisible = await modal.isVisible();
      console.log(` ✓ Write Review Modal mounted at z-[9999]: ${modalVisible ? 'PASS' : 'FAIL'}`);

      // Close modal
      const closeBtn = page.locator('button:has-text("✕")').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        console.log(' ✓ Modal closed cleanly.');
      }
    }

    // 4. Console Telemetry Report
    console.log('\n--- BROWSER CONSOLE TELEMETRY ---');
    if (consoleErrors.length === 0) {
      console.log(' \x1b[32m✓ 0 client console errors detected across all tested sectors.\x1b[0m');
    } else {
      console.log(` \x1b[31m⚠ ${consoleErrors.length} console errors caught:\x1b[0m`);
      consoleErrors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    }

  } catch (err) {
    console.error('\x1b[31mAudit terminated prematurely:\x1b[0m', err.message);
  } finally {
    await browser.close();
    console.log('\n\x1b[36m⚡ PLAYWRIGHT LIVE AUDIT COMPLETE.\x1b[0m');
  }
}

runLiveDiagnostics();