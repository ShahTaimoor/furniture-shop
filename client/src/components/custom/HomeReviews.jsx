import React from 'react';
import { useSelector } from 'react-redux';
import { Star, Quote } from 'lucide-react';
import { selectHomeReviews } from '@/redux/slices/settings/settingsSlice';

const Stars = ({ value = 5 }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${i < Math.round(value) ? 'fill-caramel text-caramel' : 'text-latte'}`}
      />
    ))}
  </div>
);

const HomeReviews = () => {
  const reviews = useSelector(selectHomeReviews);
  if (!Array.isArray(reviews) || reviews.length === 0) return null;

  return (
    <section className="max-w-[1800px] mx-auto">
      <div className="mb-3 text-center md:mb-5">
        <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">Reviews</p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-espresso tracking-tight">
          Trusted by Enthusiasts
        </h2>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        {reviews.slice(0, 3).map((review, i) => (
          <figure
            key={`${review.name}-${i}`}
            className="glass-panel relative flex flex-col gap-3 rounded-3xl p-6 shadow-[0_10px_30px_-22px_rgba(60,50,160,0.5)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_24px_44px_-24px_rgba(91,79,245,0.55)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><Quote className="h-4 w-4" /></span>
            <blockquote className="flex-1 text-sm leading-relaxed text-mocha">“{review.text}”</blockquote>
            <figcaption className="flex items-center justify-between border-t border-latte pt-3">
              <span className="text-xs">
                <span className="block font-bold text-espresso">{review.name}</span>
                {review.location && <span className="block text-mocha/70">{review.location}</span>}
              </span>
              <Stars value={Number(review.rating) || 5} />
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};

export default HomeReviews;
