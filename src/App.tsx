import content from "./data/content.json";
import type { Content } from "./data/types";
import Hero from "./components/Hero";
import Nav from "./components/Nav";
import ProgressBar from "./components/ProgressBar";
import Section from "./components/Section";
import DataCard from "./components/DataCard";
import References from "./components/References";
import Footer from "./components/Footer";
import { externalize } from "./lib/links";
import { initLenis, scrollToTarget } from "./lib/motion";
import { useEffect } from "react";

const data = content as Content;

export default function App() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = initLenis(!reduced);
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const a = t.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        scrollToTarget(href, -80);
      }
    };
    document.addEventListener("click", onClick);
    return () => { lenis?.destroy(); document.removeEventListener("click", onClick); };
  }, []);
  const onOverlayChange = (open: boolean) => {
    const lenis = (window as any).__lenis;
    if (!lenis) return;
    if (open) lenis.stop();
    else lenis.start();
  };
  return (
    <div className="bg-void text-text min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 text-cyan">Skip to content</a>
      <ProgressBar sections={data.sections} />
      <Nav sections={data.sections} onOverlayChange={onOverlayChange} />
      <Hero />
      <main id="main" className="lg:ml-64 px-4 md:px-8 max-w-5xl mx-auto">
        <section id="lead" className="py-12 grid md:grid-cols-[1fr_280px] gap-8" tabIndex={-1}>
          <div className="prose" dangerouslySetInnerHTML={{ __html: externalize(data.lead) }} />
          <DataCard title={data.infobox.title} image={data.infobox.image} rows={data.infobox.rows} />
        </section>
        {data.sections.map((s, i) => (
          <Section key={s.id} section={s} index={i} />
        ))}
        <References references={data.references} />
      </main>
      <div className="lg:ml-64 px-4 md:px-8 max-w-5xl mx-auto">
        <Footer content={data} />
      </div>
    </div>
  );
}
