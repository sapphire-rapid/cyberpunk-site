import { useCallback, useEffect, useRef, useState } from "react";
import { scrollToTarget } from "../lib/motion";
import type { Section } from "../data/types";

export default function Nav({ sections, onOverlayChange }: { sections: Section[]; onOverlayChange?: (open: boolean) => void }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const toggleOpen = useCallback((v: boolean) => { setOpen(v); onOverlayChange?.(v); }, [onOverlayChange]);
  const [railVisible, setRailVisible] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (hero) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          setRailVisible(e.intersectionRatio < 0.6);
        });
      }, { threshold: [0, 0.6] });
      io.observe(hero);
      return () => io.disconnect();
    }
  }, []);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = sections.findIndex((s) => s.id === e.target.id);
            if (idx >= 0) setActive(idx);
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        toggleOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    // trap focus
    const focusables = overlayRef.current?.querySelectorAll<HTMLElement>("a,button");
    focusables?.[0]?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, toggleOpen]);

  const goTo = (i: number) => {
    scrollToTarget("#" + sections[i].id, -80);
    toggleOpen(false);
    btnRef.current?.focus();
  };

  return (
    <>
      {/* desktop rail */}
      <nav
        className="hidden lg:block fixed left-4 top-24 w-56 z-30 transition-all duration-300"
        aria-label="Sector index"
        style={{
          opacity: railVisible ? 1 : 0,
          pointerEvents: railVisible ? "auto" : "none",
          transform: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "none" : (railVisible ? "translateX(0)" : "translateX(-12px)"),
        }}
        onFocusCapture={() => setRailVisible(true)}
      >
        <div className="text-mono-label text-muted mb-2">SECTOR INDEX</div>
        <ul className="space-y-1">
          {sections.map((s, i) => (
            <li key={s.id}>
              <button
                onClick={() => goTo(i)}
                aria-current={i === active ? "true" : undefined}
                className={`text-mono-label block w-full text-left px-2 py-1 ${i === active ? "text-cyan" : "text-muted"}`}
              >
                {String(i + 1).padStart(2, "0")} {s.title}
                {i === active && <span className="text-alarm ml-2">●</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-ink border-b border-line px-4 py-2 flex items-center justify-between">
        <span className="text-mono-label text-cyan">
          SECTOR {String(active + 1).padStart(2, "0")} / {String(sections.length).padStart(2, "0")} — {sections[active]?.title}
        </span>
        <button ref={btnRef} onClick={() => toggleOpen(true)} className="text-mono-label text-cyan" aria-label="Open sector menu">
          MENU
        </button>
      </div>

      {open && (
        <div ref={overlayRef} className="lg:hidden fixed inset-0 z-50 bg-void flex flex-col p-6" role="dialog" aria-modal="true">
          <button onClick={() => { toggleOpen(false); btnRef.current?.focus(); }} className="text-mono-label text-cyan self-end mb-4">
            CLOSE
          </button>
          <ul className="space-y-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <button onClick={() => goTo(i)} className="text-mono-label block w-full text-left py-2 text-cyan">
                  {String(i + 1).padStart(2, "0")} {s.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
