import { useEffect, useState } from "react";
import type { Section } from "../data/types";

export default function ProgressBar({ sections }: { sections: Section[] }) {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
      setProgress(Math.min(1, Math.max(0, scrolled)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
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
  return (
    <div className="fixed top-0 left-0 right-0 z-40 h-[2px] bg-ink">
      <div className="h-full bg-cyan relative" style={{ width: `${progress * 100}%` }}>
        <span className="absolute right-0 top-0 w-[6px] h-[6px] bg-magenta -translate-y-1/2 translate-x-1/2" />
      </div>
      <div className="absolute right-4 top-2 text-mono-label text-muted">
        SECTOR {String(active + 1).padStart(2, "0")} / {String(sections.length).padStart(2, "0")}
      </div>
    </div>
  );
}
