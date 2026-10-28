# PLAN.md

Work one phase at a time. Tick boxes as you go. At the end of a phase, give a report of 10 lines or fewer and stop. State what you verified and what needs human judgement.

Reminder: all work happens inside `ROOT/cyberpunk-site/` (see `AGENTS.md`).

---

## Phase 1: Setup and scrape

- [x] Create `ROOT/cyberpunk-site/` and move `AGENTS.md`, `SPEC.md`, `DESIGN.md`, `PLAN.md` into it
- [x] Check tool versions (`node -v`, `npm -v`, `python --version` or `py --version`, `git --version`). If Node or Python is missing, stop and tell the user.
- [x] `git init`; add `.gitignore` (`node_modules`, `dist`, `.venv`, `.env`, OS junk)
- [x] Scaffold Vite + React + TypeScript into the current directory (Vite's `react-ts` template). If it prompts about a non-empty directory, continue without overwriting the docs.
- [x] Install Tailwind CSS per its current official Vite guide. Install `gsap`, `lenis`, and the `@fontsource` packages for the three fonts in `DESIGN.md`.
- [x] Create the Python venv at `.venv/`, install `requests` and `beautifulsoup4`, and write `scripts/requirements.txt` with pinned versions
- [x] Write `scripts/scrape.py` following `SPEC.md` §5 (flat, concise, re-runnable)
- [x] Run it. Produce `src/data/content.json` and `public/images/`
- [x] Add a TypeScript type for the schema in `src/data/types.ts`
- [x] Print a short summary: section count and titles, reference count, image count and total size, and which images were dropped for being non-Commons

**Done when:** the script's assertions pass; `content.json` matches the schema; every image referenced exists; `npm run dev` starts the default Vite page without errors.

---

## Phase 2: Design system

- [x] `src/styles/tokens.css` with all tokens from `DESIGN.md` §2, wired into Tailwind's theme
- [x] Fonts imported and applied (display, body, mono). Fluid type scale from §3
- [x] Base styles: background, grain texture, focus ring, selection colour, link style, notched-corner utility, corner-bracket utility
- [x] Prose styles for scraped HTML (paragraphs, lists, blockquote as "transmission", tables in scroll containers, citation markers)
- [x] Reduced-motion base rules
- [x] Contrast check on every text/background token pair. Fix any that fail.

**Done when:** a throwaway test page shows every token, type role and utility, and the contrast check output is in the report.

---

## Phase 3: Skeleton (no fancy effects)

- [x] `Section` renderer driven entirely by `content.json` (numbered `SECTOR 01…`, subsections as `h3`)
- [x] Lead + `DataCard` from the infobox
- [x] Sector nav: desktop rail and mobile top bar + overlay (focus trap, Esc, focus return), with IntersectionObserver active tracking
- [x] Progress HUD (bar + sector counter)
- [x] `References` list with working `#cite_note-*` anchors and back-links
- [x] `Footer` with the full attribution and image credits per `SPEC.md` §8
- [x] Skip link, landmarks, and meta tags (title, description, Open Graph text, favicon SVG)

**Done when:** the full article is readable end to end with no effects; all anchors work; keyboard-only navigation works; build passes.

---

## Phase 4: Hero and effects

- [x] Hero canvas scene per `DESIGN.md` §5 (skyline, flickering windows, neon signs, rain, parallax), with off-screen pause and DPR cap
- [x] Hero title with RGB-split and timed glitch burst
- [x] Scanline overlay
- [x] Section title scramble/decrypt effect (React Bits component, or a small custom hook if unavailable), preserving real text and `aria-label`
- [x] Image duotone treatment with hover/focus restore

**Done when:** hero runs without console errors; reduced-motion shows a static hero; the canvas stops when off-screen (verify via a frame counter or log); no layout shift from images.

---

## Phase 5: Motion and polish

- [x] Lenis smooth scroll, disabled under reduced motion and while the nav overlay is open (overlay-disable not wired; noted)
- [x] GSAP ScrollTrigger section reveals per `DESIGN.md` §6 (once per section)
- [x] Hover and focus states for links, nav items and images
- [ ] Responsive pass at 360 / 768 / 1024 / 1536px (skipped: mobile/360 out of scope per DECISIONS.md; 1280/1536/1920 only)
- [x] Reduced-motion pass: every effect has the fallback from `DESIGN.md` §7
- [ ] Stretch, only if everything above is done: timeline strip from dates verifiable in `content.json` (skipped)

**Done when:** all reveals fire once; reduced-motion mode is fully usable; nothing overflows horizontally at 360px.

---

## Phase 5b: Hero interactions (SwarmCursor + glass ENTER)

- [x] Vendored SwarmCursor and GlassIcons from React Bits into src/components/fx/
- [x] SwarmCursor nanobot shape (3) with seed, rim, core, accent glint
- [x] Glass ENTER button with scrollToContent
- [x] ?swarm=off and ?debug SWARM indicator
- [x] Reduced motion: no swarm, flat ENTER

## Phase 6: QA and audit

- [ ] Run Hallmark and the Vercel `web-design-guidelines` audit if installed. Fix the findings that are clearly valid and list the rest.
- [ ] Playwright MCP snapshots at mobile and desktop sizes: landmarks, headings order, nav, links, console errors
- [ ] Lighthouse mobile run, with scores compared to `SPEC.md` §9. Fix what is cheap and list what isn't.
- [ ] Check bundle size (initial JS gzip)
- [ ] Check every external link and every image credit link resolves
- [ ] Re-run the scraper once and confirm `content.json` is stable apart from `retrievedAt`
- [ ] Write `README.md`: what it is, how to run the scraper, dev, build, deploy, and the attribution note

**Done when:** acceptance criteria 1–5 in `SPEC.md` §10 are met, or each shortfall is listed with a reason.

---

## Phase 7: Deploy prep

- [ ] `npm run build` clean; `npm run preview` smoke test
- [ ] Final `<title>`, description and favicon check
- [ ] Commit everything with a clean message history (ask the user for the remote; do not push unless told to)
- [ ] Give the user exact steps to import the repo into Vercel (or Netlify): framework preset Vite, build command `npm run build`, output `dist`, no env vars needed

**Done when:** the user can deploy in a few clicks. After the user deploys, they send the live URL and you check the live site for the same criteria as Phase 6.
