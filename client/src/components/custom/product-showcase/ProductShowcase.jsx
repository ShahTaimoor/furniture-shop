import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import productService from '@/redux/slices/products/productService';
import { selectHomeShowcase } from '@/redux/slices/settings/settingsSlice';
import HeroSection from '../HeroSection';
import ShowcaseBackground from './ShowcaseBackground';
import ShowcaseContent from './ShowcaseContent';
import ShowcaseProduct from './ShowcaseProduct';
import { buildShowcaseTimeline } from './showcase.animation';

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Admin-configurable, GSAP-pinned cinematic product showcase hero.
 * Reusable — drop it on any storefront page. Falls back to the classic banner
 * carousel when it isn't configured.
 */
const ProductShowcase = ({ config: configProp }) => {
  const configFromStore = useSelector(selectHomeShowcase);
  const config = configProp || configFromStore || {};

  const enabled = Boolean(config.enabled) && Array.isArray(config.products) && config.products.length > 0;

  const [resolved, setResolved] = useState([]);
  const [reduced, setReduced] = useState(prefersReduced());
  const [failed, setFailed] = useState(false);

  const sectionRef = useRef(null);
  const bgRef = useRef(null);
  const contentRef = useRef(null);
  const productRefs = useRef([]);

  // ---- resolve config product ids -> real products ----
  const idKey = useMemo(
    () => (enabled ? config.products.map((p) => p.productId || p.image).join(',') : ''),
    [enabled, config.products]
  );

  useEffect(() => {
    if (!enabled) {
      setResolved([]);
      return;
    }
    let alive = true;
    const ids = config.products.map((p) => p.productId).filter(Boolean);
    const finish = (list) => {
      if (!alive) return;
      const byId = new Map(
        (list || []).map((p) => [String(p._id), p]).concat((list || []).map((p) => [String(p.slug), p]))
      );
      const merged = config.products
        .map((cfg) => ({ ...cfg, product: byId.get(String(cfg.productId)) || {} }))
        .filter((e) => e.product?._id || e.image);
      setResolved(merged);
    };

    if (ids.length === 0) {
      finish([]);
      return () => {
        alive = false;
      };
    }
    productService
      .allProduct({ productIds: ids.join(','), limit: ids.length, stockFilter: 'all' })
      .then((res) => finish(Array.isArray(res?.data) ? res.data : []))
      .catch(() => finish([]));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, idKey]);

  // ---- reduced-motion live updates ----
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // ---- GSAP timeline (desktop + mobile), skipped for reduced motion ----
  useLayoutEffect(() => {
    if (!enabled || reduced || resolved.length === 0 || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      const setup = (mode) => () => {
        try {
          buildShowcaseTimeline({
            section: sectionRef.current,
            bg: bgRef.current,
            content: contentRef.current,
            productEls: productRefs.current.slice(0, resolved.length),
            config,
            mode,
          });
        } catch (err) {
          console.error('[ProductShowcase] timeline error', err);
          setFailed(true);
        }
      };
      mm.add('(min-width: 1024px)', setup('desktop'));
      mm.add('(max-width: 1023px)', setup('mobile'));

      // recalc once images/fonts have settled
      const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
      return () => cancelAnimationFrame(raf);
    }, sectionRef);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reduced, resolved.length, idKey, config.scrollLength, config.bgZoom]);

  // ---- fallbacks ----
  if (!enabled) return <HeroSection />;
  if (resolved.length === 0) return <HeroSection />;

  const staticPose = reduced || failed;

  return (
    <section
      ref={sectionRef}
      aria-label={config.heading || 'Product showcase'}
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden rounded-2xl bg-espresso text-cream"
    >
      <ShowcaseBackground
        ref={bgRef}
        image={config.bgImage}
        video={config.bgVideo}
        overlay={config.overlay}
        alt={config.heading || ''}
      />

      {/* product stage */}
      <div className="absolute inset-0">
        {resolved.map((entry, i) => (
          <ShowcaseProduct
            key={(entry.productId || entry.image) + i}
            ref={(el) => {
              productRefs.current[i] = el;
            }}
            entry={entry}
            isDesktop={typeof window !== 'undefined' ? window.innerWidth >= 1024 : true}
            staticPose={staticPose}
          />
        ))}
      </div>

      <ShowcaseContent
        ref={contentRef}
        heading={config.heading}
        subtitle={config.subtitle}
        ctaText={config.ctaText}
        ctaUrl={config.ctaUrl}
      />
    </section>
  );
};

export default ProductShowcase;
