const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const pages = [
    { url: 'http://localhost:3000/', name: 'landing', dismissOnboarding: true },
    { url: 'http://localhost:3000/features', name: 'features', dismissOnboarding: false },
    { url: 'http://localhost:3000/pricing', name: 'pricing', dismissOnboarding: false },
    { url: 'http://localhost:3000/docs', name: 'docs', dismissOnboarding: false },
    { url: 'http://localhost:3000/receipt-scanner', name: 'receipt-scanner', dismissOnboarding: false },
    { url: 'http://localhost:3000/compare/trakzi-vs-ynab', name: 'compare-ynab', dismissOnboarding: false },
  ];

  for (const p of pages) {
    const page = await context.newPage();
    await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Dismiss onboarding walkthrough if present
    if (p.dismissOnboarding) {
      // Try clicking "Skip" or "Get Started" or "Next" or close buttons
      const skipSelectors = [
        'button:has-text("Skip")',
        'button:has-text("Skip intro")',
        'button:has-text("Get Started")',
        'button:has-text("Next")',
        'button:has-text("Done")',
        'button:has-text("Close")',
        '[aria-label="Close"]',
        '.onboarding-close',
        '[data-testid="skip-onboarding"]',
      ];
      for (const sel of skipSelectors) {
        try {
          const btn = await page.$(sel);
          if (btn && await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(500);
          }
        } catch {}
      }
      // Try pressing Escape to dismiss any overlay
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      // Try clicking multiple times to get through multi-step onboarding
      for (let i = 0; i < 5; i++) {
        for (const sel of skipSelectors) {
          try {
            const btn = await page.$(sel);
            if (btn && await btn.isVisible()) {
              await btn.click();
              await page.waitForTimeout(300);
            }
          } catch {}
        }
      }
      await page.waitForTimeout(1000);
    }

    // Check dark mode
    const htmlClass = await page.evaluate(() => document.documentElement.className);

    // Check actual rendered text colors
    const textInfo = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('h2');
      const p = document.querySelector('p');
      const header = document.querySelector('header');

      const getStyle = (el) => {
        if (!el) return null;
        const s = getComputedStyle(el);
        return {
          text: el.textContent.substring(0, 50),
          color: s.color,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          letterSpacing: s.letterSpacing,
        };
      };

      return {
        h1: getStyle(h1),
        h2: getStyle(h2),
        p: getStyle(p),
        headerBg: header ? getComputedStyle(header).backgroundColor : 'none',
      };
    });

    console.log(`\n=== ${p.name} (${p.url}) ===`);
    console.log(`  html class: ${htmlClass}`);
    console.log(`  header bg: ${textInfo.headerBg}`);
    if (textInfo.h1) {
      console.log(`  H1: "${textInfo.h1.text}" | color: ${textInfo.h1.color} | size: ${textInfo.h1.fontSize} | weight: ${textInfo.h1.fontWeight} | tracking: ${textInfo.h1.letterSpacing}`);
    }
    if (textInfo.h2) {
      console.log(`  H2: "${textInfo.h2.text}" | color: ${textInfo.h2.color} | size: ${textInfo.h2.fontSize} | weight: ${textInfo.h2.fontWeight}`);
    }
    if (textInfo.p) {
      console.log(`  P:  "${textInfo.p.text}" | color: ${textInfo.p.color} | size: ${textInfo.p.fontSize}`);
    }

    // Check for onboarding overlay still visible
    const hasOverlay = await page.evaluate(() => {
      const overlays = document.querySelectorAll('[class*="onboarding"], [class*="walkthrough"], [class*="tour"], [class*="intro"]');
      return overlays.length > 0;
    });
    console.log(`  onboarding overlay visible: ${hasOverlay}`);

    // Scroll down past hero to see content
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(500);

    await page.screenshot({ path: `C:/Users/Yaya/Desktop/PROJECTS/trakzi/screenshot-${p.name}.png`, fullPage: false });
    await page.close();
  }

  await browser.close();
  console.log('\nDone! Screenshots saved.');
})();
