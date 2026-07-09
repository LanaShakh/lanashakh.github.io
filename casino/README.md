# CasinoScope — Static Online Casino Review Site

A production-ready, **pure static** (HTML5 + CSS + vanilla JS) review site, built with
no framework, no build step and no npm dependencies. Optimised for classic SEO
(Google) **and** AI / generative search (GEO/AEO: AI Overviews, ChatGPT, Perplexity,
Claude, Gemini).

Everything in this folder is the deployable site. It was authored with a local Python
generator (kept outside the repo); the committed output has zero runtime dependencies.

## Live test vs production

- **Test host (now):** GitHub Pages subfolder → `https://lanashakh.github.io/casino/`
- **Production:** a dedicated domain with the site at the **root**.

### Moving to production (one find/replace)

All internal links and assets use the `/casino` path prefix and the test domain. To go
live on a dedicated domain at the root:

1. Replace the domain `https://lanashakh.github.io` → `https://YOUR-DOMAIN` in every
   file (canonical, Open Graph, `sitemap.xml`, `robots.txt`, `llms.txt`, JSON-LD).
2. Replace the path prefix `/casino/` → `/` (and `"/casino"` → `""`) in every file.
3. Move `robots.txt`, `sitemap.xml` and `llms.txt` to the **true site root** (crawlers
   only read `robots.txt`/`llms.txt` from the domain root, not a subfolder).
4. On the production root, `404.html` becomes the host's custom 404 automatically
   (GitHub Pages serves the *root* `404.html`, so a subfolder copy is test-only).

> The generator centralises these as `DOMAIN` and `BASE` constants, so a rebuild with
> `DOMAIN="https://YOUR-DOMAIN"` and `BASE=""` produces the production tree directly.

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
