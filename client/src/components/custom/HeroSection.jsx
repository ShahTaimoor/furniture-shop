import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import {
  fetchBannersForPlacement,
  selectPlacementBanners,
} from "@/redux/slices/banners/bannersSlice";

const bannerToCard = (banner) => {
  if (!banner || !banner.image?.secure_url) return null;
  return {
    title: banner.title?.trim() || "",
    description: banner.subtitle || "",
    badge: banner.tagline || null,
    badgeColor: banner.badgeColor || "bg-black/80",
    image: banner.image?.secure_url,
    link: banner.redirectLink || "#",
  };
};

const HeroSection = () => {
  const dispatch = useDispatch();
  const swiperRef = useRef(null);

  const placement0 = useSelector(selectPlacementBanners("hero_0"));
  const placement1 = useSelector(selectPlacementBanners("hero_1"));
  const placement2 = useSelector(selectPlacementBanners("hero_2"));
  const placement3 = useSelector(selectPlacementBanners("hero_3"));

  useEffect(() => {
    dispatch(fetchBannersForPlacement("hero_0"));
    dispatch(fetchBannersForPlacement("hero_1"));
    dispatch(fetchBannersForPlacement("hero_2"));
    dispatch(fetchBannersForPlacement("hero_3"));
  }, [dispatch]);

  // Combine all banners into a single array with their display order
  const allBanners = useMemo(() => {
    const bannersWithOrder = [];
    
    // Helper to add banners from a placement
    const addBanners = (placement, placementIndex) => {
      if (!placement || !Array.isArray(placement)) return;
      placement.forEach(banner => {
        const card = bannerToCard(banner);
        if (card) {
          bannersWithOrder.push({
            ...card,
            displayOrder: banner.displayOrder ?? placementIndex * 1000,
          });
        }
      });
    };
    
    // Add banners from all placements
    addBanners(placement0, 0);
    addBanners(placement1, 1);
    addBanners(placement2, 2);
    addBanners(placement3, 3);
    
    // Sort by displayOrder
    return bannersWithOrder.sort((a, b) => a.displayOrder - b.displayOrder);
  }, [placement0, placement1, placement2, placement3]);

  if (!allBanners || allBanners.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full h-[52vh] sm:h-[62vh] md:h-[70vh] lg:h-[75vh] overflow-hidden rounded-2xl border border-slate-200/90 shadow-[0_2px_0_0_#e2e8f0] bg-slate-900 hero-section">
      <Swiper
        ref={swiperRef}
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
        spaceBetween={0}
        slidesPerView={1}
        loop={allBanners.length > 1}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        effect="fade"
        fadeEffect={{
          crossFade: true,
        }}
        pagination={{
          clickable: true,
          dynamicBullets: true,
        }}
        navigation={{
          nextEl: '.hero-swiper-button-next',
          prevEl: '.hero-swiper-button-prev',
        }}
        className="h-full w-full"
      >
        {allBanners.map((banner, index) => (
          <SwiperSlide key={index} className="h-full w-full">
            <Link to={banner.link} className="block h-full w-full group">
              <div className="relative h-full w-full bg-slate-950">
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="relative z-10 w-full h-full object-cover sm:object-contain"
                  loading={index === 0 ? "eager" : "lazy"}
                />
                
                {/* Clean Solid Subtle Overlay */}
                <div className="absolute inset-0 z-10 bg-black/40" />
                
                {/* Content Overlay */}
                <div className="absolute inset-0 z-20 flex items-end">
                  <div className="w-full px-4 sm:px-8 lg:px-12 pb-6 sm:pb-8 lg:pb-10">
                    <div className="max-w-2xl">
                      {banner.badge && (
                        <span
                          className={`inline-block ${banner.badgeColor} text-white text-[11px] sm:text-xs font-bold px-3 py-1 rounded-md mb-2 shadow-sm border border-white/20`}
                        >
                          {banner.badge}
                        </span>
                      )}
                      {banner.title && (
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 leading-tight drop-shadow-md">
                          {banner.title}
                        </h2>
                      )}
                      {banner.description && (
                        <p className="text-slate-200 text-xs sm:text-sm md:text-base mb-3 sm:mb-4 max-w-xl line-clamp-2 drop-shadow-sm">
                          {banner.description}
                        </p>
                      )}
                      <div className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs sm:text-sm font-bold text-slate-900 shadow-[0_3px_0_0_#cbd5e1] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_#94a3b8] active:translate-y-[2px] active:shadow-none">
                        <span>Explore Collection</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom Navigation Buttons with 3D tactile feel */}
      {allBanners.length > 1 && (
        <>
          <button
            className="hero-swiper-button-prev absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 bg-slate-900/80 hover:bg-slate-900 border border-white/20 text-white rounded-full p-2.5 sm:p-3 shadow-md transition-all active:scale-95"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
          <button
            className="hero-swiper-button-next absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 bg-slate-900/80 hover:bg-slate-900 border border-white/20 text-white rounded-full p-2.5 sm:p-3 shadow-md transition-all active:scale-95"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
        </>
      )}
      {/* Custom Pagination Styles - Added via className and global CSS */}
    </div>
  );
};

export default HeroSection;

