// Build-time SEO pre-rendering for the GetHome SPA (runs after `vite build`).
//
// Google and WhatsApp previews read static HTML, which a pure SPA does not have. This script writes
// real HTML files into dist/ for location landing pages (/rent/lagos/, /buy/abuja/, /shortlets/...)
// plus hub pages and sitemap.xml. Netlify serves existing files before the SPA catch-all rewrite.
//
// Rules:
//  - A location page is generated only where real listings exist (no empty "doorway" pages).
//  - Only public, non-sensitive listing fields are used.
//  - This script NEVER fails the build: on any error it logs and leaves the plain SPA in place.
//
// Humans who land on a pre-rendered page are moved to the equivalent app URL (/?tab=rent&city=Lagos)
// before the app boots, so the app opens already filtered. The canonical tag keeps the static URL.
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://trygethome.online';
const API = (process.env.VITE_API_URL || 'https://gethome-backend-7ocr.onrender.com').replace(/\/$/, '');
const DIST = path.resolve('dist');
const MAX_LISTINGS_PER_PAGE = 12;

const PURPOSES = {
  rent:      { path: 'rent',      tab: 'rent',     api: 'rent',     label: 'for rent',     noun: 'Properties for rent' },
  sale:      { path: 'buy',       tab: 'sale',     api: 'sale',     label: 'for sale',     noun: 'Properties for sale' },
  shortlet:  { path: 'shortlets', tab: 'shortlet', api: 'shortlet', label: 'as shortlets', noun: 'Shortlet apartments' },
};

import { cityOf } from '../src/constants/cityAreas.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const money = (sym, n) => (sym || '₦') + Number(n).toLocaleString('en-NG');

const matchCity = cityOf; // same city/area matching as the app's filter

async function fetchListings() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 90000); // Render free instances can take ~60s to wake
      const r = await fetch(API + '/api/properties?country=NG', { signal: ctl.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      const arr = Array.isArray(j) ? j : (j.properties || []);
      // Whitelist public fields only; never copy depositor, commission, payment or contact columns.
      return arr
        .filter((p) => !p.is_deleted && !p.is_sold)
        .map((p) => ({
          id: p.id, title: p.title, location: p.location, purpose: p.purpose, type: p.property_type,
          beds: p.bedrooms, baths: p.bathrooms, rent: p.rent, price: p.price, night: p.cost_per_night,
          sym: p.currency_symbol, img: p.image_url, featured: !!p.is_featured, created: p.created_at,
        }));
    } catch (e) {
      console.warn('[seo] listings fetch attempt ' + attempt + ' failed: ' + e.message);
    }
  }
  return null;
}

function priceOf(p) {
  if (p.purpose === 'shortlet') return p.night ? { v: p.night, unit: '/night' } : null;
  if (p.purpose === 'sale') return (p.price || p.rent) ? { v: p.price || p.rent, unit: '' } : null;
  return (p.rent || p.price) ? { v: p.rent || p.price, unit: '/year' } : null;
}

function page(template, o) {
  let h = template;
  const set = (re, val) => { h = h.replace(re, () => val); };
  set(/<title>[\s\S]*?<\/title>/, '<title>' + esc(o.title) + '</title>');
  set(/<meta name="description"[^>]*>/, '<meta name="description" content="' + esc(o.description) + '" />');
  set(/<link rel="canonical"[^>]*>/, '<link rel="canonical" href="' + o.url + '" />');
  set(/<meta property="og:url"[^>]*>/, '<meta property="og:url" content="' + o.url + '" />');
  set(/<meta property="og:title"[^>]*>/, '<meta property="og:title" content="' + esc(o.title) + '" />');
  set(/<meta property="og:description"[^>]*>/, '<meta property="og:description" content="' + esc(o.description) + '" />');
  set(/<meta name="twitter:title"[^>]*>/, '<meta name="twitter:title" content="' + esc(o.title) + '" />');
  set(/<meta name="twitter:description"[^>]*>/, '<meta name="twitter:description" content="' + esc(o.description) + '" />');
  if (o.ogImage) set(/<meta property="og:image"[^>]*>/, '<meta property="og:image" content="' + esc(o.ogImage) + '" />');
  const ld = o.jsonld.map((j) => '<script type="application/ld+json">' + JSON.stringify(j).replace(/</g, '\\u003c') + '</script>').join('');
  // Before the app boots, move people to the equivalent filtered app URL. Crawlers keep the static page.
  const boot = o.appUrl ? '<script>try{if(!/bot|crawl|spider|slurp|facebookexternalhit|whatsapp/i.test(navigator.userAgent)){history.replaceState(null,"",' + JSON.stringify(o.appUrl) + ')}}catch(e){}</script>' : '';
  h = h.replace('</head>', () => ld + boot + '</head>');
  h = h.replace(/<div id="root"><\/div>/, () => '<div id="root"><main style="max-width:860px;margin:0 auto;padding:24px 16px;font-family:system-ui,sans-serif;color:#1a1a1a">' + o.body + '</main></div>');
  return h;
}

