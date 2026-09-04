import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchBannersForPlacement,
  selectPlacementBanners,
  selectPlacementStatus,
} from '@/redux/slices/banners/bannersSlice';
import BannerCarousel from './BannerCarousel';

/**
 * "Featured collections" strip on the home page.
 * 100% admin-driven: add banners to the `home_feature` placement in Admin › Banners.
 * Renders nothing until at least one banner exists there.
 */
const PLACEMENT = 'home_feature';

const HomeFeatured = () => {
  const dispatch = useDispatch();
  const banners = useSelector(selectPlacementBanners(PLACEMENT));
  const status = useSelector(selectPlacementStatus(PLACEMENT));

  useEffect(() => {
    if (status === 'idle') dispatch(fetchBannersForPlacement(PLACEMENT));
  }, [dispatch, status]);

  if (!Array.isArray(banners) || banners.length === 0) return null;

  return (
    <section className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6">
      <div className="mb-3 md:mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-caramel-deep mb-1">Featured</p>
        <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-semibold text-espresso tracking-tight">
          Collections in the Spotlight
        </h2>
      </div>
      <BannerCarousel placement={PLACEMENT} heightClass="h-[200px] sm:h-[280px] lg:h-[340px]" />
    </section>
  );
};

export default HomeFeatured;
