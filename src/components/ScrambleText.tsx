import { useEffect, useRef, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%";

export default function ScrambleText({ text }: { text: string }) {
  const [display, setDisplay] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setDisplay(text); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !done.current) {
          done.current = true;
          let frame = 0;
          const total = 24;
          const interval = setInterval(() => {
            frame++;
            const progress = frame / total;
            const revealed = Math.floor(text.length * progress);
            let out = "";
            for (let i = 0; i < text.length; i++) {
              if (i < revealed) out += text[i];
              else if (text[i] === " ") out += " ";
              else out += CHARS[Math.floor(Math.random() * CHARS.length)];
            }
            setDisplay(out);
            if (frame >= total) {
              clearInterval(interval);
              setDisplay(text);
            }
          }, 30);
        }
      });
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [text]);

  return <span ref={ref} aria-label={text}>{display}</span>;
}