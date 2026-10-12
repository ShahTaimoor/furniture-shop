import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Mail, MessageCircle, ArrowRight } from 'lucide-react';
import {
  selectNewsletterHeading,
  selectNewsletterSubtext,
  selectFooterCarePhone,
} from '@/redux/slices/settings/settingsSlice';

const HomeNewsletter = () => {
  const heading = useSelector(selectNewsletterHeading);
  const subtext = useSelector(selectNewsletterSubtext);
  const phone = useSelector(selectFooterCarePhone);
  const [email, setEmail] = useState('');

  const whatsappHref = phone
    ? `https://wa.me/${String(phone).replace(/[^\d]/g, '')}`
    : null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.warning('Please enter a valid email address.');
      return;
    }
    toast.success('You’re on the list — watch your inbox for that discount.');
    setEmail('');
  };

  return (
    <section className="max-w-[1800px] mx-auto">
      <div className="relative overflow-hidden rounded-[28px] bg-espresso bg-[radial-gradient(40rem_20rem_at_15%_0%,rgba(91,79,245,0.55),transparent_60%),radial-gradient(36rem_18rem_at_90%_110%,rgba(217,70,239,0.35),transparent_60%)] px-5 py-10 sm:px-10 sm:py-14 shadow-[0_30px_60px_-30px_rgba(20,20,43,0.7)]">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {heading}
            </h2>
            {subtext && <p className="mt-2 text-sm text-latte/80">{subtext}</p>}
          </div>

          <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/60" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-full border border-white/20 bg-white/10 py-3 pl-11 pr-4 text-sm text-white backdrop-blur placeholder:text-white/50 focus:border-white/50 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
            <button
              type="submit"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-espresso shadow-[0_14px_30px_-12px_rgba(255,255,255,0.5)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              Subscribe
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold text-latte/80 transition-colors hover:text-caramel"
            >
              <MessageCircle className="h-4 w-4" />
              Prefer WhatsApp? Message us on {phone}
            </a>
          )}
        </div>
      </div>
    </section>
  );
};

export default HomeNewsletter;
