# CasinoScope — Static Online Casino Review Site

A production-ready, **pure static** (HTML5 + CSS + vanilla JS) review site, built with
no framework, no build step and no npm dependencies. Optimised for classic SEO
(Google) **and** AI / generative search (GEO/AEO: AI Overviews, ChatGPT, Perplexity,
Claude, Gemini).

Everything in this folder is the deployable site. It was authored with a local Python
generator (kept outside the repo); the committed output has zero runtime dependencies.

## Viewing the site

Internal links and assets are **relative**, so the site works three ways with no
config:

- **Just open the file:** double-click `casino/index.html` — it opens in your browser
  fully styled, and you can click through every page (`file://`, no server needed).
- **Local server** (optional, closest to production): from the repo root run
  `python3 -m http.server 8000`, then open `http://localhost:8000/casino/`.
- **GitHub Pages:** merge to `main` (or point Pages at this branch) to serve it at
  `https://lanashakh.github.io/casino/`.

## Moving to production (a dedicated domain, at the root)

Because links/assets are relative, **you do not need to touch any internal paths.**
The only absolute URLs are the ones that must be absolute — `canonical`, Open Graph,
`sitemap.xml`, `robots.txt`, `llms.txt` and JSON-LD. To go live:

1. Replace the domain + base `https://lanashakh.github.io/casino` → `https://YOUR-DOMAIN`
   in those files (the generator centralises this as `DOMAIN` + `BASE`; rebuild with
   `DOMAIN="https://YOUR-DOMAIN"`, `BASE=""`).
2. Move `robots.txt`, `sitemap.xml` and `llms.txt` to the **true site root** (crawlers
   read `robots.txt`/`llms.txt` only from the domain root, not a subfolder).
3. On the production root, `404.html` becomes the host's custom 404 automatically
   (GitHub Pages serves the *root* `404.html`, so a subfolder copy is test-only).

> Note: internal links point at explicit `.../index.html` files so `file://` browsing
> works. Canonicals use clean directory URLs (`/reviews/bet365-casino/`), which is what
> search engines index.

## Pages

| Path | Type |
|------|------|
| `/casino/` | Homepage — ranked list, comparison table, cards, methodology, FAQ |
| `/casino/reviews/{brand}/` | Full review (6 brands) |
| `/casino/compare/` | Side-by-side comparison table |
| `/casino/about/` | E-E-A-T: who we are, methodology, editorial policy, team |
| `/casino/contact/` | Contact page + form (needs a handler) |
| `/casino/privacy/`, `/casino/terms/` | Legal |
| `/casino/404.html` | Not-found page (noindex) |
| `/casino/sitemap.xml`, `/casino/robots.txt`, `/casino/llms.txt` | Crawl/AI files |

## Before you publish — required checks (`TODO: verify`)

This is a **regulated (gambling) niche**. Search the tree for `TODO: verify` /
`<!-- TODO` and confirm each item. Key ones:

- **Brand facts** — founding years, operators, **licence numbers**, bonus amounts and
  wagering, payout times. These change often; verify against the operator and the
  regulator's public register before publishing.
- **Author profiles** — `Michael Turner` and `Sarah Bennett` are placeholder editorial
  personas. Replace with **real, verifiable people** (bios, photos, links) — genuine
  authorship is central to E-E-A-T in this niche.
- **Contact emails** (`hello@example.com`, `corrections@example.com`) and the contact
  **form handler** (currently `action="#"`).
- **Affiliate disclosure** — confirm your real affiliate relationships and any legally
  required wording for your jurisdiction.
- **Legal pages** — the privacy policy and terms are templates; have them reviewed by a
  qualified professional (UK/EU GDPR as applicable).
- **Images** — every brand image is a correctly-named **SVG placeholder**
  (`{brand}-logo.svg`, `{brand}-screenshot.svg`). Replace with real, optimised **WebP**
  (keep the filenames and `width`/`height`) and add `<picture>` WebP+fallback sources.
- **Responsible gambling / licensing** — 18+ and safer-gambling notices are included;
  confirm they meet your market's advertising rules.

## Technical notes

- Critical CSS is inlined in each `<head>`; the full stylesheet loads non-blocking with
  a `<noscript>` fallback. Content never depends on JS (FAQ uses native `<details>`; the
  mobile menu degrades to a visible list without JS).
- One shared `css/style.css`, one deferred `js/main.js` (mobile menu only).
- Every page: one `<h1>`, unique title/description, canonical, Open Graph + Twitter,
  breadcrumbs (visible + `BreadcrumbList`), visible "Last updated", JSON-LD.
- Total page weight is well under 500 KB (whole site ≈ 400 KB including all assets).
