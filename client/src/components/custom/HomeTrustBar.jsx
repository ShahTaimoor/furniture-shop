import React from 'react';
import { useSelector } from 'react-redux';
import { ShieldCheck, Truck, Wallet, BadgeCheck, Sparkles } from 'lucide-react';
import { selectHomeTrustBadges } from '@/redux/slices/settings/settingsSlice';

const ICONS = {
  shield: ShieldCheck,
  truck: Truck,
  wallet: Wallet,
  badge: BadgeCheck,
  spark: Sparkles,
};

const HomeTrustBar = () => {
  const badges = useSelector(selectHomeTrustBadges);
  if (!Array.isArray(badges) || badges.length === 0) return null;

  return (
    <section className="max-w-[1800px] mx-auto">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {badges.map((badge, i) => {
          const Icon = ICONS[badge.icon] || ShieldCheck;
          return (
            <div
              key={`${badge.title}-${i}`}
              className="glass-panel group flex items-center gap-3 rounded-2xl px-3 py-3 sm:px-4 sm:py-4 shadow-[0_10px_30px_-22px_rgba(60,50,160,0.5)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_22px_40px_-22px_rgba(91,79,245,0.55)]"
            >
              <span className="bg-gradient-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_10px_18px_-8px_rgba(91,79,245,0.7)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-espresso leading-tight">{badge.title}</span>
                {badge.subtitle && (
                  <span className="mt-0.5 block text-[11px] text-mocha leading-tight truncate">{badge.subtitle}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default HomeTrustBar;
