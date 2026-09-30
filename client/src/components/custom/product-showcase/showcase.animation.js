import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Off-stage entrance pose per direction (relative to the product's resting pose).
const ENTER = {
  left: { xPercent: -150, yPercent: 10, rotation: -20 },
  right: { xPercent: 150, yPercent: 10, rotation: 20 },
  top: { xPercent: 0, yPercent: -170, rotation: -12 },
  bottom: { xPercent: 0, yPercent: 170, rotation: 12 },
  zoom: { xPercent: 0, yPercent: 0, rotation: 0, scale: 0.15 },
};

/**
 * Build ONE coordinated, scrubbed, pinned timeline for the showcase.
 * All animated nodes are passed in as DOM refs — no React state is touched.
 *
 * @param {Object} opts
 * @param {HTMLElement} opts.section
 * @param {HTMLElement} opts.bg
 * @param {HTMLElement} opts.content
 * @param {HTMLElement[]} opts.productEls
 * @param {import('./showcase.types').ShowcaseConfig} opts.config
 * @param {"desktop"|"mobile"} opts.mode
 * @returns {gsap.core.Timeline}
 */
export function buildShowcaseTimeline({ section, bg, content, productEls, config, mode }) {
  const desktop = mode === 'desktop';
  const items = (productEls || []).filter(Boolean);
  const products = Array.isArray(config.products) ? config.products : [];

  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: `+=${Math.max(800, Number(config.scrollLength) || 3000)}`,
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  // 1 — background slow zoom across the whole scroll
  if (bg) {
    tl.fromTo(
      bg,
      { scale: 1 },
      { scale: Math.min(2, Number(config.bgZoom) || 1.15), ease: 'none', duration: 12 },
      0
    );
  }

  // 2 — headline / subtitle / CTA slide + fade into place
  if (content) {
    tl.from(content, { autoAlpha: 0, y: 46, duration: 1.4 }, 0.15);
  }

  // 3 — products enter one after another; the previous one recedes into depth
  const STEP = 2.4;
  items.forEach((el, i) => {
    const cfg = products[i] || {};
    const pos = (desktop ? cfg.desktop : cfg.mobile) || {};
    const enter = ENTER[cfg.animation] || ENTER.bottom;

    const restX = Number(pos.x) || 0;
    const restY = Number(pos.y) || 0;
    const restRot = Number(cfg.rotation) || 0;
    const restScale = (Number(cfg.scale) || 1) * (desktop ? 1 : 0.78);
    const at = 1.6 + i * STEP;

    gsap.set(el, {
      xPercent: (enter.xPercent || 0) + restX,
      yPercent: (enter.yPercent || 0) + restY,
      rotation: (enter.rotation || 0) + restRot,
      scale: enter.scale != null ? enter.scale : restScale,
      autoAlpha: 0,
      transformOrigin: '50% 50%',
      force3D: true,
    });

    tl.to(
      el,
      {
        xPercent: restX,
        yPercent: restY,
        rotation: restRot,
        scale: restScale,
        autoAlpha: 1,
        duration: 1.7,
      },
      at
    );

    // small settle
    tl.to(el, { rotation: restRot - 2.5, duration: 0.7, yoyo: true, repeat: 1, ease: 'sine.inOut' }, at + 1.6);

    // hand-off: earlier product drifts back + dims
    if (i > 0) {
      tl.to(
        items[i - 1],
        { scale: '-=0.14', xPercent: '-=7', yPercent: '-=3', autoAlpha: 0.3, duration: 1.3 },
        at
      );
    }
  });

  // 4 — closing beat: lift content slightly as the last product lands
  if (content) {
    tl.to(content, { y: -14, duration: 1 }, `>-0.6`);
  }

  return tl;
}
