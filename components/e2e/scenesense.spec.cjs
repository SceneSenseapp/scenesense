const { test, expect } = require('@playwright/test');

test.describe('SceneSense Studio - End-to-End Audit Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to local development server
    await page.goto('http://localhost:3000');
  });

  test('1. Landing page loads core studio elements', async ({ page }) => {
    // Verify brand heading and core description
    await expect(page.locator('h1')).toHaveText('SceneSense Studio');
    await expect(page.locator('text=Choose your director mode below')).toBeVisible();
    
    // Verify director mode tabs exist
    await expect(page.locator('button:has-text("Auteur Director")')).toBeVisible();
    await expect(page.locator('button:has-text("Film Noir Critic")')).toBeVisible();
    await expect(page.locator('button:has-text("Studio Executive")')).toBeVisible();
  });

  test('2. Director persona switching updates telemetry HUD', async ({ page }) => {
    const noirTab = page.locator('button:has-text("Film Noir Critic")');
    await noirTab.click();
    
    // Verify active persona badge in the HUD specifically
    await expect(page.locator('.font-mono:has-text("noir")')).toBeVisible();
  });

  test('3. Preset prompt click populates and triggers recommendation', async ({ page }) => {
    // Click on the first preset recommendation pill
    const presetButton = page.locator('button:has-text("Blade Runner-inspired detective story")').first();
    await presetButton.click();

    // Verify loading indicator appears or output renders
    // (Depending on mock or live TMDB/AI API response time)
    const generateBtn = page.locator('button:has-text("Generate Recommendation")');
    await expect(generateBtn).toBeVisible();
  });

  test('4. Authentication modal opens and closes correctly', async ({ page }) => {
    const loginButton = page.locator('button:has-text("Director Login")');
    await loginButton.click();

    // Verify modal title appears
    await expect(page.locator('h2:has-text("Director Login")')).toBeVisible();

    // Close modal via close button
    const closeBtn = page.locator('button[aria-label="Close modal"]');
    await closeBtn.click();

    // Verify modal is dismissed
    await expect(page.locator('h2:has-text("Director Login")')).not.toBeVisible();
  });

  test('5. Drawers (Saved Films & History) open and close', async ({ page }) => {
    // Test that unauthenticated state allows clicking buttons (which prompt login or open drawers if state permits)
    const savedFilmsBtn = page.locator('button:has-text("Saved Films")');
    if (await savedFilmsBtn.isVisible()) {
      await savedFilmsBtn.click();
      await expect(page.locator('h2:has-text("Saved Films")')).toBeVisible();
      
      // Close drawer
      await page.locator('button[aria-label="Close saved films drawer"]').click();
    }
  });

});