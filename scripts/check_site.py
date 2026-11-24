#!/usr/bin/env python3
"""Dependency-free checks for the static site's SEO and phone and WhatsApp contract."""
import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://www.baltimoreglassrepair.com'
PHONE = 'tel:+12026434062'
WHATSAPP = 'https://wa.me/12026434062'


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.tags = []
        self.ids = []
        self.schemas = []
        self.schema = None
        self.title = ''
        self.in_title = False
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.schema = ''
        if tag == 'title':
            self.in_title = True

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_data(self, data):
        if self.schema is not None:
            self.schema += data
        if self.in_title:
            self.title += data

    def handle_endtag(self, tag):
        if tag == 'script' and self.schema is not None:
            self.schemas.append(self.schema)
            self.schema = None
        if tag == 'title':
            self.in_title = False

    def select(self, tag):
        return [a for t, a in self.tags if t == tag]

    @property
    def redirect(self):
        return next((a for a in self.select('meta') if a.get('http-equiv', '').lower() == 'refresh'), None)


pages = {p: Page(p) for p in ROOT.rglob('*.html') if '.git' not in p.parts}
errors = []


def check(condition, page, message):
    if not condition:
        errors.append(f'{page.relative_to(ROOT)}: {message}')


for path, page in pages.items():
    if path.name.startswith('google'):
        continue
    source = path.read_text()
    check(not re.search(r'703[- ]?244[- ]?0559|17032440559|mailto:|<form\b|placeholder=', source, re.I), path, 'old contact details, form or placeholder')
    check(not any(t in ('form', 'input', 'textarea') for t, _ in page.tags), path, 'phone and WhatsApp site must not contain forms')
    check(not any(n > 1 for n in Counter(page.ids).values()), path, 'duplicate IDs')
    canonical = [a for a in page.select('link') if a.get('rel') == 'canonical']
    check(len(canonical) == 1, path, 'must have one canonical URL')
    if not page.redirect:
        for tag in ('main', 'h1', 'title'):
            check(len(page.select(tag)) == 1, path, f'must have exactly one {tag}')
        check(bool(page.title.strip()), path, 'empty title')
        check(len([a for a in page.select('meta') if a.get('name') == 'description' and a.get('content')]) == 1, path, 'missing/duplicate description')
        check(any(a.get('href') == PHONE for a in page.select('a')), path, 'missing call action')
        check(any(a.get('href') == WHATSAPP for a in page.select('a')), path, 'missing WhatsApp action')
        check(not re.search(r'(?<!\+1 )(?<!\+1-)202-643-4062', source), path, 'displayed number missing country code')
        check(any(a.get('aria-label') for a in page.select('button')), path, 'navigation needs an accessible button name')
        for schema in page.schemas:
            try:
                json.loads(schema)
            except ValueError:
                errors.append(f'{path.name}: invalid structured data')
    for tag, attrs in page.tags:
        if attrs.get('aria-controls'):
            check(attrs['aria-controls'] in page.ids, path, 'missing aria-controls target')
        if tag == 'img':
            check(bool(attrs.get('alt')), path, 'image missing descriptive alt')
        references = [attrs[k] for k in ('href', 'src') if attrs.get(k)]
        if attrs.get('srcset'):
            references.extend(x.strip().split()[0] for x in attrs['srcset'].split(','))
        for reference in references:
            u = urlsplit(reference)
            if u.scheme == 'tel':
                check(reference == PHONE, path, f'unexpected phone: {reference}')
            if u.hostname == 'wa.me':
                check(reference == WHATSAPP, path, f'unexpected WhatsApp destination: {reference}')
            if u.scheme or u.netloc:
                continue
            target = ROOT / unquote(u.path).lstrip('/') if u.path.startswith('/') else path.parent / unquote(u.path) if u.path else path
            if target.is_dir():
                target /= 'index.html'
            check(target.is_file(), path, f'missing local resource: {reference}')
            if target in pages:
                if u.fragment:
                    check(unquote(u.fragment) in pages[target].ids, path, f'missing fragment: {reference}')
                if not page.redirect:
                    check(not pages[target].redirect, path, f'link points to retired page: {reference}')

ns = {
    's': 'http://www.sitemaps.org/schemas/sitemap/0.9',
    'image': 'http://www.google.com/schemas/sitemap-image/1.1',
}
sitemap_path = ROOT / 'sitemap.xml'
sitemap_urls = ET.parse(sitemap_path).findall('s:url', ns)
locations = [entry.findtext('s:loc', namespaces=ns) for entry in sitemap_urls]
check(len(locations) == len(set(locations)), ROOT / 'sitemap.xml', 'duplicate sitemap URLs')
expected = set()
for path, page in pages.items():
    if page.redirect or path.name.startswith('google'):
        continue
    route = path.relative_to(ROOT).as_posix()
    if path.name == 'index.html':
        route = route.removesuffix('index.html')
    canonical = f'{BASE}/{route}'
    canonical_links = [a.get('href') for a in page.select('link') if a.get('rel') == 'canonical']
    check(canonical_links == [canonical], path, f'canonical must be {canonical}')
    expected.add(canonical)
check(set(locations) == expected, ROOT / 'sitemap.xml', 'sitemap must match canonical pages')
gallery = pages[ROOT / 'case-studies.html']
gallery_images = {BASE + img['src'] for img in gallery.select('img') if img.get('src', '').startswith('/images/')}
gallery_url = BASE + '/case-studies.html'
gallery_listed = [
    image.text
    for entry in sitemap_urls if entry.findtext('s:loc', namespaces=ns) == gallery_url
    for image in entry.findall('image:image/image:loc', ns)
]
check(bool(gallery_listed) and set(gallery_listed) == gallery_images, sitemap_path, 'gallery image entries must match its displayed images')
check(len(gallery_listed) == len(set(gallery_listed)), sitemap_path, 'duplicate gallery image entries')
redirect_pairs = []
for line in (ROOT / '_redirects').read_text().splitlines():
    if not line or line.startswith('#'):
        continue
    old, new, status = line.split()
    source = pages[ROOT / old.lstrip('/')]
    target = pages[ROOT / new.lstrip('/')]
    check(status == '301' and not target.redirect, ROOT / '_redirects', 'redirect chain or invalid status')
    check(source.redirect['content'] == '0;url=' + new, source.path, 'static fallback differs from permanent redirect')
    check([a.get('href') for a in source.select('link') if a.get('rel') == 'canonical'] == [BASE + new],
          source.path, 'redirect page canonical differs from permanent redirect')
    redirect_pairs.append((old, new))
vercel_path = ROOT / 'vercel.json'
vercel_redirects = json.loads(vercel_path.read_text())['redirects']
vercel_pairs = [(rule['source'], rule['destination']) for rule in vercel_redirects if rule.get('permanent') is True]
check(len(vercel_pairs) == len(vercel_redirects) and Counter(vercel_pairs) == Counter(redirect_pairs),
      vercel_path, 'permanent redirects must match _redirects')

if errors:
    print('\n'.join(errors))
    sys.exit(1)
print(f'PASS: {len(pages)} HTML pages, {len(expected)} canonical URLs, {len(gallery_listed)} gallery images and {len(redirect_pairs)} permanent redirects. Contact links, local resources and structured data checked.')
