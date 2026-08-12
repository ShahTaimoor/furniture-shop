import SEO from '@/components/seo/SEO';

const deliveryOptions = [
  {
    title: 'White-Glove Delivery',
    detail: 'Premium two-person team that handles assembly, placement, and packaging removal for oversized pieces.',
    time: '3 – 7 business days',
  },
  {
    title: 'Scheduled Standard',
    detail: 'Doorstep delivery with flexible evening and weekend slots in major cities.',
    time: '4 – 10 business days',
  },
  {
    title: 'Express Parcel',
    detail: 'Small accessories and décor items ship via partner couriers with live tracking updates.',
    time: '1 – 3 business days',
  },
];

const shippingMilestones = [
  {
    label: 'Order Confirmed',
    description: 'You receive an email summary plus SMS alert once payment clears.',
  },
  {
    label: 'Crafted & Packed',
    description: 'Our warehouse team performs a 14-point inspection before dispatch.',
  },
  {
    label: 'In Transit',
    description: 'Live tracking link is activated and you can reschedule delivery if needed.',
  },
  {
    label: 'Delivered',
    description: 'Our crew sets up the item, collects signatures, and hauls packaging away.',
  },
];

const Shipping = () => {
  return (
    <>
      <SEO
        title="Shipping & Delivery | Ecommerce"
        description="Learn about Ecommerce shipping speeds, delivery windows, and how to track your furniture order from our Islamabad warehouse to your home."
        keywords={['Furniture shipping policy', 'furniture delivery Pakistan', 'white glove delivery']}
        openGraph={{ type: 'article' }}
      />
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-10">
        <header className="space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Customer Care
          </p>
          <h1 className="text-4xl font-bold text-gray-900">Shipping & Delivery</h1>
          <p className="mx-auto max-w-3xl text-base text-gray-600">
            Every order leaves our Islamabad fulfillment hub with climate-controlled transport,
            proactive communication, and a delivery team trained to handle premium furniture.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {deliveryOptions.map((option) => (
            <article
              key={option.title}
              className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur"
            >
              <p className="text-xs uppercase tracking-wide text-primary">{option.time}</p>
              <h2 className="mt-2 text-lg font-semibold text-gray-900">{option.title}</h2>
              <p className="mt-3 text-sm text-gray-600">{option.detail}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-neutral-50 p-8">
          <h2 className="text-2xl font-semibold text-gray-900">Your delivery timeline</h2>
          <p className="mt-2 text-sm text-gray-600">
            We’ll keep you posted at each milestone below. Prefer WhatsApp updates? Opt in at checkout.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {shippingMilestones.map((step) => (
              <div key={step.label} className="rounded-xl border border-dashed border-gray-300 bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{step.label}</p>
                <p className="mt-2 text-sm text-gray-700">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Frequently asked</h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm text-gray-600">
            <li>
              Rural deliveries may need an extra 2 business days. Our team will confirm before dispatch.
            </li>
            <li>
              Need us to hold your order? We can store items for up to 21 days at no additional charge.
            </li>
            <li>
              For apartment deliveries, make sure the lift and hallway clearance support your item dimensions.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
};

export default Shipping;

