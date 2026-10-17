// tests/scenesense.spec.js
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('SceneSense Studio Diagnostics', () => {

  test('01: Verify Landing Page & Command Hub Load', async ({ page }) => {
    // Collect any unhandled console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/SceneSense/i);

    // Verify 0 runtime console errors
    expect(errors).toHaveLength(0);
  });

  test('02: Watchlist Pagination & View Toggles', async ({ page }) => {
    await page.goto(`${BASE_URL}/watchlist`);

    // Switch to List View
    const listBtn = page.locator('button[title="List View"]');
    if (await listBtn.isVisible()) {
      await listBtn.click();
      await page.waitForTimeout(300);
    }

    // Switch to Grid View
    const gridBtn = page.locator('button[title="Grid View"]');
    if (await gridBtn.isVisible()) {
      await gridBtn.click();
      await page.waitForTimeout(300);
    }

    // Test Pagination Next button if there are multiple pages
    const nextBtn = page.locator('button:has-text("Next →")');
    if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator('text=Page 2')).toBeVisible();
    }
  });

  test('03: Reviews Studio Modal Z-Index Check', async ({ page }) => {
    await page.goto(`${BASE_URL}/reviews`);

    // Click Write Review
    const writeBtn = page.locator('button:has-text("Write a Review")');
    await writeBtn.click();

    // Verify modal is visible and stacked high
    const modal = page.locator('div[class*="z-[9999]"]');
    await expect(modal).toBeVisible();

    // Close the modal
    const closeBtn = page.locator('button:has-text("✕")').first();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

});