import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * Heading + subtitle + CTA. Sits above the products (z-20) and left-aligned,
 * matching a premium editorial hero.
 */
const ShowcaseContent = forwardRef(function ShowcaseContent(
  { eyebrow = 'Featured', heading, subtitle, ctaText, ctaUrl },
  ref
) {
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-5 pb-8 sm:px-10 sm:pb-12 lg:px-16 lg:pb-16"
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-caramel">
            {eyebrow}
          </p>
        )}
        {heading && (
          <h1 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight text-cream drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">
            {heading}
          </h1>
        )}
        {subtitle && (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-latte/85 drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)] sm:text-base">
            {subtitle}
          </p>
        )}
        {ctaText && (
          <Link
            to={ctaUrl || '/products'}
            className="pointer-events-auto mt-6 inline-flex items-center gap-2 rounded-full bg-cream px-6 py-3 text-sm font-semibold text-espresso transition-colors duration-300 hover:bg-caramel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel focus-visible:ring-offset-2 focus-visible:ring-offset-espresso"
          >
            {ctaText}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
});

export default ShowcaseContent;
