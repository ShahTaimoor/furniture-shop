import { useMemo, useState } from "react";
import { toast } from "sonner";
import SEO from "@/components/seo/SEO";

const Contact = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const structuredData = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "HELLAS Experience Centre",
      address: {
        "@type": "PostalAddress",
        streetAddress: "28 Shoreditch High Street",
        addressLocality: "London",
        postalCode: "E1 6PG",
        addressCountry: "GB"
      },
      telephone: "+44 20 7946 0958",
      email: "support@hellas.com",
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          opens: "09:00",
          closes: "18:00"
        }
      ]
    }),
    []
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all fields before submitting.");
      return;
    }
    setIsSubmitting(true);

    setTimeout(() => {
      toast.success("Your message has been sent. We'll be in touch shortly!");
      setForm({ name: "", email: "", message: "" });
      setIsSubmitting(false);
    }, 900);
  };

  return (
    <>
      <SEO
        title="Contact HELLAS Support"
        description="Have a question about delivery, partnerships, or showrooms? Reach the HELLAS support team via email, phone, or our London experience centre."
        keywords={["HELLAS contact", "customer support", "London showroom"]}
        openGraph={{ type: "website" }}
        structuredData={structuredData}
      />
      <div className="mx-auto max-w-5xl px-4 py-12">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">We’d love to hear from you</h1>
          <p className="mt-2 text-sm text-gray-500">
            Our support team is available Monday to Saturday 9:00–18:00 GMT.
          </p>
        </header>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5"
          >
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="message" className="text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                value={form.message}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Tell us how we can help..."
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Submit enquiry"}
            </button>
          </form>

          <aside className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Customer support</h2>
              <p className="mt-2 text-sm text-gray-600">
                Email <span className="font-medium text-gray-900">support@hellas.com</span>{" "}
                or call us on <span className="font-medium text-gray-900">+44 20 7946 0958</span>.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Visit us</h3>
              <p className="mt-2 text-sm text-gray-600">
                Hellas Experience Centre
                <br />
                28 Shoreditch High Street
                <br />
                London, E1 6PG
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Business enquiries</h3>
              <p className="mt-2 text-sm text-gray-600">
                Looking to partner with us? Reach out to{" "}
                <span className="font-medium text-gray-900">partnerships@hellas.com</span>.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default Contact;

