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
    <section className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6">
      <div className="overflow-hidden rounded-2xl bg-espresso bg-grain px-5 py-8 sm:px-10 sm:py-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-cream tracking-tight">
              {heading}
            </h2>
            {subtext && <p className="mt-2 text-sm text-latte/80">{subtext}</p>}
          </div>

          <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-full border border-latte/20 bg-cream py-3 pl-11 pr-4 text-sm text-espresso placeholder:text-mocha/60 focus:border-caramel focus:outline-none focus:ring-2 focus:ring-caramel/30"
              />
            </div>
            <button
              type="submit"
              className="btn-3d inline-flex items-center justify-center gap-2 rounded-full bg-caramel px-6 py-3 text-sm font-semibold text-espresso transition-colors hover:bg-caramel-deep hover:text-cream"
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
