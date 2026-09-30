import React, { forwardRef, useState } from 'react';
import { DEFAULT_BG_IMAGES, FINAL_FALLBACK_IMAGE } from './showcase.fallbacks';

/**
 * Full-bleed background layer: image or (optionally) video, plus a dark overlay
 * and a soft bottom gradient so foreground text always reads.
 *
 * Falls back gracefully: configured image -> a curated default scene ->
 * a second default -> the bundled logo, so the hero never shows a broken image.
 */
const ShowcaseBackground = forwardRef(function ShowcaseBackground(
  { image, video, overlay = 0.45, alt = '' },
  ref
) {
  const chain = [image, ...DEFAULT_BG_IMAGES, FINAL_FALLBACK_IMAGE].filter(Boolean);
  const [step, setStep] = useState(0);
  const src = chain[Math.min(step, chain.length - 1)];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div ref={ref} className="absolute inset-0 will-change-transform">
        {video ? (
          <video
            className="h-full w-full object-cover"
            src={video}
            poster={src}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            loading="eager"
            fetchpriority="high"
            onError={() => setStep((s) => Math.min(s + 1, chain.length - 1))}
          />
        )}
      </div>
      <div className="absolute inset-0 bg-espresso" style={{ opacity: overlay }} />
      <div className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/30 to-espresso/10" />
    </div>
  );
});

export default ShowcaseBackground;
