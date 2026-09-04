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

// Shown only when no banners are configured in the admin for any hero_* placement.
// One card per placement slot so the carousel still feels complete out of the box.
const FALLBACK_BANNERS = [
  {
    title: "Premium Body Kits",
    description: "Precision-moulded ABS kits engineered for a factory-perfect fit on every model.",
    badge: "New Season",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
    link: "/products",
    cover: true,
    displayOrder: 0,
  },
  {
    title: "Spoilers & Styling",
    description: "Ducktail spoilers, diffusers and lips that sharpen your car's stance.",
    badge: "Best Sellers",
    image:
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1600&q=80",
    link: "/products?sortBy=popularity",
    cover: true,
    displayOrder: 1000,
  },
  {
    title: "Upgrade Your Ride",
    description: "Bumpers, grilles and trims — bold looks with a clean, bolt-on install.",
    badge: "Featured",
    image:
      "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1600&q=80",
    link: "/products",
    cover: true,
    displayOrder: 2000,
  },
  {
    title: "Fresh Arrivals",
    description: "The latest kits and accessories, added to the catalogue every week.",
    badge: "Just In",
    image:
      "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1600&q=80",
    link: "/products?sortBy=newest",
    cover: true,
    displayOrder: 3000,
  },
  {
    title: "Show-Ready Finish",
    description: "Unpainted and pre-primed panels ready for a colour-matched respray.",
    badge: "Popular",
    image:
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1600&q=80",
    link: "/products",
    cover: true,
    displayOrder: 4000,
  },
  {
    title: "Built for the Road",
    description: "Aggressive, aerodynamic styling that still bolts straight on.",
    badge: "Editor's Pick",
    image:
      "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1600&q=80",
    link: "/products?sortBy=popularity",
    cover: true,
    displayOrder: 5000,
  },
];

const HERO_PLACEMENTS = ["hero_0", "hero_1", "hero_2", "hero_3", "hero_4", "hero_5"];

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
  const placement4 = useSelector(selectPlacementBanners("hero_4"));
  const placement5 = useSelector(selectPlacementBanners("hero_5"));

  useEffect(() => {
    HERO_PLACEMENTS.forEach((placement) => {
      dispatch(fetchBannersForPlacement(placement));
    });
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
    addBanners(placement4, 4);
    addBanners(placement5, 5);

    // If nothing is configured in the admin, fall back to the full default set.
    if (bannersWithOrder.length === 0) {
      return [...FALLBACK_BANNERS];
    }

    // Sort by displayOrder
    return bannersWithOrder.sort((a, b) => a.displayOrder - b.displayOrder);
  }, [placement0, placement1, placement2, placement3, placement4, placement5]);

  return (
    <div className="relative w-full h-[52vh] sm:h-[62vh] md:h-[70vh] lg:h-[75vh] overflow-hidden rounded-2xl border border-latte shadow-[0_2px_0_0_var(--latte),0_20px_44px_-20px_rgba(43,29,23,0.35)] bg-espresso hero-section">
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
              <div className="relative h-full w-full bg-espresso">
                <img
                  src={banner.image}
                  alt={banner.title}
                  className={`relative z-10 w-full h-full scale-100 transition-transform duration-[6000ms] ease-out [.swiper-slide-active_&]:scale-105 ${
                    banner.cover ? "object-cover" : "object-cover sm:object-contain"
                  }`}
                  loading={index === 0 ? "eager" : "lazy"}
                />

                {/* Warm cinematic overlay */}
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-espresso/85 via-espresso/25 to-espresso/10" />
                <div className="absolute inset-0 z-10 bg-espresso/15" />

                {/* Content Overlay */}
                <div className="absolute inset-0 z-20 flex items-end">
                  <div className="w-full px-4 sm:px-8 lg:px-12 pb-6 sm:pb-8 lg:pb-12">
                    <div className="max-w-2xl [.swiper-slide-active_&]:animate-rise-in">
                      {banner.badge && (
                        <span className="inline-flex items-center gap-1.5 bg-caramel text-espresso text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] px-3 py-1 rounded-full mb-3 shadow-sm">
                          {banner.badge}
                        </span>
                      )}
                      {banner.title && (
                        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-cream mb-2 leading-[1.05] tracking-tight drop-shadow-[0_2px_12px_rgba(43,29,23,0.5)]">
                          {banner.title}
                        </h2>
                      )}
                      {banner.description && (
                        <p className="text-latte text-xs sm:text-sm md:text-base mb-4 sm:mb-5 max-w-xl line-clamp-2">
                          {banner.description}
                        </p>
                      )}
                      <div className="inline-flex items-center gap-2 rounded-full bg-cream px-5 py-2.5 text-xs sm:text-sm font-semibold text-espresso btn-3d-secondary transition-smooth group-hover:bg-caramel group-hover:text-espresso">
                        <span>Explore Collection</span>
                        <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
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
            className="hero-swiper-button-prev absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 glass text-cream rounded-full p-2.5 sm:p-3 shadow-md transition-smooth hover:bg-cream hover:text-espresso active:scale-90"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            className="hero-swiper-button-next absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 glass text-cream rounded-full p-2.5 sm:p-3 shadow-md transition-smooth hover:bg-cream hover:text-espresso active:scale-90"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </>
      )}
      {/* Custom Pagination Styles - Added via className and global CSS */}
    </div>
  );
};

export default HeroSection;

