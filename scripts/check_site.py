#!/usr/bin/env python3
"""Dependency-free checks for the static site's SEO and phone-only contract."""
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
    check(not any(t in ('form', 'input', 'textarea') for t, _ in page.tags), path, 'phone-only site must not contain forms')
    check(not any(n > 1 for n in Counter(page.ids).values()), path, 'duplicate IDs')
    canonical = [a for a in page.select('link') if a.get('rel') == 'canonical']
    check(len(canonical) == 1, path, 'must have one canonical URL')
    if not page.redirect:
        for tag in ('main', 'h1', 'title'):
            check(len(page.select(tag)) == 1, path, f'must have exactly one {tag}')
        check(bool(page.title.strip()), path, 'empty title')
        check(len([a for a in page.select('meta') if a.get('name') == 'description' and a.get('content')]) == 1, path, 'missing/duplicate description')
        check(any(a.get('href') == PHONE for a in page.select('a')), path, 'missing call action')
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

ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
locations = [el.text for el in ET.parse(ROOT / 'sitemap.xml').findall('s:url/s:loc', ns)]
check(len(locations) == len(set(locations)), ROOT / 'sitemap.xml', 'duplicate sitemap URLs')
expected = set()
for path, page in pages.items():
    if page.redirect or path.name.startswith('google'):
        continue
    canonical = next(a['href'] for a in page.select('link') if a.get('rel') == 'canonical')
    expected.add(canonical)
check(set(locations) == expected, ROOT / 'sitemap.xml', 'sitemap must match canonical pages')
for line in (ROOT / '_redirects').read_text().splitlines():
    if not line or line.startswith('#'):
        continue
    old, new, status = line.split()
    source = pages[ROOT / old.lstrip('/')]
    target = pages[ROOT / new.lstrip('/')]
    check(status == '301' and not target.redirect, ROOT / '_redirects', 'redirect chain or invalid status')
    check(source.redirect['content'] == '0;url=' + new, source.path, 'static fallback differs from permanent redirect')

if errors:
    print('\n'.join(errors))
    sys.exit(1)
print(f'PASS: {len(pages)} HTML pages; {len(expected)} canonical sitemap URLs; phone links, local resources, fragments, structured data and redirects checked.')
