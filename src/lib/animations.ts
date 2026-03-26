import gsap from "gsap";

/**
 * Shared GSAP animation presets for A2A-Forge UI.
 * Uses transforms only for performance. Respects prefers-reduced-motion.
 */

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fade in + slide up from below */
export function fadeInUp(el: Element | Element[] | null, delay = 0) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el,
    { autoAlpha: 0, y: 12 },
    { autoAlpha: 1, y: 0, duration: 0.4, delay, ease: "power2.out" }
  );
}

/** Fade in + slide from left */
export function fadeInLeft(el: Element | Element[] | null, delay = 0) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el,
    { autoAlpha: 0, x: -16 },
    { autoAlpha: 1, x: 0, duration: 0.35, delay, ease: "power2.out" }
  );
}

/** Staggered list entrance */
export function staggerIn(els: Element | Element[] | NodeList | null, stagger = 0.05) {
  if (!els || prefersReducedMotion()) return;
  gsap.fromTo(els,
    { autoAlpha: 0, y: 8 },
    { autoAlpha: 1, y: 0, duration: 0.3, stagger, ease: "power2.out" }
  );
}

/** Scale pop for buttons/badges on mount */
export function popIn(el: Element | Element[] | null, delay = 0) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el,
    { autoAlpha: 0, scale: 0.85 },
    { autoAlpha: 1, scale: 1, duration: 0.35, delay, ease: "back.out(1.7)" }
  );
}

/** Smooth tab content transition */
export function tabSwitch(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el,
    { autoAlpha: 0, y: 6 },
    { autoAlpha: 1, y: 0, duration: 0.25, ease: "power1.out" }
  );
}

/** Status dot pulse */
export function pulseDot(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el,
    { scale: 1 },
    { scale: 1.4, duration: 0.3, ease: "power1.inOut", yoyo: true, repeat: 1 }
  );
}

/** Panel slide in from right (for modals/dialogs) */
export function slideInRight(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el,
    { autoAlpha: 0, x: 24 },
    { autoAlpha: 1, x: 0, duration: 0.35, ease: "power3.out" }
  );
}

/** Overlay backdrop fade */
export function fadeBackdrop(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el,
    { autoAlpha: 0 },
    { autoAlpha: 1, duration: 0.2, ease: "power1.out" }
  );
}

/** Success flash (green glow then fade) */
export function flashSuccess(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el,
    { boxShadow: "0 0 0 0 rgba(34,197,94,0.5)" },
    { boxShadow: "0 0 12px 4px rgba(34,197,94,0)", duration: 0.6, ease: "power2.out" }
  );
}

/** Error shake */
export function shakeError(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.to(el, {
    x: -4, duration: 0.06, ease: "power1.inOut",
    yoyo: true, repeat: 5, onComplete() { gsap.set(el, { x: 0 }); },
  });
}
