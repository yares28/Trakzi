import { chromium } from "playwright";
import path from "path";
const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([
    { name: "trakzi-demo-mode", value: "true", domain: "localhost", path: "/" },
  ]);
  const page = await context.newPage();

  await page.goto(`${BASE}/analytics`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);

  // Remove dev overlays and tour dialogs
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((p: Element) => p.remove());
    // Dismiss tour by clicking Skip if visible
    const skipBtns = Array.from(document.querySelectorAll("button")).filter(
      b => b.textContent?.trim() === "Skip tour"
    );
    skipBtns.forEach(b => (b as HTMLButtonElement).click());
  });
  await page.waitForTimeout(500);

  // Scroll down to find Cumulative button (it's at y=0 based on previous run)
  const cumulBtnSelector = 'button:has-text("Cumulative")';

  // Wait for the button to be clickable
  let btnHandle = null;
  for (let y = 0; y <= 5000; y += 300) {
    await page.evaluate((scrollY: number) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(200);
    btnHandle = await page.$(cumulBtnSelector);
    if (btnHandle) {
      const box = await btnHandle.boundingBox();
      if (box) {
        console.log(`Found Cumulative button at scroll y=${y}, box=${JSON.stringify(box)}`);
        break;
      }
    }
  }

  if (!btnHandle) {
    console.log("Cumulative button not found");
    await page.screenshot({ path: path.join(__dirname, "not-found.png") });
    await browser.close();
    return;
  }

  // Take screenshot in basic mode
  await page.screenshot({ path: path.join(__dirname, "step1-basic.png") });

  // Click cumulative
  await btnHandle.click({ force: true } as any);
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((p: Element) => p.remove());
  });
  await page.screenshot({ path: path.join(__dirname, "step2-cumulative.png") });
  console.log("Cumulative mode screenshot saved");

  // Get chart wrapper
  const chartWrapper = await page.$(".recharts-wrapper");
  const box = await chartWrapper?.boundingBox();
  console.log("Chart box:", JSON.stringify(box));
  if (!box) { await browser.close(); return; }

  // Read Y-axis values
  const yAxis = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".recharts-yAxis .recharts-text")).map(t => ({
      text: t.textContent?.trim(),
      transform: t.closest("[transform]")?.getAttribute("transform"),
    }));
  });
  console.log("Y-axis:", JSON.stringify(yAxis));

  // Hover to get tooltips - dismiss overlays before each hover
  console.log("\n--- Chart tooltip values ---");
  for (const frac of [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
    // Dismiss any overlay before hover
    await page.evaluate(() => {
      document.querySelectorAll("nextjs-portal, [data-nextjs-dev-overlay]").forEach((p: Element) => p.remove());
    });
    await page.mouse.move(
      box.x + box.width * frac,
      box.y + box.height * 0.4
    );
    await page.waitForTimeout(500);

    // Get portal tooltip content
    const tt = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll("div"));
      for (const d of allDivs) {
        const style = window.getComputedStyle(d);
        if (style.position === "fixed" && parseInt(style.zIndex) > 1000) {
          const text = d.textContent?.replace(/\s+/g, " ").trim() ?? "";
          if (text && (text.includes("$") || text.includes("Balance") || text.includes("Income")) && text.length < 300) {
            return text;
          }
        }
      }
      return "";
    });

    if (tt) console.log(`  ${Math.round(frac * 100)}%: ${tt}`);
  }

  await page.screenshot({ path: path.join(__dirname, "step3-final.png") });
  console.log("\nScreenshots saved to output/");

  // Also print the SVG paths to understand direction
  const paths = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".recharts-area-curve")).map((el, i) => {
      const d = (el as SVGPathElement).getAttribute("d") ?? "";
      // Extract x,y pairs
      const points = d.match(/[\d.]+,[\d.]+/g) ?? [];
      // Get every 5th data point y value to see trend
      return {
        index: i,
        stroke: (el as SVGPathElement).getAttribute("stroke"),
        points: points
          .filter((_, idx) => idx % 3 === 0)  // roughly every 3rd point
          .slice(0, 15)
          .map(p => {
            const [x, y] = p.split(",").map(Number);
            return { x: Math.round(x), y: Math.round(y) };
          })
      };
    });
  });
  console.log("\nPath y-values (sampled):");
  paths.forEach(p => {
    const ys = p.points.map(pt => pt.y).join(", ");
    console.log(`  [${p.index}] stroke=${p.stroke}: y=${ys}`);
  });

  await browser.close();
  console.log("\nDone.");
})();
