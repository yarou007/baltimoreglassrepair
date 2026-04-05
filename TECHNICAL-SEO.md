# Technical SEO implementation — Baltimore Glass Repair

## Implemented in this build

- **Semantic HTML5**: `header`, `nav`, `main`, `article`, `section`, `footer`; one H1 per page; logical H2/H3.
- **Title & meta description**: Unique per page; primary intent in first 50–60 chars of titles where possible.
- **Canonical**: `<link rel="canonical" href="https://baltimoreglassrepair.com/...">` on each HTML page.
- **Open Graph / Twitter**: Homepage and key pages include `og:title`, `og:description`, `og:url`, `og:image`, `twitter:card`.
- **LocalBusiness JSON-LD**: Homepage (`@id` `#business`); telephone `+1-703-244-0559`; `areaServed`; 24/7 `openingHoursSpecification`.
- **Service schema**: Commercial hub includes `Service` + `BreadcrumbList`.
- **FAQPage JSON-LD**: `/faq.html` with selected questions mirrored in visible content.
- **Article JSON-LD**: Sample on flagship blog post; replicate pattern for new posts.
- **BreadcrumbList**: In JSON-LD on commercial hub; visible breadcrumbs sitewide.
- **robots.txt**: Allows all; points to `sitemap.xml`.
- **sitemap.xml**: Lists index, service pages, blog index, posts, locations.
- **Mobile-first CSS**: Sticky bottom call bar on small screens; tap targets ≥ 48px; `skip-link`.
- **Performance**: `loading="lazy"` on below-fold images; `fetchpriority="high"` on hero; descriptive `width`/`height` to reduce CLS.
- **Accessibility**: Focus states; `aria-label` on nav; `aria-current` on active nav where set.

## Recommended next steps (production)

1. **HTTPS** everywhere; redirect HTTP→HTTPS; HSTS after validation.
2. **Compress images**: WebP/AVIF derivatives for photos; keep JPEG fallbacks if needed.
3. **Embed real map** on `/contact.html` matching Google Business Profile address pin.
4. **Wire contact form** POST to CRM/email; add honeypot or CAPTCHA if spam appears.
5. **Google Search Console**: Verify property; submit `sitemap.xml`.
6. **GBP**: Align categories, hours, phone with `/citations.html` NAP.
7. **Review link in Article schema**: Add `dateModified` when content updates.
8. **hreflang**: Not required for single-locale US site.

## Schema maintenance

- When adding blog posts: include `Article` or `BlogPosting` with `headline`, `datePublished`, `author`, `publisher` logo URL if available.
- When expanding FAQs: duplicate new Q&A pairs into `FAQPage` JSON-LD to match visible copy.
