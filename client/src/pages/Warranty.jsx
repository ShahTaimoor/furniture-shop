import SEO from '@/components/seo/SEO';

const coverage = [
  {
    title: 'Structure & Frames',
    duration: '5 years',
    detail: 'Includes kiln-dried wood frames, joinery, and structural integrity under normal residential use.',
  },
  {
    title: 'Foam & Cushions',
    duration: '3 years',
    detail: 'Covers sagging greater than 2.5 cm or early breakdown of high-density foam cores.',
  },
  {
    title: 'Mechanisms & Hardware',
    duration: '2 years',
    detail: 'Protects recliner mechanisms, extension runners, hinges, and lift-up systems.',
  },
];

const exclusions = [
  'Natural variations in wood grain, stone veining, or hand-finished textiles.',
  'Damage from improper cleaning agents, direct heat, or prolonged outdoor exposure.',
  'Commercial or rental usage unless covered by a separate service agreement.',
];

const claimSteps = [
  'Collect your order number, purchase date, and clear photos/video of the issue.',
  'Email studio@furniture.pk or submit a ticket inside your account portal.',
  'Our care team replies within one business day with next steps or technician scheduling.',
];

const Warranty = () => {
  return (
    <>
      <SEO
        title="Warranty | Ecommerce"
        description="Discover what our warranty covers, how to file a claim, and the support you can expect after your Ecommerce furniture is delivered."
        keywords={['Furniture warranty coverage', 'furniture warranty Pakistan', 'Furniture claim process']}
        openGraph={{ type: 'article' }}
      />
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-10">
        <header className="space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Customer Care</p>
          <h1 className="text-4xl font-bold text-gray-900">Warranty Promise</h1>
          <p className="mx-auto max-w-2xl text-base text-gray-600">
            Built-to-last craftsmanship deserves built-to-last support. Our warranty keeps you covered well after delivery day.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {coverage.map((item) => (
            <article key={item.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-primary">{item.duration} coverage</p>
              <h2 className="mt-2 text-lg font-semibold text-gray-900">{item.title}</h2>
              <p className="mt-3 text-sm text-gray-600">{item.detail}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-xl font-semibold text-amber-900">What’s not covered</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-900">
            {exclusions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-neutral-50 p-8">
          <h2 className="text-2xl font-semibold text-gray-900">How to file a claim</h2>
          <ol className="mt-4 space-y-3 text-sm text-gray-700">
            {claimSteps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-900/80 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-gray-600">
            If repair isn’t feasible, we’ll replace the component or item, or offer store credit equal to the original purchase price.
          </p>
        </section>
      </div>
    </>
  );
};

export default Warranty;

