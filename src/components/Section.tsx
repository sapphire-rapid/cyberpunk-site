import type { Section as SectionType } from "../data/types";
import { externalize } from "../lib/links";
import ScrambleText from "./ScrambleText";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function Section({ section, index }: { section: SectionType; index: number }) {
  const num = String(index + 1).padStart(2, "0");
  const ruleRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const rule = ruleRef.current;
      const body = bodyRef.current;
      if (!rule || !body) return;
      gsap.set(rule, { scaleX: 0, transformOrigin: "left" });
      gsap.set(body, { opacity: 0, y: 16 });
      ScrollTrigger.create({
        trigger: titleRef.current,
        start: "top 80%",
        once: true,
        onEnter: () => {
          gsap.to(rule, { scaleX: 1, duration: 0.4, ease: "power3.out" });
          gsap.to(body, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", delay: 0.1 });
        },
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section id={section.id} className="py-12 md:py-16">
      <div className="flex items-center gap-4 mb-4">
        <span className="text-mono-label text-alarm">SECTOR {num}</span>
        <span ref={ruleRef} className="flex-1 h-px bg-line" />
      </div>
      <h2 ref={titleRef} className="text-h2 font-display mb-4"><ScrambleText text={section.title} /></h2>
      <div ref={bodyRef} className="prose" dangerouslySetInnerHTML={{ __html: externalize(section.html) }} />
      {section.subsections.map((sub) => (
        <div key={sub.id} id={sub.id} className="mt-6">
          <h3 className="text-h3 font-display mb-2">{sub.title}</h3>
          <div className="prose" dangerouslySetInnerHTML={{ __html: externalize(sub.html) }} />
        </div>
      ))}
    </section>
  );
}
