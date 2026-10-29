# Cyberpunk Site

A static, heavily stylised cyberpunk information site. Content is the Wikipedia article "Cyberpunk", scraped once at build time and rendered through a neon-noir design. Learning/portfolio project, deployed to a free host subdomain.

## Run the scraper

Windows:
```
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r scripts/requirements.txt
.venv\Scripts\python.exe scripts/scrape.py
```

macOS/Linux:
```
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
python scripts/scrape.py
```

## Dev / build / preview

```
npm install
npm run dev
npm run build
npm run preview
```

## Deploy

Import the repo into Vercel or Netlify: framework preset Vite, build command `npm run build`, output `dist`, no env vars.

## Attribution

Article text is CC BY-SA 4.0 from Wikipedia. The site is not affiliated with or endorsed by Wikipedia or the Wikimedia Foundation. Images are from Wikimedia Commons with credits in the footer. React Bits components (SwarmCursor, GlassIcons) are vendored under their licence. Other libraries: Vite, React, Tailwind CSS, GSAP, Lenis, @fontsource.