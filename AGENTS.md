# AGENTS.md

You are building a static, heavily stylised cyberpunk information site. Its content is the Wikipedia article "Cyberpunk" (https://en.wikipedia.org/wiki/Cyberpunk), scraped once and rendered as our own page.

Read this file fully, then `SPEC.md`, `DESIGN.md` and `PLAN.md`, before doing anything else.

## First action

1. Note the folder you are currently operating in. Call it ROOT.
2. Create a new directory `ROOT/cyberpunk-site/`. If it already exists and is not empty, stop and ask the user.
3. Move `AGENTS.md`, `SPEC.md`, `DESIGN.md` and `PLAN.md` from ROOT into `cyberpunk-site/`.
4. From now on, every command, file and install lives inside `cyberpunk-site/`. Never scaffold into ROOT itself, and never touch anything else in ROOT.

## How to work

- **One phase at a time.** `PLAN.md` lists the phases. Do only the phase the user names. When it is done, tick its boxes in `PLAN.md`, report in 10 lines or fewer (what was done, what failed, what you could not verify), and stop. Wait for the user to name the next phase.
- **Do not guess silently.** If the docs don't cover something, pick the simplest option, and append one line to `DECISIONS.md` (create it if missing) saying what you chose and why.
- **Stay in scope.** Only dependencies named in `SPEC.md` may be installed. Ask before adding any other package. Check each package's current official install docs instead of relying on memory, and pin the versions that actually get installed.
- **Safe commands only.** No destructive commands outside `cyberpunk-site/`. No force-pushes. No secrets or tokens in files. Network access only to en.wikipedia.org, upload.wikimedia.org, the npm registry and PyPI.
- **Never rewrite Wikipedia's text.** You may restructure and sanitise the HTML. You may not paraphrase, summarise or "improve" the wording.
- **OS awareness.** Detect the OS before running shell commands. Python venv activation differs between Windows and macOS/Linux.

## Verification (important)

You cannot see images. Do not say you "looked at" the design or that it "looks good". Verify with what you can read:

- `npm run build` and `npm run lint` output
- Playwright MCP accessibility snapshots, if the MCP server is available
- computed-style and contrast checks, and Lighthouse CLI output
- DOM structure and console errors

In every phase report, state what you verified and what only a human can judge (colour mood, glow intensity, motion feel). The user will judge those in the browser.

## Skills and tools (use if installed, otherwise continue and tell the user)

- Hallmark: anti-generic-design rules. Apply on top of `DESIGN.md`. If it conflicts with `DESIGN.md`, `DESIGN.md` wins, because neon is intended here.
- Vercel `web-design-guidelines`: use for the final audit in Phase 6.
- React Bits (and its MCP server or CLI): source for text and background effects.
- Playwright MCP: used for verification above.

## Code style

- TypeScript strict. Small components. No dead code. No comments that narrate the obvious.
- The Python scraper is one flat, top-level script. No classes, no argparse, no logging framework, no scaffolding beyond what the job needs. Keep it concise.
