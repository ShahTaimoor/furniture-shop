import SEO from '@/components/seo/SEO';

const About = () => {
  return (
    <>
      <SEO
        title="About Us"
        description="Learn how Ecommerce blends quality design, sustainable materials, and white-glove service to craft modern shopping experiences."
        keywords={['about Ecommerce', 'Ecommerce story', 'online shopping']}
        openGraph={{ title: 'About Ecommerce' }}
      />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <section className="space-y-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900">Our Story</h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-3xl mx-auto">
            Ecommerce is your destination for carefully curated products inspired by
            quality principles. We blend craftsmanship, reliability, and smart
            logistics to help you find pieces that fit your lifestyle.
          </p>
        </section>

        <section className="mt-8 sm:mt-10 grid gap-4 sm:gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
          <div className="space-y-2 border-b border-slate-100 pb-4 md:border-b-0 md:border-r md:pr-6">
            <h2 className="text-base font-bold text-slate-900">Quality First</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Our team works with curated suppliers and artisans to deliver pieces that adapt to any lifestyle.
            </p>
          </div>
          <div className="space-y-2 border-b border-slate-100 pb-4 md:border-b-0 md:border-r md:px-6">
            <h2 className="text-base font-bold text-slate-900">Reliable & Fast</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              We prioritise fast delivery, secure payments, and verified genuine products.
            </p>
          </div>
          <div className="space-y-2 md:pl-6">
            <h2 className="text-base font-bold text-slate-900">Customer Obsessed</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              From shopping inspiration to post-purchase support, we are committed to frictionless experiences.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8 text-center shadow-sm">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Crafted for convenience. Built to satisfy.
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto">
            Explore our curated catalogue, exclusive deals, and dependable customer support every step of the way.
          </p>
        </section>
      </div>
    </>
  );
};

export default About;

