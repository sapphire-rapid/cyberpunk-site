import { useEffect, useRef, useState } from "react";
import SwarmCursor from "./fx/SwarmCursor";
import { Suspense, lazy } from "react";
const GlassIcons = lazy(() => import("./fx/GlassIcons")) as any;

const CONFIG = {
  layers: 3,
  buildingHeights: [0.14, 0.22, 0.30],
  buildingWidths: [60, 40, 28],
  windowDensity: 0.10,
  flickerRate: 0,
  rainDensity: 220,
  rainAngle: 0.15,
  rainSpeed: 6,
  parallaxStrength: 0,
  maxFps: 60,
  // matrix rain
  matrix: {
    cellSize: 14,
    density: 0.55,
    speedMin: 6,
    speedMax: 18,
    trailMin: 6,
    trailMax: 16,
    mutationMs: 120,
    headAlpha: 0.9,
    bodyAlpha: 0.45,
    useKatakana: false, // documented: off by default; ASCII only
    rainbow: "neon" as "neon" | "full",
  },
};

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.*+=-<>|".split("");

const heroFxConfig = {
  swarm: {
    count: 600, size: 3.6, shape: "nanobot", color: "#00e5ff", accentColor: "#ff2e88",
    spread: 90, speed: 1, swirl: 0.6, tail: 0.5, trail: 0.5, wander: 0.5, depth: 0.6,
    targets: "a, button, [data-swarm-target]", idle: "roam", clickEffect: "burst",
    hideCursor: false, intro: true, lightMode: false, dpr: 1.5,
  },
  glassEnter: {
    size: 72, columns: 1, roundness: 0.25, refraction: 0.8, bevel: 0.6, dispersion: 0.25,
    frost: 0.2, shine: 0.85, tint: "#00e5ff", tintOpacity: 0.18, iconColor: "#d7e3f4",
    plate: "tilt", tilt: 30, hover: "press", parallax: 1, labels: "hover", intro: true, theme: "dark",
  },
};

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [debug, setDebug] = useState(false);
  const swarmOff = new URLSearchParams(window.location.search).has("swarm") && new URLSearchParams(window.location.search).get("swarm") === "off";
  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [fps, setFps] = useState(0);
  const [running, setRunning] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0, dpr: 1 });
  const [glyphsAboveRoof, setGlyphsAboveRoof] = useState(0);

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).has("debug"));
  }, []);

  const matrixOff = new URLSearchParams(window.location.search).has("matrix") && new URLSearchParams(window.location.search).get("matrix") === "off";

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const cv = canvas as HTMLCanvasElement;
    const ct = container as HTMLDivElement;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dprCap = 2;
    let dpr = Math.min(window.devicePixelRatio || 1, dprCap);

    let w = 0, h = 0;
    const layers: HTMLCanvasElement[] = [];
    let raf = 0;
    let paused = false;
    let pausedByIO = false;
    let last = performance.now();
    const frameInterval = 1000 / CONFIG.maxFps;
    let frames = 0;
    let fpsFrames = 0;
    let fpsLast = performance.now();
    // (parallax disabled)
    const rain: { x: number; y: number; len: number; alpha: number }[] = [];

    // roofline heightmap
    let roofTop: number[] = [];
    let matrixStreams: { col: number; y: number; speed: number; trail: number; lastMutate: number; glyphs: string[] }[] = [];
    let glyphAtlas: HTMLCanvasElement | null = null;
    let aboveRoofCount = 0;

    const fills = ["#0b0f24", "#090c1c", "#06080f"];

    function buildGlyphAtlas() {
      const cell = CONFIG.matrix.cellSize;
      const colors = CONFIG.matrix.rainbow === "neon" ? ["#00e5ff", "#3d7bff", "#8a5cff", "#ff2e88", "#ffb000"] : null;
      const atlas = document.createElement("canvas");
      const cols = GLYPHS.length;
      const rows = colors ? colors.length : 360;
      atlas.width = cols * cell * dpr;
      atlas.height = rows * cell * dpr;
      const actx = atlas.getContext("2d")!;
      actx.setTransform(dpr, 0, 0, dpr, 0, 0);
      actx.font = `${cell - 2}px monospace`;
      actx.textBaseline = "top";
      for (let gi = 0; gi < cols; gi++) {
        for (let ci = 0; ci < rows; ci++) {
          let color: string;
          if (colors) {
            if (ci === colors.length - 1 && Math.random() < 1 / 12) color = "#ffb000";
            else color = colors[ci % (colors.length - 1)];
          } else {
            color = `hsl(${(ci * 7) % 360}, 90%, 55%)`;
          }
          actx.fillStyle = color;
          actx.fillText(GLYPHS[gi], gi * cell, ci * cell);
        }
      }
      glyphAtlas = atlas;
    }

    function resize() {
      const rect = ct.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      cv.width = w * dpr;
      cv.height = h * dpr;
      cv.style.width = w + "px";
      cv.style.height = h + "px";
      const ctx = cv.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildLayers();
      buildMatrix();
      buildGlyphAtlas();
      if (reduced) drawStatic();
      setSize({ w, h, dpr });
    }

    function buildLayers() {
      layers.length = 0;
      const pad = CONFIG.parallaxStrength; // 0
      for (let i = 0; i < CONFIG.layers; i++) {
        const lc = document.createElement("canvas");
        lc.width = (w + pad * 2) * dpr;
        lc.height = h * dpr;
        const lctx = lc.getContext("2d")!;
        lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const baseH = h * CONFIG.buildingHeights[i];
        const grad = lctx.createLinearGradient(0, h - baseH * 1.2, 0, h);
        grad.addColorStop(0, "rgba(255,46,136,0)");
        grad.addColorStop(0.5, "rgba(255,46,136,0.18)");
        grad.addColorStop(1, "rgba(0,229,255,0.12)");
        lctx.fillStyle = grad;
        lctx.fillRect(-pad, 0, w + pad * 2, h);

        lctx.fillStyle = fills[i];
        const bw = CONFIG.buildingWidths[i];
        let x = -pad;
        while (x < w + pad) {
          const gap = 2 + Math.random() * 6;
          x += gap;
          const variance = 0.75 + Math.random() * 0.5;
          const bh = Math.min(h * 0.30, baseH * variance);
          lctx.fillStyle = fills[i];
          lctx.fillRect(x, h - bh, bw, bh);
          if (i > 0) {
            lctx.fillStyle = Math.random() < 0.5 ? "rgba(0,229,255,0.5)" : "rgba(255,46,136,0.5)";
            lctx.fillRect(x, h - bh, 1, bh);
            lctx.fillStyle = fills[i];
          }
          const cols = Math.floor(bw / 6);
          const rows = Math.floor(bh / 8);
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (Math.random() < CONFIG.windowDensity) {
                const warm = Math.random() < 0.15;
                lctx.fillStyle = warm ? "rgba(255,176,0,0.7)" : "rgba(127,220,255,0.5)";
                lctx.fillRect(x + 2 + c * 6, h - bh + 4 + r * 8, 3, 4);
              }
            }
          }
          x += bw;
        }
        layers.push(lc);
      }
      // roofline heightmap: min y across layers per column
      const cell = CONFIG.matrix.cellSize;
      const cols = Math.ceil(w / cell);
      roofTop = new Array(cols).fill(h);
      for (let ci = 0; ci < cols; ci++) {
        // sample each layer's building top at cx
        let minY = h;
        for (let i = 0; i < CONFIG.layers; i++) {
          // approximate: use baseH variance; recompute not trivial. Use canvas pixel scan.
        }
        roofTop[ci] = minY;
      }
      // pixel-scan roofline from rendered layers
      const tmp = document.createElement("canvas");
      tmp.width = w; tmp.height = h;
      const tctx = tmp.getContext("2d")!;
      for (const lc of layers) {
        tctx.drawImage(lc, -CONFIG.parallaxStrength, 0, w + CONFIG.parallaxStrength * 2, h, 0, 0, w, h);
      }
      const img = tctx.getImageData(0, 0, w, h).data;
      for (let ci = 0; ci < cols; ci++) {
        const cx = Math.min(w - 1, ci * cell + Math.floor(cell / 2));
        let top = h;
        for (let y = 0; y < h; y++) {
          const idx = (y * w + cx) * 4 + 3;
          if (img[idx] > 10) { top = y; break; }
        }
        if (top < roofTop[ci]) roofTop[ci] = top;
      }
      // fill any unset
      for (let ci = 0; ci < cols; ci++) {
        if (roofTop[ci] === h) roofTop[ci] = h * 0.7;
      }

      rain.length = 0;
      for (let i = 0; i < CONFIG.rainDensity; i++) {
        rain.push({
          x: Math.random() * w,
          y: Math.random() * h,
          len: 6 + Math.random() * 10,
          alpha: 0.25 + Math.random() * 0.15,
        });
      }
    }

    function buildMatrix() {
      matrixStreams = [];
      if (matrixOff) return;
      const cell = CONFIG.matrix.cellSize;
      const cols = Math.ceil(w / cell);
      const activeCount = Math.floor(cols * CONFIG.matrix.density);
      const indices = Array.from({ length: cols }, (_, i) => i);
      // pick active columns
      for (let i = 0; i < activeCount; i++) {
        const col = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];
        if (col === undefined) break;
        matrixStreams.push({
          col,
          y: roofTop[col] ?? h * 0.7,
          speed: CONFIG.matrix.speedMin + Math.random() * (CONFIG.matrix.speedMax - CONFIG.matrix.speedMin),
          trail: CONFIG.matrix.trailMin + Math.floor(Math.random() * (CONFIG.matrix.trailMax - CONFIG.matrix.trailMin)),
          lastMutate: 0,
          glyphs: Array.from({ length: CONFIG.matrix.trailMax }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]),
        });
      }
    }

    function drawStatic() {
      const ctx = cv.getContext("2d")!;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#05060d";
      ctx.fillRect(0, 0, w, h);
      layers.forEach((lc) => {
        ctx.drawImage(lc, 0, 0, w, h);
      });
      drawMatrixStatic(ctx);
      ctx.strokeStyle = "rgba(200,230,255,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const drop of rain) {
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + CONFIG.rainAngle * drop.len, drop.y + drop.len);
      }
      ctx.stroke();
    }

    function drawMatrixStatic(ctx: CanvasRenderingContext2D) {
      if (matrixOff) return;
      const cell = CONFIG.matrix.cellSize;
      aboveRoofCount = 0;
      for (const s of matrixStreams) {
        const colX = s.col * cell;
        const roof = roofTop[s.col] ?? h * 0.7;
        let y = roof + Math.random() * (h - roof);
        for (let t = 0; t < s.trail; t++) {
          const gy = y - t * cell;
          if (gy < roof) { if (t === 0) aboveRoofCount++; continue; }
          const alpha = t === 0 ? CONFIG.matrix.headAlpha : CONFIG.matrix.bodyAlpha * (1 - t / s.trail);
          if (alpha <= 0) continue;
          const colorIdx = CONFIG.matrix.rainbow === "neon" ? s.col % 4 : Math.floor((s.col * 7) % 360);
          // draw from atlas
          if (glyphAtlas) {
            ctx.globalAlpha = alpha;
            const gx = Math.floor(Math.random() * GLYPHS.length) * cell;
            const gy2 = CONFIG.matrix.rainbow === "neon" ? (colorIdx === 3 ? 3 : colorIdx) * cell : 0;
            ctx.drawImage(glyphAtlas, gx * dpr, gy2 * dpr, cell * dpr, cell * dpr, colX, gy, cell, cell);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function drawMatrix(ctx: CanvasRenderingContext2D, now: number, dt: number) {
      if (matrixOff) return;
      const cell = CONFIG.matrix.cellSize;
      aboveRoofCount = 0;
      for (const s of matrixStreams) {
        s.y += (s.speed * cell * dt) / 1000;
        if (s.y - s.trail * cell > h) {
          // respawn
          s.y = (roofTop[s.col] ?? h * 0.7) + Math.random() * cell;
          s.speed = CONFIG.matrix.speedMin + Math.random() * (CONFIG.matrix.speedMax - CONFIG.matrix.speedMin);
          s.trail = CONFIG.matrix.trailMin + Math.floor(Math.random() * (CONFIG.matrix.trailMax - CONFIG.matrix.trailMin));
        }
        if (now - s.lastMutate > CONFIG.matrix.mutationMs) {
          s.lastMutate = now;
          s.glyphs[Math.floor(Math.random() * s.glyphs.length)] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        const roof = roofTop[s.col] ?? h * 0.7;
        const colX = s.col * cell;
        for (let t = 0; t < s.trail; t++) {
          const gy = s.y - t * cell;
          if (gy < roof) { if (t === 0) aboveRoofCount++; continue; }
          if (gy > h) continue;
          const alpha = t === 0 ? CONFIG.matrix.headAlpha : CONFIG.matrix.bodyAlpha * (1 - t / s.trail);
          if (alpha <= 0) continue;
          const colorIdx = CONFIG.matrix.rainbow === "neon" ? (s.col % 4) : 0;
          const glyph = s.glyphs[t % s.glyphs.length];
          const gi = GLYPHS.indexOf(glyph);
          if (glyphAtlas) {
            ctx.globalAlpha = alpha;
            const srcX = (gi >= 0 ? gi : 0) * cell;
            const srcY = CONFIG.matrix.rainbow === "neon" ? (colorIdx === 3 ? 3 : colorIdx) * cell : Math.floor((s.col * 7) % 360) * 0; // full uses hue cycling not in atlas rows; fallback row 0
            ctx.drawImage(glyphAtlas, srcX * dpr, srcY * dpr, cell * dpr, cell * dpr, colX, gy - cell, cell, cell);
          }
        }
      }
      ctx.globalAlpha = 1;
      setGlyphsAboveRoof(aboveRoofCount);
    }

    function draw(now: number) {
      if (paused) return;
      const delta = now - last;
      if (delta < frameInterval) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last = now - (delta % frameInterval);
      const ctx = cv.getContext("2d")!;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#05060d";
      ctx.fillRect(0, 0, w, h);
      layers.forEach((lc) => {
        ctx.drawImage(lc, 0, 0, w, h);
      });
      // rain
      ctx.strokeStyle = "rgba(200,230,255,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const drop of rain) {
        drop.y += CONFIG.rainSpeed;
        drop.x += CONFIG.rainAngle * CONFIG.rainSpeed;
        if (drop.y > h) { drop.y = -10; drop.x = Math.random() * w; }
        if (drop.x > w) drop.x = 0;
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + CONFIG.rainAngle * drop.len, drop.y + drop.len);
      }
      ctx.stroke();
      // matrix pass
      ctx.save();
      drawMatrix(ctx, now, delta);
      ctx.restore();
      ctx.globalAlpha = 1;

      frames++;
      fpsFrames++;
      if (now - fpsLast >= 500) {
        setFps(Math.round((fpsFrames * 1000) / (now - fpsLast)));
        fpsFrames = 0;
        fpsLast = now;
      }
      setRunning(true);
      raf = requestAnimationFrame(draw);
    }

    let resizeTimer: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    }
    function onPointer() {}
    function onScroll() {}
    function onVisibility() {
      if (reduced) return;
      if (document.hidden) {
        paused = true;
        cancelAnimationFrame(raf);
        setRunning(false);
      } else if (!pausedByIO) {
        paused = false;
        raf = requestAnimationFrame(draw);
        setRunning(true);
      }
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (reduced) return;
        if (e.isIntersecting) {
          if (!document.hidden) {
            pausedByIO = false;
            paused = false;
            raf = requestAnimationFrame(draw);
            setRunning(true);
          }
        } else {
          pausedByIO = true;
          paused = true;
          cancelAnimationFrame(raf);
          setRunning(false);
        }
      });
    }, { threshold: 0.1 });
    io.observe(ct);

    window.addEventListener("resize", onResize);
    ct.addEventListener("pointermove", onPointer);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    resize();
    if (!reduced) {
      raf = requestAnimationFrame(draw);
      setRunning(true);
    } else {
      drawStatic();
      setRunning(false);
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      ct.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(resizeTimer);
    };
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let active = false;
    function burst() {
      if (active) return;
      active = true;
      const el = titleRef.current;
      if (el) {
        el.classList.add("glitch");
        setTimeout(() => {
          el.classList.remove("glitch");
          active = false;
        }, 280);
      } else {
        active = false;
      }
    }
    function schedule() {
      const delay = 6000 + Math.random() * 4000;
      setTimeout(() => {
        burst();
        schedule();
      }, delay);
    }
    schedule();
    return () => {};
  }, []);

  const showSwarm = !reducedMotion && !swarmOff;

  const scrollToContent = () => {
    const target = document.getElementById("lead") || document.getElementById("main");
    if (target) {
      const lenis = (window as any).__lenis;
      if (lenis) lenis.scrollTo(target, { offset: -80, duration: 1.4, easing: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 });
      else target.scrollIntoView();
      setTimeout(() => {
        (target as HTMLElement).focus({ preventScroll: true });
      }, 1450);
    }
  };

  return (
    <div id="hero" ref={containerRef} className="relative w-full overflow-hidden" style={{ minHeight: "560px", height: "100svh" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {showSwarm ? (
        <SwarmCursor {...heroFxConfig.swarm} className="absolute inset-0">
          <div className="relative z-10 flex flex-col items-center text-center px-4" style={{ position: "absolute", top: "32%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }}>
            <h1
              ref={titleRef}
              className="text-display font-display font-bold tracking-tight rgb-split"
              aria-label="CYBERPUNK"
              style={{ pointerEvents: "auto" }}
            >
              CYBERPUNK
            </h1>
            <p className="text-mono-label mt-2" style={{ color: "var(--text)", pointerEvents: "auto" }}>A SUBGENRE OF SCIENCE FICTION // HIGH TECH, LOW LIFE</p>
          </div>
          <div style={{ position: "absolute", bottom: "calc(34% + 24px)", left: "50%", transform: "translateX(-50%)", pointerEvents: "auto" }}>
            <Suspense fallback={<button onClick={scrollToContent} className="text-mono-label text-cyan border border-cyan px-4 py-2" aria-label="Enter: scroll to the article">[ ENTER ]</button>}>
              <GlassIcons
                items={[{ icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>), label: "ENTER", onClick: scrollToContent }]}
                {...heroFxConfig.glassEnter}
              />
            </Suspense>
          </div>
        </SwarmCursor>
      ) : (
        <>
          <div className="relative z-10 flex flex-col items-center text-center px-4" style={{ position: "absolute", top: "32%", left: "50%", transform: "translate(-50%, -50%)" }}>
            <h1 ref={titleRef} className="text-display font-display font-bold tracking-tight rgb-split" aria-label="CYBERPUNK">CYBERPUNK</h1>
            <p className="text-mono-label mt-2" style={{ color: "var(--text)" }}>A SUBGENRE OF SCIENCE FICTION // HIGH TECH, LOW LIFE</p>
          </div>
          <div style={{ position: "absolute", bottom: "calc(34% + 24px)", left: "50%", transform: "translateX(-50%)" }}>
            <button onClick={scrollToContent} className="text-mono-label text-cyan border border-cyan px-4 py-2" aria-label="Enter: scroll to the article">[ ENTER ]</button>
          </div>
        </>
      )}
      <div
        className="pointer-events-none fixed inset-0 z-20"
        style={{
          background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)",
          opacity: 0.06,
          mixBlendMode: "overlay",
        }}
      />
      {debug && (
        <div className="fixed bottom-2 right-2 z-50 bg-panel border border-line p-2 text-mono-label text-cyan">
          <div>fps: {fps}</div>
          <div>size: {size.w}x{size.h}</div>
          <div>dpr: {size.dpr}</div>
          <div>loop: {running ? "running" : "paused"}</div>
          <div>glyphsAboveRoof: {glyphsAboveRoof}</div>
          <div>SWARM: {showSwarm ? "on" : "off"}</div>
        </div>
      )}
    </div>
  );
}