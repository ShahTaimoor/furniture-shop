import SEO from '@/components/seo/SEO';

const careGuides = [
  {
    title: 'Solid Wood',
    tips: [
      'Dust weekly with a microfiber cloth and follow up with a plant-based polish every quarter.',
      'Immediately blot spills to prevent water rings—avoid harsh chemicals or glass cleaners.',
      'Keep pieces away from direct sunlight and heating vents to limit warping.',
    ],
  },
  {
    title: 'Performance Fabrics',
    tips: [
      'Vacuum cushions using the upholstery attachment at least twice a month.',
      'Treat stains quickly using a mild soap solution; always test on a hidden seam first.',
      'Rotate and fluff loose cushions to maintain shape and even wear.',
    ],
  },
  {
    title: 'Metals & Hardware',
    tips: [
      'Wipe with a soft damp cloth—abrasive pads can scratch powder-coated surfaces.',
      'Tighten screws and fasteners every six months for frequently used pieces.',
      'Apply a rust-inhibiting wax to outdoor hardware ahead of monsoon season.',
    ],
  },
];

const seasonalChecklist = [
  'Monsoon: elevate wooden legs off damp rugs and use silica gel packs inside storage cabinets.',
  'Summer: close sheer blinds during peak hours to reduce UV exposure on upholstery.',
  'Winter: add felt pads under chairs to protect rugs and hardwood from dry-season shifting.',
];

const Care = () => {
  return (
    <>
      <SEO
        title="Care & Maintenance | HELLAS"
        description="Keep your HELLAS furniture looking showroom-fresh with material-specific care tips, seasonal checklists, and pro maintenance services."
        keywords={['Hellas furniture care', 'wood maintenance tips', 'sofa cleaning guide']}
        openGraph={{ type: 'article' }}
      />
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-10">
        <header className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Customer Care</p>
          <h1 className="text-4xl font-bold text-gray-900">Care & Maintenance</h1>
          <p className="mx-auto max-w-3xl text-base text-gray-600">
            Daily rituals and seasonal tune-ups that keep your investment pieces ready for guests, family
            gatherings, and slow Sunday mornings.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {careGuides.map((guide) => (
            <article key={guide.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">{guide.title}</h2>
              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                {guide.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-neutral-900 p-8 text-neutral-50">
          <h2 className="text-2xl font-semibold">Seasonal checklist</h2>
          <p className="mt-2 text-sm text-neutral-200">
            Pakistan’s climate shifts quickly. Use this high-level checklist to keep finishes protected all
            year long.
          </p>
          <ul className="mt-5 space-y-3 text-sm">
            {seasonalChecklist.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-primary" />
                <p>{item}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Need professional care?</h2>
          <p className="mt-3 text-sm text-gray-600">
            Book our on-site refresh service for deep cleaning, oiling, and minor repairs. Available in Islamabad,
            Lahore, Karachi, and soon Faisalabad.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <a
              href="mailto:studio@hellas.pk?subject=Care%20Service%20Request"
              className="rounded-full bg-primary px-5 py-2 font-semibold text-white"
            >
              Email studio@hellas.pk
            </a>
            <a
              href="https://wa.me/923114000096"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-primary px-5 py-2 font-semibold text-primary"
            >
              WhatsApp our team
            </a>
          </div>
        </section>
      </div>
    </>
  );
};

export default Care;

