# SPEC.md (product + technical spec)

## 1. Goal

A single-page, heavily stylised cyberpunk information site. The content is the Wikipedia article "Cyberpunk", scraped once at build time and rendered through our own design. It is a learning and portfolio project, deployed to a free host subdomain (e.g. `*.vercel.app`).

## 2. Scope

**In scope**
- A one-time scrape of the article into `content.json` plus local images
- One long page: hero, sector navigation, the article sections, references, footer with attribution
- Motion and visual effects described in `DESIGN.md`
- Static deploy

**Non-goals**
- No backend, database, accounts, CMS, search, comments or analytics
- No live Wikipedia fetching in the browser. The scrape is run manually by us.
- No routing. One page with anchor sections.
- No rewriting, summarising or translating of Wikipedia text

## 3. Stack

| Layer | Choice |
|---|---|
| Build | Vite + React + TypeScript (strict) |
| Styling | Tailwind CSS (use the official Vite plugin install; check current docs) |
| Animation | GSAP + ScrollTrigger; Lenis for smooth scroll |
| Effects | React Bits components, copied into `src/components/fx/` per its docs. Fall back to small custom hooks if unavailable. Vendored: SwarmCursor, GlassIcons (Phase 5b). |
| Fonts | Self-hosted via `@fontsource/*` (no Google Fonts link) |
| Scraper | Python 3, `requests` + `beautifulsoup4`, in a local `.venv` |
| Hosting | GitHub repo, then Vercel or Netlify free tier (the user does the account steps) |

Do not add other dependencies without asking. Prefer widely used packages and review any install scripts before running.

## 4. Repo layout

```
cyberpunk-site/
  AGENTS.md SPEC.md DESIGN.md PLAN.md DECISIONS.md README.md
  scripts/scrape.py
  scripts/requirements.txt
  .venv/                      (gitignored)
  public/images/              (downloaded Commons images)
  src/
    data/content.json         (scraper output, committed)
    components/               (Hero, Nav, Section, DataCard, References, Footer ...)
    components/fx/            (React Bits / custom effects)
    lib/                      (hooks, helpers)
    styles/tokens.css
    App.tsx  main.tsx
  index.html  package.json  vite.config.ts
```

## 5. Scrape pipeline (`scripts/scrape.py`)

1. Request the MediaWiki API: `https://en.wikipedia.org/w/api.php?action=parse&page=Cyberpunk&prop=text|sections|revid&format=json&formatversion=2&redirects=1` with a descriptive `User-Agent` (project name plus a contact placeholder the user fills in).
2. Parse `parse.text` with BeautifulSoup.
3. **Remove:** edit-section links, navboxes, hatnotes, `style`/`script` tags, empty-element placeholders, maintenance and "citation needed" clutter, the TOC.
4. **Extract the infobox** (`table.infobox` or equivalent) into `{label, value_html}` rows, then remove it from the body.
5. **Split into sections** at each `h2`, with `h3` as subsections. The lead (before the first heading) becomes `lead`.
6. **Drop from `sections`** and put in `references`: "References", "Notes", "Citations". **Keep** "Further reading" and "External links" as normal sections. Drop "See also" only if it is a bare link list with nothing useful.
7. **Sanitise with an allowlist.** Tags: `p a b i em strong ul ol li blockquote figure figcaption img sup sub br span table thead tbody tr th td h3 h4`. Attributes: `href src alt id width height` only. Drop everything else, including inline styles and classes.
8. **Links:** make `/wiki/...` links absolute (`https://en.wikipedia.org/wiki/...`). Leave in-page `#cite_note-*` links as they are.
9. **Images:** keep only images whose source path contains `/wikipedia/commons/`. Drop `/wikipedia/en/` images, because those are usually non-free files that are only allowed on Wikipedia itself. Skip images narrower than 120px and skip icons/flags. Download the kept images to `public/images/`, rewrite `src` to `/images/<name>`, and record the Commons file page URL for each in the manifest.
10. **Write** `src/data/content.json` (schema below). End the script with simple assertions: lead is non-empty, there are at least 8 sections, there are references, and every image path in the HTML exists on disk.

The script must be re-runnable and overwrite its outputs.

## 6. `content.json` schema

```json
{
  "meta": {
    "title": "Cyberpunk",
    "sourceUrl": "https://en.wikipedia.org/wiki/Cyberpunk",
    "revisionId": 0,
    "retrievedAt": "ISO-8601",
    "license": { "name": "CC BY-SA 4.0", "url": "https://creativecommons.org/licenses/by-sa/4.0/" }
  },
  "lead": "<p>...</p>",
  "infobox": { "rows": [ { "label": "Features", "valueHtml": "..." } ] },
  "sections": [
    {
      "id": "slug",
      "title": "Section title",
      "html": "<p>... (content before the first h3)</p>",
      "subsections": [ { "id": "slug", "title": "...", "html": "..." } ]
    }
  ],
  "references": [ { "id": "cite_note-1", "html": "..." } ],
  "images": [ { "local": "/images/x.jpg", "alt": "", "commonsUrl": "https://commons.wikimedia.org/wiki/File:..." } ]
}
```

Section `id` values must be unique, URL-safe slugs. They drive the nav and anchor links.

## 7. Rendering rules

- Section and lead HTML is trusted, because our scraper sanitised it at build time. It is rendered with `dangerouslySetInnerHTML` inside styled prose containers. No runtime HTML from anywhere else.
- External links open in a new tab with `rel="noopener noreferrer"`.
- Sections are numbered `SECTOR 01…` in order. The nav, the progress HUD and the anchors all derive from `content.json`. Nothing is hardcoded per section.
- The page has exactly one `h1` (the hero).

## 8. Licensing and attribution (required)

- The article text is CC BY-SA 4.0. The footer must state that the content is from Wikipedia, link to the source article and its revision, link to the licence, say the text was reformatted but not reworded, and link to the article history for authors.
- The site must also say it is not affiliated with or endorsed by Wikipedia or the Wikimedia Foundation.
- Every displayed image needs a credit link to its Commons file page, either under the image or in an "Image credits" list in the footer.
- Do not reuse Wikipedia/Wikimedia logos or marks.

## 9. Targets

- Mobile Lighthouse: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90
- Initial JS ≤ 250 KB gzip. Images lazy-loaded with width/height set. Hero canvas pauses when off-screen.
- Works at 360px wide through 1920px. Keyboard-navigable. Honours `prefers-reduced-motion`.

## 10. Acceptance criteria

1. `npm run build` passes with no errors or warnings that matter, and `dist/` serves correctly with `npm run preview`.
2. All article sections render, in order, with no raw tags, broken images or dead anchors.
3. The footer attribution and image credits are present and the links work.
4. Reduced-motion mode shows a fully usable, static version of the site.
5. Lighthouse targets in §9 are met, or the shortfalls are listed in the Phase 6 report.
6. The site is live at a free host URL.

## 11. References

- Hallmark: https://github.com/nutlope/hallmark
- Vercel web design guidelines: https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md
- React Bits: https://github.com/DavidHDev/react-bits
- Lenis: https://github.com/darkroomengineering/lenis
- Playwright MCP: https://github.com/microsoft/playwright-mcp
- DESIGN.md pattern: https://github.com/voltagent/awesome-design-md
