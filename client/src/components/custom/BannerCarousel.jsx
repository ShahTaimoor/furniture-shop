import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import {
  fetchBannersForPlacement,
  selectPlacementBanners,
  selectPlacementStatus
} from '@/redux/slices/banners/bannersSlice';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const BannerCarousel = ({ placement, className, heightClass = 'h-64', autoPlayDelay = 6000 }) => {
  const dispatch = useDispatch();
  const banners = useSelector(selectPlacementBanners(placement));
  const status = useSelector(selectPlacementStatus(placement));

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchBannersForPlacement(placement));
    }
  }, [dispatch, placement, status]);

  if (status === 'loading') {
    return (
      <Skeleton className={cn('rounded-2xl border border-slate-200', heightClass, className)} />
    );
  }

  if (!Array.isArray(banners) || banners.length === 0) {
    return null;
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      <Swiper
        modules={[Autoplay, EffectFade, Pagination]}
        slidesPerView={1}
        effect="fade"
        autoplay={{ delay: autoPlayDelay, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        className={heightClass}
        loop
      >
        {banners.map((banner) => {
          const Wrapper = banner.redirectLink ? 'a' : 'div';
          return (
            <SwiperSlide key={banner._id}>
              <Wrapper
                href={banner.redirectLink || undefined}
                target={banner.redirectLink?.startsWith('http') ? '_blank' : undefined}
                rel={banner.redirectLink?.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="group relative flex h-full w-full overflow-hidden"
              >
                <img
                  src={banner.image?.secure_url}
                  alt={banner.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 flex flex-col justify-center gap-3 px-6 py-8 text-white md:px-10"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
                    {banner.placementLabel || banner.placement}
                  </span>
                  <h2 className="max-w-xl text-2xl font-bold leading-tight text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] md:text-3xl lg:text-4xl">
                    {banner.title}
                  </h2>
                  {banner.subtitle && (
                    <p className="max-w-lg text-sm text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)] md:text-base">{banner.subtitle}</p>
                  )}
                  {banner.redirectLink && (
                    <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide backdrop-blur-md transition group-hover:bg-white/25">
                      Explore
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  )}
                </motion.div>
              </Wrapper>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
};

export default BannerCarousel;


