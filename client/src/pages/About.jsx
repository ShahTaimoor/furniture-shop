import SEO from '@/components/seo/SEO';

const About = () => {
  return (
    <>
      <SEO
        title="About FURNITURE"
        description="Learn how FURNITURE blends Scandinavian-inspired design, sustainable materials, and white-glove service to craft modern furniture experiences."
        keywords={['about Furniture', 'furniture brand story', 'sustainable furniture']}
        openGraph={{ type: 'article' }}
      />
      <div className="mx-auto max-w-5xl px-4 py-12">
      <section className="space-y-6 text-center">
        <h1 className="text-4xl font-bold text-gray-900">Our Story</h1>
        <p className="text-base text-gray-600">
          Furniture is your destination for carefully curated furniture and homeware inspired by
          Scandinavian design principles. We blend craftsmanship, sustainability, and smart
          logistics to help you create spaces that feel welcoming and resilient.
        </p>
      </section>

      <section className="mt-12 grid gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <div className="space-y-3 border-b border-gray-100 pb-4 md:border-b-0 md:border-r md:pr-6">
          <h2 className="text-lg font-semibold text-gray-900">Design First</h2>
          <p className="text-sm text-gray-600">
            Our team works with designers and artisans to build timeless pieces that adapt to any
            lifestyle.
          </p>
        </div>
        <div className="space-y-3 border-b border-gray-100 pb-4 md:border-b-0 md:border-r md:px-6">
          <h2 className="text-lg font-semibold text-gray-900">Planet Conscious</h2>
          <p className="text-sm text-gray-600">
            We prioritise responsibly sourced materials and traceable supply chains to reduce waste.
          </p>
        </div>
        <div className="space-y-3 md:pl-6">
          <h2 className="text-lg font-semibold text-gray-900">Customer Obsessed</h2>
          <p className="text-sm text-gray-600">
            From guided inspiration to post-purchase support, we are committed to frictionless
            experiences.
          </p>
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-gray-200 bg-gradient-to-r from-primary/10 via-white to-primary/10 p-8 text-center shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900">
          Built for modern homes. Crafted to last.
        </h2>
        <p className="mt-3 text-sm text-gray-600">
          Follow our journey as we continue to launch climate-positive collections, exclusive
          collaborations, and services tailored for renters and homeowners alike.
        </p>
      </section>
      </div>
    </>
  );
};

export default About;

