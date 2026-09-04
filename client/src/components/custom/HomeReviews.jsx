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
    <section className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6">
      <div className="mb-3 text-center md:mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-caramel-deep mb-1">Reviews</p>
        <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-semibold text-espresso tracking-tight">
          Trusted by Enthusiasts
        </h2>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        {reviews.slice(0, 3).map((review, i) => (
          <figure
            key={`${review.name}-${i}`}
            className="relative flex flex-col gap-3 rounded-2xl border border-latte bg-card p-5 shadow-[0_1px_2px_rgba(43,29,23,0.05)]"
          >
            <Quote className="h-5 w-5 text-caramel/40" />
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
