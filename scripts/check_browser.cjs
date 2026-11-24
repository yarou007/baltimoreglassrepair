/* Run against the local static server; no calls or external requests are made. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const origin = process.env.SITE_URL || "http://127.0.0.1:8000";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name === "node_modules") return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? walk(full)
      : full.endsWith(".html")
        ? [full]
        : [];
  });
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const pages = walk(root).filter(
      (file) =>
        !path.basename(file).startsWith("google") &&
        !fs.readFileSync(file, "utf8").includes('http-equiv="refresh"'),
    );
    const routes = pages.map(
      (file) => "/" + path.relative(root, file).split(path.sep).join("/"),
    );
    const errors = [];
    const localFailures = [];
    const context = await browser.newContext();
    await context.route("**/*", (route) =>
      route
        .request()
        .url()
        .startsWith(origin + "/")
        ? route.continue()
        : route.abort(),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.url().startsWith(origin + "/") && response.status() >= 400)
        localFailures.push(response.url());
    });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        const response = await page.goto(origin + route, { waitUntil: "load" });
        assert.equal(response.status(), 200, route);
        assert.equal(await page.locator("h1").count(), 1, route);
        assert.equal(
          await page.locator('form,input,textarea,a[href^="mailto:"]').count(),
          0,
          route,
        );
        assert.equal(
          await page
            .locator('a[href^="tel:"]:not([href="tel:+12026434062"])')
            .count(),
          0,
          route,
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `Overflow ${width}: ${route}`,
        );
      }
      console.log(
        `PASS: ${routes.length} canonical pages at ${width}px; rendering, phone and WhatsApp actions and overflow.`,
      );
    }
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 720 });
      await page.goto(origin + "/");
      const mobile = width <= 900;
      const toggle = page.locator(".nav-toggle");
      if (mobile) {
        await toggle.click();
        assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      }
      const dropdown = page.locator(".dropbtn");
      await dropdown.click();
      assert(await page.locator("#service-menu").isVisible());
      await page.keyboard.press("Escape");
      assert.equal(await dropdown.getAttribute("aria-expanded"), "false");
      assert(await dropdown.evaluate((el) => el === document.activeElement));
      if (mobile) {
        await page.keyboard.press("Escape");
        assert.equal(await toggle.getAttribute("aria-expanded"), "false");
        assert(await toggle.evaluate((el) => el === document.activeElement));
        await toggle.click();
        await dropdown.click();
        await toggle.click();
        assert(!(await page.locator("#site-nav").isVisible()));
        assert.equal(await dropdown.getAttribute("aria-expanded"), "false");
        await toggle.click();
      } else {
        await dropdown.click();
      }
      await page.locator("h1").click();
      assert.equal(await dropdown.getAttribute("aria-expanded"), "false");
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Overflow at ${width}`,
      );
      console.log(
        `PASS: ${width}px navigation, Escape focus return and outside closure.`,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "/");
    await page.evaluate(() => {
      window.callEvents = [];
      window.addEventListener("phone-click", (event) =>
        window.callEvents.push(event.detail),
      );
      document.addEventListener(
        "click",
        (event) => {
          if (event.target.closest('a[href^="tel:"]')) event.preventDefault();
        },
        true,
      );
    });
    await page.locator(".hero .btn-primary").click();
    await page.locator(".sticky-call strong").click();
    const events = await page.evaluate(() => ({
      custom: window.callEvents,
      layer: window.dataLayer,
    }));
    assert.equal(events.custom.length, 2);
    assert.equal(events.layer.length, 2);
    assert.equal(events.custom[0].call_location, "hero");
    assert.equal(events.custom[1].call_location, "mobile-bar");
    assert(
      events.custom.every((event) => event.phone_number === "+12026434062"),
    );
    assert.equal(new URL(page.url()).pathname, "/");
    await page.evaluate(() => {
      window.whatsappEvents = [];
      window.addEventListener("whatsapp-click", (event) =>
        window.whatsappEvents.push(event.detail),
      );
      document.addEventListener(
        "click",
        (event) => {
          if (event.target.closest('a[href="https://wa.me/12026434062"]'))
            event.preventDefault();
        },
        true,
      );
    });
    assert.equal(
      await page.locator(".hero .btn-whatsapp").getAttribute("href"),
      "https://wa.me/12026434062",
    );
    await page.locator(".hero .btn-whatsapp").click();
    await page.locator(".sticky-call .whatsapp-now").click();
    const whatsappEvents = await page.evaluate(() => window.whatsappEvents);
    assert.equal(whatsappEvents.length, 2);
    assert(
      whatsappEvents.every(
        (event) =>
          event.event === "whatsapp_click" &&
          event.phone_number === "+12026434062",
      ),
    );
    assert.equal(new URL(page.url()).pathname, "/");
    assert(
      (await page.locator(".phone-link").innerText()).includes(
        "+1 202-643-4062",
      ),
    );
    console.log(
      "PASS: WhatsApp destinations, click events and international phone display; no messages sent.",
    );
    await page.locator(".faq-item summary").first().click();
    assert(
      await page
        .locator(".faq-item")
        .first()
        .evaluate((el) => el.open),
    );
    console.log(
      "PASS: call-intent events (including child clicks), no telephone navigation, FAQ disclosure.",
    );

    for (const line of fs
      .readFileSync(path.join(root, "_redirects"), "utf8")
      .split("\n")) {
      if (!line || line.startsWith("#")) continue;
      const [from, to] = line.split(/\s+/);
      await page.goto(origin + from);
      await page.waitForURL(origin + to);
      assert.equal(await page.locator("h1").count(), 1);
    }
    console.log("PASS: 9 legacy static redirects reach primary service pages.");

    if (process.env.AXE_CORE_PATH) {
      const axeSource = require(process.env.AXE_CORE_PATH).source;
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of [
          "/",
          "/contact.html",
          "/storefront-glass-repair-baltimore.html",
          "/service-areas.html",
          "/case-studies.html",
          "/blog/",
          "/locations/towson-window-glass-replacement.html",
          "/locations/canton-storefront-glass-repair.html",
          "/locations/fells-point-door-glass-repair.html",
          "/locations/white-marsh-commercial-glass.html",
          "/blog/canton-storefront-repair-access-plan.html",
          "/blog/white-marsh-commercial-glass-approval-checklist.html",
          "/blog/towson-glass-only-or-whole-window.html",
          "/blog/dundalk-board-up-to-glass-replacement.html",
          "/blog/parkville-window-condensation-between-panes.html",
          "/blog/fells-point-door-glass-before-ordering.html",
        ]) {
          await page.goto(origin + route);
          await page.addScriptTag({ content: axeSource });
          const violations = await page.evaluate(async () =>
            (
              await axe.run(document, {
                runOnly: {
                  type: "tag",
                  values: ["wcag2a", "wcag2aa", "wcag21aa"],
                },
              })
            ).violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              nodes: v.nodes.map((n) => n.target),
            })),
          );
          assert.deepEqual(
            violations,
            [],
            `${width}px ${route}: ${JSON.stringify(violations)}`,
          );
        }
      }
      console.log(
        "PASS: axe WCAG A/AA checks on 16 representative pages at mobile and desktop sizes.",
      );
    }
    assert.deepEqual(errors, [], "Browser JavaScript errors");
    assert.deepEqual(localFailures, [], "Local HTTP resource failures");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