function listingCard(p, appUrl) {
  const pr = priceOf(p);
  const facts = [p.type, p.beds ? p.beds + ' bed' : null, p.baths ? p.baths + ' bath' : null].filter(Boolean).join(' · ');
  return '<li style="margin:0 0 16px;list-style:none;display:flex;gap:12px">' +
    (p.img ? '<img src="' + esc(p.img) + '" alt="' + esc((p.title || 'Property') + ' in ' + (p.location || '')) + '" width="120" height="90" loading="lazy" style="object-fit:cover;border-radius:8px">' : '') +
    '<div><a href="' + esc(appUrl) + '" style="font-weight:700;color:#0a2240;text-decoration:none">' + esc(p.title) + '</a><br>' +
    '<span>' + esc(p.location || '') + '</span>' + (facts ? '<br><span style="color:#475569">' + esc(facts) + '</span>' : '') +
    (pr ? '<br><strong>' + esc(money(p.sym, pr.v)) + esc(pr.unit) + '</strong>' : '') + '</div></li>';
}

function crumbs(items) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: it[1] })) };
}

function build() {
  return (async () => {
    const indexPath = path.join(DIST, 'index.html');
    if (!fs.existsSync(indexPath)) { console.warn('[seo] dist/index.html missing; skipping'); return; }
    const template = fs.readFileSync(indexPath, 'utf8');
    const listings = await fetchListings();
    if (!listings) { console.warn('[seo] no listing data available; leaving the plain SPA (sitemap will list only the home page)'); }
    const today = new Date().toISOString().slice(0, 10);
    const urls = [{ loc: SITE + '/', lastmod: today, priority: '1.0' }];
    let generated = 0;

    if (listings && listings.length) {
      // group: purpose -> city -> listings
      const groups = {};
      for (const p of listings) {
        const purpose = PURPOSES[p.purpose] ? p.purpose : null;
        const city = matchCity(p.location);
        if (!purpose || !city) continue;
        ((groups[purpose] = groups[purpose] || {})[city] = groups[purpose][city] || []).push(p);
      }
      for (const [purposeKey, byCity] of Object.entries(groups)) {
        const P = PURPOSES[purposeKey];
        const cityNames = Object.keys(byCity).sort((a, b) => byCity[b].length - byCity[a].length);

        for (const city of cityNames) {
          const list = byCity[city].slice().sort((a, b) => (b.featured - a.featured) || (new Date(b.created) - new Date(a.created)));
          const url = SITE + '/' + P.path + '/' + slug(city) + '/';
          const appUrl = '/?tab=' + P.tab + '&city=' + encodeURIComponent(city);
          const prices = list.map((p) => (priceOf(p) || {}).v).filter(Boolean).sort((a, b) => a - b);
          const sym = list[0].sym;
          const range = prices.length ? ' Prices from ' + money(sym, prices[0]) + (prices.length > 1 && prices[prices.length - 1] !== prices[0] ? ' to ' + money(sym, prices[prices.length - 1]) : '') + '.' : '';
          const title = P.noun + ' in ' + city + ' | GetHome';
          const description = list.length + ' verified ' + (list.length === 1 ? 'listing' : 'listings') + ' ' + P.label + ' in ' + city + ', Nigeria.' + range + ' Browse photos and fees on GetHome.';
          const others = cityNames.filter((c) => c !== city).slice(0, 8)
            .map((c) => '<a href="/' + P.path + '/' + slug(c) + '/">' + esc(P.noun) + ' in ' + esc(c) + '</a>').join(' · ');
          const body =
            '<nav style="font-size:.85rem;color:#64748b"><a href="/">GetHome</a> › <a href="/' + P.path + '/">' + esc(P.noun) + '</a> › ' + esc(city) + '</nav>' +
            '<h1 style="color:#0a2240">' + esc(P.noun) + ' in ' + esc(city) + '</h1>' +
            '<p>' + esc(description) + '</p>' +
            '<ul style="padding:0">' + list.slice(0, MAX_LISTINGS_PER_PAGE).map((p) => listingCard(p, appUrl)).join('') + '</ul>' +
            '<p><a href="' + appUrl + '" style="display:inline-block;padding:12px 22px;background:#27ae60;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">See all ' + esc(P.label) + ' in ' + esc(city) + ' on GetHome</a></p>' +
            '<h2>About listings on GetHome</h2><p>GetHome connects property seekers with verified real estate agents and agencies across Nigeria. Properties are physically inspected by verified agents, fees are shown up front, and you can book an inspection directly on the platform.</p>' +
            (others ? '<h2>More locations</h2><p>' + others + '</p>' : '');
          const out = page(template, {
            title, description, url, appUrl, body, ogImage: list[0].img,
            jsonld: [crumbs([['GetHome', SITE + '/'], [P.noun, SITE + '/' + P.path + '/'], [city, url]])],
          });
          const dir = path.join(DIST, P.path, slug(city));
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, 'index.html'), out);
          urls.push({ loc: url, lastmod: today, priority: '0.8' });
          generated++;
        }

        // Hub page for this purpose
        const hubUrl = SITE + '/' + P.path + '/';
        const total = cityNames.reduce((n, c) => n + byCity[c].length, 0);
        const hubDesc = total + ' verified ' + P.label + ' listings across ' + cityNames.length + (cityNames.length === 1 ? ' city' : ' cities') + ' in Nigeria. Choose a location to browse on GetHome.';
        const hubBody =
          '<nav style="font-size:.85rem;color:#64748b"><a href="/">GetHome</a> › ' + esc(P.noun) + '</nav>' +
          '<h1 style="color:#0a2240">' + esc(P.noun) + ' in Nigeria</h1><p>' + esc(hubDesc) + '</p>' +
          '<ul>' + cityNames.map((c) => '<li><a href="/' + P.path + '/' + slug(c) + '/">' + esc(P.noun) + ' in ' + esc(c) + '</a> (' + byCity[c].length + ')</li>').join('') + '</ul>' +
          '<p><a href="/?tab=' + P.tab + '">Browse everything ' + esc(P.label) + ' on GetHome</a></p>';
        const hubOut = page(template, { title: P.noun + ' in Nigeria | GetHome', description: hubDesc, url: hubUrl, appUrl: '/?tab=' + P.tab, body: hubBody, jsonld: [crumbs([['GetHome', SITE + '/'], [P.noun, hubUrl]])] });
        fs.mkdirSync(path.join(DIST, P.path), { recursive: true });
        fs.writeFileSync(path.join(DIST, P.path, 'index.html'), hubOut);
        urls.push({ loc: hubUrl, lastmod: today, priority: '0.9' });
        generated++;
      }
    }

    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map((u) => '  <url><loc>' + esc(u.loc) + '</loc><lastmod>' + u.lastmod + '</lastmod><priority>' + u.priority + '</priority></url>').join('\n') + '\n</urlset>\n';
    fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml);
    console.log('[seo] generated ' + generated + ' landing pages; sitemap has ' + urls.length + ' URLs');
  })();
}

build().catch((e) => { console.warn('[seo] skipped due to error: ' + e.message); });
