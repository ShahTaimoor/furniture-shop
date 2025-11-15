import { Link } from "react-router-dom";
import { useMemo } from "react";

const furnitureCategories = [
  "Living Room",
  "Bedroom",
  "Dining & Kitchen",
  "Home Office",
  "Outdoor",
  "Decor & Lighting",
];

const customerLinks = [
  { label: "Shipping & Delivery", to: "/shipping" },
  { label: "Returns & Exchanges", to: "/returns" },
  { label: "Care & Maintenance", to: "/care" },
  { label: "Warranty", to: "/warranty" },
  { label: "Track Order", to: "/orders" },
];

const contactInfo = [
  { label: "Showroom", value: "88 Furniture Blvd, Islamabad" },
  { label: "Customer Care", value: "+92 311 400 0096" },
  { label: "Studio", value: "Studio@hellas.pk" },
];

const Footer = () => {
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <footer className="bg-neutral-950 text-neutral-200">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="text-2xl font-semibold tracking-wide text-white">
              HELLAS Furnishings
            </Link>
            <p className="text-sm text-neutral-400">
              Contemporary furniture, custom upholstery, and handcrafted accessories
              designed for modern Pakistani homes.
            </p>
            <div className="text-xs uppercase text-neutral-500">
              Open daily 10am – 8pm
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              Furniture
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-neutral-400">
              {furnitureCategories.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="transition hover:text-white"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              Customer care
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-neutral-400">
              {customerLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="transition hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              Contact
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-neutral-400">
              {contactInfo.map((item) => (
                <li key={item.label}>
                  <p className="text-xs uppercase text-neutral-500">
                    {item.label}
                  </p>
                  <p>{item.value}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-neutral-800 pt-6 text-sm text-neutral-500 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} HELLAS Furnishings. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-white transition">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-white transition">
              Terms
            </Link>
            <Link to="/contact" className="hover:text-white transition">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;