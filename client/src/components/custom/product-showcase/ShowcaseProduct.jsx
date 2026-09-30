import React, { forwardRef, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrency } from '@/redux/slices/settings/settingsSlice';
import { formatCurrency } from '@/utils/currency';
import { DEFAULT_PRODUCT_IMAGE, FINAL_FALLBACK_IMAGE } from './showcase.fallbacks';

/**
 * A single product placed *inside the scene*. The outer div only centres the
 * item; the inner div is what GSAP animates (transform/opacity only).
 */
const ShowcaseProduct = forwardRef(function ShowcaseProduct(
  { entry, isDesktop, staticPose = false },
  ref
) {
  const navigate = useNavigate();
  const currency = useSelector(selectCurrency);
  const product = entry.product || {};
  const pos = (isDesktop ? entry.desktop : entry.mobile) || { x: 0, y: 0 };

  // Try the configured/product image first, then a curated placeholder, then
  // the bundled logo — never a broken-image icon in the scene.
  const imageChain = useMemo(
    () =>
      [
        entry.image,
        product.image,
        product.picture?.secure_url,
        product.images?.[0]?.secure_url,
        DEFAULT_PRODUCT_IMAGE,
        FINAL_FALLBACK_IMAGE,
      ].filter(Boolean),
    [entry.image, product.image, product.picture, product.images]
  );
  const [imgStep, setImgStep] = useState(0);
  const image = imageChain[Math.min(imgStep, imageChain.length - 1)];

  const price = Number(product.salePrice ?? product.price ?? 0);
  const title = product.title || 'Product';
  const to = product.slug || product._id ? `/product/${product.slug || product._id}` : null;

  // Resting transform — used when GSAP is not driving (reduced motion / no-JS).
  const restStyle = staticPose
    ? {
        transform: `translate(${pos.x || 0}%, ${pos.y || 0}%) rotate(${entry.rotation || 0}deg) scale(${
          (Number(entry.scale) || 1) * (isDesktop ? 1 : 0.78)
        })`,
      }
    : undefined;

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
      <div
        ref={ref}
        style={restStyle}
        className="group pointer-events-auto w-[min(78vw,460px)] cursor-pointer will-change-transform lg:w-[min(38vw,560px)]"
        onClick={() => to && navigate(to)}
        role={to ? 'link' : undefined}
        tabIndex={to ? 0 : undefined}
        onKeyDown={(e) => {
          if (to && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            navigate(to);
          }
        }}
      >
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="h-auto w-full select-none object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.55)] transition-transform duration-500 group-hover:scale-[1.03]"
          onError={() => setImgStep((s) => Math.min(s + 1, imageChain.length - 1))}
        />
        {/* in-scene caption, not a card */}
        <div className="mt-3 flex items-center gap-2.5">
          <span className="h-px w-6 bg-caramel" />
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-cream drop-shadow">
            {title}
          </span>
          {price > 0 && (
            <span className="text-xs font-bold text-caramel drop-shadow">
              {formatCurrency(price, currency)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default ShowcaseProduct;
