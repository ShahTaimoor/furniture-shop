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
    <div className="relative w-full  md:h-[70vh] lg:h-[80vh] overflow-hidden hero-section">
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
              <div className="relative h-full w-full bg-white">
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="relative z-10 w-full h-full object-contain"
                  loading={index === 0 ? "eager" : "lazy"}
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 z-10 " />
                
                {/* Content Overlay */}
                <div className="absolute inset-0 z-20 flex items-end">
                  <div className="w-full px-4 md:px-8 lg:px-16 pb-8 md:pb-12 lg:pb-16">
                    <div className="max-w-3xl">
                      {banner.badge && (
                        <span
                          className={`inline-block ${banner.badgeColor} text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-full mb-3 md:mb-4`}
                        >
                          {banner.badge}
                        </span>
                      )}
                      {banner.title && (
                        <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white/95 drop-shadow-[0_3px_12px_rgba(0,0,0,0.55)] mb-3 md:mb-4 leading-tight">
                          {banner.title}
                        </h2>
                      )}
                      {banner.description && (
                        <p className="text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] text-base md:text-lg lg:text-xl mb-4 md:mb-6 max-w-2xl">
                          {banner.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-white group-hover:gap-4 transition-all duration-300">
                        <span className="text-sm md:text-base font-medium">Explore</span>
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom Navigation Buttons */}
      {allBanners.length > 1 && (
        <>
          <button
            className="hero-swiper-button-prev absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 md:p-4 transition-all duration-300 group"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white group-hover:scale-110 transition-transform" />
          </button>
          <button
            className="hero-swiper-button-next absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 md:p-4 transition-all duration-300 group"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white group-hover:scale-110 transition-transform" />
          </button>
        </>
      )}

      {/* Custom Pagination Styles - Added via className and global CSS */}
    </div>
  );
};

export default HeroSection;

