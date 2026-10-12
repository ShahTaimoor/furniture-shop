import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, ChevronLeft, LayoutGrid, Sparkles } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import {
  fetchBannersForPlacement,
  selectPlacementBanners,
} from "@/redux/slices/banners/bannersSlice";

// Shown only when no banners are configured in the admin for any hero_* placement.
const FALLBACK_BANNERS = [
  {
    badge: "New Collection",
    title: "Elevate Your",
    accent: "Everyday.",
    description: "Discover stylish essentials, curated for comfort, quality and lasting design.",
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1400&q=80",
    link: "/products",
    displayOrder: 0,
  },
  {
    badge: "Best Sellers",
    title: "Comfort Made",
    accent: "Beautiful.",
    description: "Sofas and lounge chairs our customers keep coming back for.",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1400&q=80",
    link: "/products?sortBy=popularity",
    displayOrder: 1000,
  },
  {
    badge: "Just In",
    title: "Fresh Pieces,",
    accent: "Every Week.",
    description: "The latest arrivals for your living room, bedroom and workspace.",
    image:
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1400&q=80",
    link: "/products?sortBy=newest",
    displayOrder: 2000,
  },
];

const HERO_PLACEMENTS = ["hero_0", "hero_1", "hero_2", "hero_3", "hero_4", "hero_5"];

// Admin banners carry a single title; colour its last word to match the two-tone headline.
const splitTitle = (title = "") => {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return { title: "", accent: words[0] || "" };
  return { title: words.slice(0, -1).join(" "), accent: words[words.length - 1] };
};

const bannerToCard = (banner) => {
  if (!banner || !banner.image?.secure_url) return null;
  return {
    ...splitTitle(banner.title),
    description: banner.subtitle || "",
    badge: banner.tagline || null,
    image: banner.image?.secure_url,
    link: banner.redirectLink || "#",
  };
};

const HeroSection = () => {
  const dispatch = useDispatch();
  const swiperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

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

    return bannersWithOrder.sort((a, b) => a.displayOrder - b.displayOrder);
  }, [placement0, placement1, placement2, placement3, placement4, placement5]);

  const hasMany = allBanners.length > 1;

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white bg-[linear-gradient(115deg,#fbfaff_0%,#efedff_45%,#dcd6ff_100%)] shadow-[0_40px_80px_-40px_rgba(91,79,245,0.6)]">
      {/* Ambient decoration */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="hero-grid absolute inset-0" />
        <div className="absolute -right-24 -top-28 h-96 w-96 rounded-full bg-[#8b5cf6]/30 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-[#d946ef]/15 blur-3xl" />
      </div>
      <Swiper
        ref={swiperRef}
        modules={[Autoplay, EffectFade]}
        slidesPerView={1}
        loop={hasMany}
        autoplay={{ delay: 6000, disableOnInteraction: false, pauseOnMouseEnter: true }}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
        className="w-full"
      >
        {allBanners.map((banner, index) => (
          <SwiperSlide key={index} className="!h-auto">
            <div className="grid h-full items-center gap-6 px-6 pt-8 pb-16 sm:px-10 sm:pt-10 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-14 lg:py-12">
              <div className="max-w-xl">
                {/* Fixed-height copy area: keeps the buttons below at the same spot on every slide */}
                <div className="[.swiper-slide-active_&]:animate-rise-in">
                  <div className="mb-5 flex h-8 items-center">
                    {banner.badge && (
                      <p className="glass-panel inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand shadow-sm">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                        </span>
                        {banner.badge}
                      </p>
                    )}
                  </div>
                  <h2 className="font-display h-[2.4em] overflow-hidden text-4xl font-extrabold leading-[1.04] tracking-tight text-espresso sm:text-5xl lg:text-[4.25rem]">
                    {banner.title && <span className="block truncate">{banner.title}</span>}
                    {banner.accent && <span className="text-gradient-brand block truncate pb-2">{banner.accent}</span>}
                  </h2>
                  <p className="mt-3 h-[3.25em] max-w-md overflow-hidden text-sm leading-relaxed text-mocha sm:text-base line-clamp-2">
                    {banner.description}
                  </p>
                </div>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    to={banner.link}
                    className="group inline-flex items-center gap-3 rounded-full bg-espresso py-2 pl-6 pr-2 text-sm font-semibold text-white shadow-[0_16px_30px_-14px_rgba(20,20,43,0.8)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_22px_36px_-14px_rgba(91,79,245,0.7)] active:translate-y-0"
                  >
                    Shop Now
                    <span className="bg-gradient-brand flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-[-35deg]">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                  <Link
                    to="/categories"
                    className="glass-panel inline-flex items-center gap-2 rounded-full px-6 py-[13px] text-sm font-semibold text-espresso shadow-[0_10px_24px_-14px_rgba(20,20,43,0.4)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:text-brand active:translate-y-0"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Browse Categories
                  </Link>
                </div>
              </div>

              <Link to={banner.link} className="group relative block" aria-label={[banner.title, banner.accent].filter(Boolean).join(" ")}>
                <div className="relative aspect-[4/3] overflow-hidden rounded-[32px] bg-white/50 shadow-[0_40px_70px_-34px_rgba(60,50,160,0.65)] ring-4 ring-white/70 lg:aspect-[5/4] lg:max-h-[420px] lg:w-full">
                  <img
                    src={banner.image}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso/25 via-transparent to-transparent" />
                </div>

                {/* Floating glass accents */}
                <span className="glass-panel animate-float-soft-delayed absolute -left-3 top-6 hidden h-12 w-12 items-center justify-center rounded-2xl text-brand shadow-[0_16px_30px_-14px_rgba(60,50,160,0.6)] sm:flex lg:-left-5">
                  <Sparkles className="h-5 w-5" />
                </span>
              </Link>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {hasMany && (
        <div className="absolute bottom-4 right-5 z-10 flex items-center gap-3 sm:right-8 lg:bottom-2 lg:right-14">
          <button
            type="button"
            onClick={() => swiperRef.current?.swiper?.slidePrev()}
            className="glass-panel flex h-9 w-9 items-center justify-center rounded-full text-espresso shadow-md transition-all duration-200 hover:!bg-espresso hover:text-white active:scale-90"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {allBanners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => swiperRef.current?.swiper?.slideToLoop(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === activeIndex}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'w-5 bg-brand' : 'w-1.5 bg-white hover:bg-brand/50'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => swiperRef.current?.swiper?.slideNext()}
            className="glass-panel flex h-9 w-9 items-center justify-center rounded-full text-espresso shadow-md transition-all duration-200 hover:!bg-espresso hover:text-white active:scale-90"
            aria-label="Next slide"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
