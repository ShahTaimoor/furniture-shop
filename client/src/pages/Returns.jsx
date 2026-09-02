import SEO from '@/components/seo/SEO';
import { RotateCcw, ShieldCheck } from 'lucide-react';

const returnHighlights = [
  {
    title: '14-Day Return Policy',
    description:
      'We accept returns for items in original condition within 14 days of delivery. Custom pieces require inspection approval.',
    icon: RotateCcw,
  },
  {
    title: 'Instant Support',
    description:
      'Submit a request via your account or email support@ecommerce.pk with photos.',
    icon: ShieldCheck,
  },
];

const Returns = () => {
  return (
    <>
      <SEO
        title="Returns & Exchanges"
        description="Understand how Ecommerce handles returns, replacements, and refunds. Simple step-by-step guidance."
        keywords={['Ecommerce returns policy', 'returns exchange Pakistan', 'return window']}
        openGraph={{ type: 'article' }}
      />
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-12">
        <header className="space-y-4 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Returns & Exchanges</h1>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            We want you to love your purchase. If a piece isn’t quite right, we’re here to make the return or exchange process smooth and transparent.
          </p>
        </header>

        <section className="grid gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2">
          {returnHighlights.map(({ title, description, icon: Icon }) => (
            <div key={title} className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Icon className="h-6 w-6" />
              </span>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-6 rounded-2xl border border-gray-200 bg-slate-50 p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">How to start a return</h2>
          <ol className="space-y-4 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                1
              </span>
              <span>
                Log into your account, locate the order in your dashboard, and select{" "}
                <strong className="font-semibold text-gray-900">Request Return</strong>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                2
              </span>
              <span>
                Attach clear photos showing the condition of the item and its original packaging.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                3
              </span>
              <span>
                Our care team will review your request within 24 hours and arrange a courier pickup.
              </span>
            </li>
          </ol>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-gray-600">
            Need urgent assistance?{" "}
            Message us on WhatsApp (+92 311 400 0096) or email support@ecommerce.pk with your order number.
          </div>
        </section>
      </div>
    </>
  );
};

export default Returns;

