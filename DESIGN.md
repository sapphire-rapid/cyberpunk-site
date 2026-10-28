# DESIGN.md

## 1. Direction

**Neon-noir.** A rain-slick night city seen through a degraded monitor: Hong Kong and Tokyo signage, HUD overlays, CRT texture. The article itself names those cities as the genre's visual model. The mood is Blade Runner, with Akira red used as the alarm colour.

It is **not** purple-to-pink synthwave, glassmorphism, or a generic "AI dark mode". Surfaces are near-black and flat. Colour is rare and bright, so it reads as light.

## 2. Tokens (`src/styles/tokens.css`)

| Token | Value | Use |
|---|---|---|
| `--void` | `#05060d` | page background |
| `--ink` | `#0b0d1a` | section background |
| `--panel` | `#11142a` | cards, data card |
| `--line` | `rgba(0,229,255,0.22)` | borders, rules |
| `--text` | `#d7e3f4` | body text |
| `--muted` | `#8a96ba` | captions, metadata |
| `--cyan` | `#00e5ff` | primary accent, links, focus |
| `--magenta` | `#ff2e88` | secondary accent, glitch offset, hover |
| `--amber` | `#ffb000` | rare: warnings, signage details |
| `--alarm` | `#ff3b30` | rare: Akira-red alerts, active-section marker |

Rules:
- Body text is always `--text` on `--void` or `--ink`. Neon colours are never used for paragraph text.
- No more than two accent colours visible in any one viewport area.
- Verify contrast ≥ 4.5:1 for text and ≥ 3:1 for UI borders and focus rings. Adjust the token if it fails.
- Glow is a restricted effect: only on the hero title, active nav item, focus ring and link hover. No glow on cards by default.

## 3. Typography

Self-host via `@fontsource` (confirm the packages exist; substitute the closest equivalent if one does not).

| Role | Font | Notes |
|---|---|---|
| Display | Chakra Petch 600/700 | h1, h2, uppercase tracking on labels |
| Body | IBM Plex Sans 400/500 | long reading; 17–18px, line-height 1.7, max-width 68ch |
| Mono | JetBrains Mono 400/500 | HUD labels, sector numbers, captions, metadata |

Scale: h1 `clamp(3rem, 12vw, 9rem)`, h2 `clamp(1.8rem, 4vw, 3rem)`, h3 `1.25rem`. Mono labels are 0.75rem, uppercase, `letter-spacing: 0.14em`.

## 4. Shape and surfaces

- Corners are square. Panels use **notched corners** (`clip-path` polygon with 10px cuts) instead of border-radius.
- 1px `--line` borders. Corner brackets (small L-shaped marks) on the data card and image frames.
- Spacing on a 4px grid. Sections have generous vertical padding (`clamp(4rem, 10vw, 8rem)`).
- Subtle grain (static noise PNG/SVG, opacity ≤ 0.05) on `--void`. Never over text-heavy areas at higher opacity.

## 5. Page structure

1. **Hero** (full viewport)
2. **Lead + Data Card** (the article intro, with the infobox as a side card)
3. **Sectors** (one per article section; subsections as `h3` inside)
4. **References**
5. **Footer** (attribution, licence, image credits)

### Hero
- Canvas scene, no external images: layered skyline silhouettes (far/mid/near), randomly flickering lit windows, a few neon sign blocks in cyan/magenta/amber, diagonal rain streaks. Mild parallax from pointer (max 12px) and scroll.
- Exception: the ENTER button uses a glass (glassmorphism) treatment (GlassIcons). This is a deliberate, user-approved exception limited to that one element.
- Title **CYBERPUNK**: continuous subtle RGB-split (cyan and magenta text-shadow offset 1–2px), plus a short glitch burst (≤ 300ms) every 6–10 seconds.
- Mono subtitle: `A SUBGENRE OF SCIENCE FICTION // HIGH TECH, LOW LIFE`.
- "ENTER" scroll cue at the bottom, animated bracket.
- The canvas pauses when off-screen (IntersectionObserver), caps `devicePixelRatio` at 2, and under reduced motion renders one static frame.

