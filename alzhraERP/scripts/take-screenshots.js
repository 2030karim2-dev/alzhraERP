import { chromium } from 'playwright';
import fs from 'fs';

if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1440, height: 900 });

  // We need to handle potential login redirects if the app pushes unauthenticated users to /login
  
  try {
    console.log('Navigating to Dashboard...');
    await page.goto('http://localhost:8081/#/');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/1_dashboard.png', fullPage: true });

    console.log('Navigating to Inventory...');
    await page.goto('http://localhost:8081/#/inventory');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/2_inventory.png', fullPage: true });

    console.log('Navigating to Sales...');
    await page.goto('http://localhost:8081/#/sales');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/3_sales.png', fullPage: true });

    console.log('Navigating to AI Brain...');
    await page.goto('http://localhost:8081/#/ai-brain');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/4_ai_brain.png', fullPage: true });

  } catch (e) {
    console.error('Error during navigation:', e);
  } finally {
    await browser.close();
    console.log('Done screenshots.');
  }
})();
