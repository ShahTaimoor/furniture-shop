import SEO from '@/components/seo/SEO';

const returnWindow = [
  {
    title: '14-Day Furniture Trial',
    detail: 'Test sofas, beds, and storage at home. Keep the packaging for a faster pick-up.',
  },
  {
    title: '7-Day Décor Returns',
    detail: 'Accessories and lighting are eligible for courier pickups or drop-offs at our studio.',
  },
  {
    title: 'Made-to-Order',
    detail: 'Custom dimensions are non-refundable, but we offer paid alteration services.',
  },
];

const returnSteps = [
  'Submit a request via your account or email studio@furniture.pk with photos.',
  'Our quality team responds within 24 hours with pick-up or drop-off instructions.',
  'Refunds are issued to your original payment method within 5–7 working days.',
];

const Returns = () => {
  return (
    <>
      <SEO
        title="Returns & Exchanges | FURNITURE"
        description="Understand how to initiate a return or exchange with FURNITURE, including timelines, conditions, and refund processing."
        keywords={['Furniture returns policy', 'furniture exchange Pakistan', 'return window Furniture']}
        openGraph={{ type: 'article' }}
      />
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-10">
        <header className="space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Customer Care
          </p>
          <h1 className="text-4xl font-bold text-gray-900">Returns & Exchanges</h1>
          <p className="mx-auto max-w-2xl text-base text-gray-600">
            We stand behind every piece we craft. If something isn’t quite right, let us make it right with
            quick returns, easy exchanges, and hands-on support.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {returnWindow.map((item) => (
            <article key={item.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
              <p className="mt-3 text-sm text-gray-600">{item.detail}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-neutral-50 p-8">
          <h2 className="text-2xl font-semibold text-gray-900">How to start a return</h2>
          <ol className="mt-4 space-y-3 text-sm text-gray-700">
            {returnSteps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <h2 className="text-xl font-semibold text-red-800">Return checklist</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-red-900">
            <li>Items must be in saleable condition without stains, scratches, or odors.</li>
            <li>Include all hardware, accessories, and documentation that shipped with your item.</li>
            <li>Mattresses and textiles are eligible for exchange only if sealed packaging is intact.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Need assistance?</h2>
          <p className="mt-2 text-sm text-gray-600">
            Message us on WhatsApp (+92 311 400 0096) or email studio@furniture.pk with your order number.
          </p>
        </section>
      </div>
    </>
  );
};

export default Returns;

