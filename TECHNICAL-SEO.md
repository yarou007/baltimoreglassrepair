# Site maintenance and validation

## Development

This is a static HTML/CSS/JavaScript website. No application dependencies or build step are required.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
python3 scripts/check_site.py
node --check js/main.js
```

`python3 scripts/check_site.py` validates all HTML files, the sole phone destination, absence of forms, local resource paths and fragments, structured-data syntax, canonical sitemap coverage and redirect consistency.

## Contact and content contract

- The only contact number is **+1 202-643-4062**, linked as `tel:+12026434062`.
- The site is phone and WhatsApp: no email links, forms or callback submission flow.
- Do not add ratings, reviews, credentials, insurance claims, warranties, affiliations or response-time promises without verified business information.
- Existing photos are presented without invented client names, locations, dates or project outcomes.
- Titles, descriptions, Open Graph metadata and structured data must describe visible content. FAQ schema is not a guarantee of Google rich results.

## Canonical service routes

`vercel.json` defines nine permanent HTTP 308 redirects for the repository’s Vercel deployment. `_redirects` defines equivalent HTTP 301 redirects for Netlify and Cloudflare Pages. Each retired HTML file also contains a canonical and immediate meta refresh for static hosts that do not read that file. Meta refresh is a fallback, not an HTTP 301. For another hosting provider, configure equivalent server redirects and verify their actual response status before release. Do not reintroduce retired URLs in navigation or the sitemap.

The sitemap contains the 62 canonical content pages, excluding retired routes and the Google verification file. Preserve the Google verification file. The canonical origin is `https://www.baltimoreglassrepair.com`.

## Images and mobile behavior

Photos use WebP derivatives in `images/optimized/`, responsive `srcset`, dimensions and lazy loading below the hero. Original images remain available. The first hero image is loaded eagerly with high priority. Navigation supports Escape, outside click, resize and focus leaving the menu. The mobile call bar has reserved document space and safe-area padding. Desktop has no floating call overlay.

## Call intent measurement

The existing Ahrefs pageview script is included consistently on content pages. `js/main.js` also pushes a `phone_click` event to `window.dataLayer` and dispatches a `phone-click` CustomEvent. The payload includes `phone_number`, `call_location` and `page_path`. Telephone navigation is never delayed or prevented.

These events expose call intent to an analytics integration; dataLayer alone does not send data to a dashboard. No new analytics property, tag-manager ID, tracking number or reporting backend is invented. Actual connected calls, qualified leads, booked jobs and revenue require phone/CRM reporting. No personal customer data is collected by this event.

## Browser regression checks

With Playwright available, run `node scripts/check_browser.cjs` against the running local server. Set `SITE_URL` if using another local port. Optional accessibility checks run when `AXE_CORE_PATH` points to an installed axe-core package. Development tooling can be installed outside the checkout:

```sh
npm install --prefix /tmp/glass-dev-tools --cache /tmp/glass-npm-cache --no-package-lock --no-audit --no-fund playwright axe-core
NODE_PATH=/tmp/glass-dev-tools/node_modules AXE_CORE_PATH=/tmp/glass-dev-tools/node_modules/axe-core node scripts/check_browser.cjs
```

The checks block external requests and prevent telephone navigation. They test local rendering, menus, keyboard closure, call events and retired-page navigation. They do not place calls or establish live search performance.

## Release and external accounts

After deployment, verify HTTPS and HTTP redirect behavior on the actual host, submit the canonical sitemap in Google Search Console, and update the real Google Business Profile and business listings to the new number. Those account changes require access to the corresponding accounts. Keep service-area business details accurate; do not invent a street address or a map pin.

## WhatsApp

Direct chats use `https://wa.me/12026434062`. WhatsApp opens its app or web interface; no message is sent automatically. The receiving number must be registered with WhatsApp. `whatsapp_click` dataLayer events and `whatsapp-click` CustomEvents measure click intent only.
