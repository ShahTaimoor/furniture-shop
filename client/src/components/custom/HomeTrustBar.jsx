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
    <section className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6">
      <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-latte bg-card p-3 sm:grid-cols-4 sm:gap-3 sm:p-4 shadow-[0_1px_2px_rgba(43,29,23,0.05)]">
        {badges.map((badge, i) => {
          const Icon = ICONS[badge.icon] || ShieldCheck;
          return (
            <div key={`${badge.title}-${i}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-latte-soft text-caramel-deep">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-espresso leading-tight">{badge.title}</span>
                {badge.subtitle && (
                  <span className="block text-[11px] text-mocha leading-tight truncate">{badge.subtitle}</span>
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
