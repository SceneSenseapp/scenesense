// File: components/e2e/studio.spec.js
const { test, expect } = require('@playwright/test');

test.describe('SceneSense Studio - End-to-End Mission Control Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate using Playwright's baseURL or default to local development port
    await page.goto('/');
  });

  test('1. Studio root initializes core command telemetry', async ({ page }) => {
    // Verify brand heading or terminal header
    const mainHeading = page.locator('h1').first();
    await expect(mainHeading).toBeVisible();

    // Verify primary navigation routes are accessible
    await expect(page.locator('a[href*="/where-to-watch"]').first()).toBeVisible();
    await expect(page.locator('a[href*="/armoury"]').first()).toBeVisible();
    await expect(page.locator('a[href*="/reviews"]').first()).toBeVisible();
  });

  test('2. Surveillance Radar (Where to Watch) executes search and filter operations', async ({ page }) => {
    await page.goto('/where-to-watch');

    // Verify main radar viewport loads
    await expect(page.getByRole('heading', { name: /where to watch/i })).toBeVisible();

    // Verify territory selector exists
    const regionSelect = page.locator('select').first();
    await expect(regionSelect).toBeVisible();

    // Test search filter input
    const searchInput = page.getByPlaceholder(/search (all titles|movies|series)/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Blade Runner');
    await searchInput.press('Enter');

    // Verify search indicator or results container updates
    await expect(page.locator('text=Blade Runner').first()).toBeVisible({ timeout: 10000 });
  });

  test('3. Prop Department Commissary loads real-time economy HUD', async ({ page }) => {
    // Unauthenticated navigation redirects to login
    await page.goto('/armoury');

    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      await expect(page.getByRole('heading', { name: /operative login|register operative/i })).toBeVisible();
    } else {
      // Authenticated state: verify balance and tabs
      await expect(page.getByRole('heading', { name: /prop department/i })).toBeVisible();
      await expect(page.locator('text=STUDIO BALANCE')).toBeVisible();
      await expect(page.getByRole('button', { name: /screen credits/i })).toBeVisible();
    }
  });

  test('4. Sector Communications Hub and Watch Party navigation', async ({ page }) => {
    await page.goto('/chat');

    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      await expect(page.getByRole('heading', { name: /operative login/i })).toBeVisible();
    } else {
      // Verify Network dropdown and AI diagnostics buttons
      await expect(page.getByRole('button', { name: /network/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /script doctor/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /watch party/i })).toBeVisible();

      // Test Watch Party modal / theater transition
      await page.getByRole('button', { name: /watch party/i }).click();
      await expect(page).toHaveURL(/.*watch-party.*/);
    }
  });

  test('5. Global Reviews archive loads dispatches and filters by root sector', async ({ page }) => {
    await page.goto('/reviews');

    // Verify left rail navigation sectors exist
    await expect(page.locator('text=Critique Archives')).toBeVisible();
    await expect(page.locator('button:has-text("all-dispatches")')).toBeVisible();
    await expect(page.locator('button:has-text("masterpieces")')).toBeVisible();

    // Verify review write button triggers review studio modal
    const writeBtn = page.getByRole('button', { name: /write a review/i });
    await expect(writeBtn).toBeVisible();
    await writeBtn.click();

    // Verify modal overlay opens
    await expect(page.getByRole('heading', { name: /create film & television review/i })).toBeVisible();
    
    // Close modal
    await page.getByRole('button', { name: '✕' }).click();
    await expect(page.getByRole('heading', { name: /create film & television review/i })).not.toBeVisible();
  });

  test('6. Legal & Compliance safe harbor routes render correctly', async ({ page }) => {
    // Verify Terms of Service
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: /terms of service/i })).toBeVisible();
    await expect(page.locator('text=TMDB API Attribution')).toBeVisible();

    // Verify DMCA Policy
    await page.goto('/dmca');
    await expect(page.getByRole('heading', { name: /dmca & copyright policy/i })).toBeVisible();
    await expect(page.locator('text=Designated Agent')).toBeVisible();

    // Verify Privacy Policy
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();
  });

});