### Sector navigation
- **Desktop (≥ 1024px):** fixed left rail "SECTOR INDEX". Each entry is `01 Title` in mono. The active entry gets a `--alarm` marker and cyan text. Click scrolls to the section.
- **Mobile:** slim top bar showing `SECTOR 03 / 14 — Title` and a menu button opening a full-screen overlay list. The overlay traps focus, closes on Esc and on selection, and returns focus to the button.
- Active section is tracked with IntersectionObserver. Nav items use `aria-current="true"`.

### Progress HUD
- 2px top bar showing scroll progress: cyan with a 6px magenta head. Plus the sector counter. No clock, no fake system stats.

### Sector (section) layout
- Header row: mono label `SECTOR 04` + a thin rule that draws in on reveal, then the h2.
- Body in a single 68ch column, offset to leave room for the rail on desktop.
- Blockquotes styled as "transmissions": left cyan rule, mono attribution line, slight indent.
- Tables (if any) scroll inside their own `overflow-x: auto` container.
- Inline links: cyan, underline offset 3px; hover shifts to magenta with a short glow.
- Citation markers `[n]`: small mono superscript in `--muted`; hover `--cyan`.

### Data Card (infobox)
- Styled as a case file: header `FILE // CYBERPUNK`, rows with mono labels and body values. Sticky beside the lead on desktop, above it on mobile.

### Images
- Frame with corner brackets. Default treatment: slight desaturation plus a cyan/magenta duotone overlay via `mix-blend-mode`. On hover or focus, return to natural colour.
- Caption in mono, with the credit link beneath. Lazy-load. Always set width/height to avoid layout shift.

### Footer
- Attribution block per `SPEC.md` §8. Mono, readable, not hidden or tiny. Includes the source revision and retrieval date from `meta`.

### Stretch (only if time remains, Phase 5)
- A horizontal "timeline strip" under the lead with dates that appear in the article text (e.g. 1968, 1975, 1982, 1983, 1984, 1999, 2020). Every entry must be verifiable from `content.json`.

## 6. Motion rules

- Easing: `power3.out` for entrances, `power2.inOut` for transitions.
- **Section reveal:** the rule draws in (400ms), the title decrypt/scramble plays once (≤ 700ms), the body fades up 16px (500ms). Plays once per section. It never repeats on scroll back.
- **Never animate body text** character by character, and never delay reading.
- Glitch is limited: hero title and section titles only. Never more than one glitch running at a time.
- Scanline overlay: fixed, `pointer-events: none`, opacity ≤ 0.06, and it must not cover the hero canvas at full strength.
- Lenis smooth scroll with default duration. It is disabled under reduced motion and when the nav overlay is open.
- Total animation budget: no continuous animation outside the hero canvas and the title RGB-split.

## 7. Reduced motion (`prefers-reduced-motion: reduce`)

- Lenis off. Native scroll.
- Hero canvas draws one static frame. No parallax, no rain.
- No glitch, no scramble, no reveal translations. Elements appear immediately, with an optional 150ms opacity fade.
- The RGB-split on the title becomes a static, subtle offset.

## 8. Accessibility

- Skip link to main content. Visible focus ring: 2px `--cyan` outline with 2px offset on every interactive element.
- Effects that alter text (scramble, glitch) keep the real text in the DOM, and the element has an `aria-label` with the final string.
- Semantic landmarks: `header`, `nav`, `main`, `footer`. Headings in order, with one `h1`.
- All images have meaningful `alt` from the scraper (fall back to the caption text).
- Touch targets ≥ 44px in the mobile nav.

## 9. Responsive

- 360px: single column, top bar nav, data card above the lead, hero title scales with `clamp`.
- 768px: wider gutters, larger section padding.
- ≥ 1024px: left rail, data card sticky beside the lead.
- ≥ 1536px: cap the content width. The rail and column stay centred as a group.

## 10. Don'ts

- No purple-to-pink gradient backgrounds, no frosted-glass cards, no emoji as icons.
- No Orbitron/Inter/Roboto defaults. No `rounded-2xl` card grids. No drop shadows as the main depth cue.
- No neon on paragraph text. No perpetual glow pulses on everything.
- No stock-photo or AI-generated imagery. All visuals are code-drawn, or Commons images from the article.
