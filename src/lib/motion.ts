import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;

export function initLenis(enabled: boolean) {
  if (!enabled) return null;
  const lenis = new Lenis({ duration: 1.2 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time: number) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
  lenisInstance = lenis;
  (window as any).__lenis = lenis;
  return lenis;
}

export function getLenis() {
  return lenisInstance;
}

export function scrollToTarget(target: string | HTMLElement, offset = -80) {
  const lenis = lenisInstance;
  if (lenis) {
    lenis.scrollTo(target, { offset });
  } else {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    el?.scrollIntoView();
  }
}