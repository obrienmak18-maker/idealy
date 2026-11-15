import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const targetUrl = process.argv[2] || "https://lovable.dev";
const targetName = process.argv[3] || "target";
const outputDir = path.resolve("artifacts", "reverse-engineering", targetName);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`[REA] Lancement de l'inspection en direct pour : ${targetUrl}`);

(async () => {
  const browser = await chromium.launch({
    headless: true, // Peut passer à false si on veut ouvrir la fenêtre visible
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  // Interception réseau
  const apiCalls = [];
  page.on("request", (req) => {
    if (req.resourceType() === "fetch" || req.resourceType() === "xhr") {
      apiCalls.push({
        url: req.url(),
        method: req.method(),
        postData: req.postData(),
      });
    }
  });

  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(3000); // Laisser les micro-animations et polices charger

    // Capture d'écran pleine page
    const screenshotPath = path.join(outputDir, "screen-full.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`[REA] Capture d'écran enregistrée dans : ${screenshotPath}`);

    // Extraction des styles clés et métriques d'interface
    const specs = await page.evaluate(() => {
      const getStyles = (el) => {
        if (!el) return null;
        const s = window.getComputedStyle(el);
        return {
          tagName: el.tagName,
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          lineHeight: s.lineHeight,
          color: s.color,
          backgroundColor: s.backgroundColor,
          border: s.border,
          borderRadius: s.borderRadius,
          boxShadow: s.boxShadow,
          padding: s.padding,
          margin: s.margin,
          transition: s.transition,
        };
      };

      // Chercher des éléments clés : boutons, inputs, en-têtes, conteneurs
      const buttons = Array.from(document.querySelectorAll("button")).slice(0, 5).map(getStyles);
      const inputs = Array.from(document.querySelectorAll("textarea, input")).slice(0, 5).map(getStyles);
      const headings = Array.from(document.querySelectorAll("h1, h2, h3")).slice(0, 5).map(getStyles);
      const body = getStyles(document.body);

      return {
        title: document.title,
        body,
        buttons,
        inputs,
        headings,
      };
    });

    const report = {
      targetUrl,
      targetName,
      extractedAt: new Date().toISOString(),
      specs,
      apiCallsSample: apiCalls.slice(0, 15),
    };

    const reportPath = path.join(outputDir, "inspection-spec.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
    console.log(`[REA] Spécifications extraites dans : ${reportPath}`);
  } catch (err) {
    console.error(`[REA] Erreur lors de l'inspection :`, err.message);
  } finally {
    await browser.close();
    console.log(`[REA] Session d'inspection terminée avec succès.`);
  }
})();
