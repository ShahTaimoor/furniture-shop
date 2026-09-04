import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Headset, MapPin } from "lucide-react";
import {
  selectSiteName,
  selectSiteLogo,
  selectFooterShowroomAddress,
  selectFooterCarePhone,
  selectFooterCustomerCareLinks,
  selectFooterFacebookUrl,
  selectFooterWhatsappUrl,
  selectFooterPinterestUrl,
  selectFooterLinkedinUrl,
  selectFooterInstagramUrl,
  selectFooterYoutubeUrl,
} from "@/redux/slices/settings/settingsSlice";

// Brand glyphs as inline SVG paths (lucide has no brand icons).
const ICON_PATHS = {
  facebook:
    "M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z",
  whatsapp:
    "M.06 24l1.68-6.13A11.86 11.86 0 0 1 .13 11.9C.12 5.33 5.46 0 12.03 0a11.82 11.82 0 0 1 8.42 3.49 11.82 11.82 0 0 1 3.49 8.42c0 6.57-5.35 11.9-11.92 11.9a11.9 11.9 0 0 1-5.7-1.45L.06 24zm6.6-3.8c1.68.99 3.28 1.58 5.37 1.58 5.45 0 9.9-4.43 9.9-9.88a9.86 9.86 0 0 0-9.9-9.9C6.6 1.99 2.16 6.43 2.16 11.88c0 2.2.64 3.84 1.72 5.56l-.99 3.63 3.77-.87zM17.5 14.3c-.07-.12-.27-.2-.56-.34-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.9-2.19-.24-.57-.48-.5-.66-.5l-.57-.01c-.2 0-.52.07-.8.37s-1.05 1.02-1.05 2.5 1.08 2.9 1.23 3.1c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.63.72.23 1.38.2 1.9.12.58-.09 1.76-.72 2.01-1.42.25-.69.25-1.28.17-1.4z",
  pinterest:
    "M12 0C5.37 0 0 5.37 0 12c0 5.08 3.15 9.42 7.6 11.17-.1-.95-.2-2.4.04-3.44.22-.94 1.4-6 1.4-6s-.36-.72-.36-1.78c0-1.67.97-2.92 2.17-2.92 1.02 0 1.52.77 1.52 1.69 0 1.03-.66 2.57-1 4-.28 1.2.6 2.17 1.78 2.17 2.14 0 3.78-2.25 3.78-5.5 0-2.88-2.07-4.9-5.02-4.9-3.42 0-5.43 2.56-5.43 5.21 0 1.03.4 2.14.9 2.74.1.12.11.22.08.34l-.33 1.36c-.05.22-.17.27-.4.16-1.5-.7-2.44-2.9-2.44-4.66 0-3.8 2.76-7.29 7.95-7.29 4.17 0 7.42 2.97 7.42 6.95 0 4.15-2.61 7.48-6.24 7.48-1.22 0-2.36-.63-2.75-1.38l-.75 2.85c-.27 1.04-1 2.35-1.49 3.15A12 12 0 1 0 12 0z",
  linkedin:
    "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.2.8 24 1.77 24h20.45c.98 0 1.78-.8 1.78-1.75V1.75C24 .78 23.2 0 22.22 0z",
  instagram:
    "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.12 1.38A5.87 5.87 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.12.66.66 1.33 1.08 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.87 5.87 0 0 0 2.12-1.38 5.87 5.87 0 0 0 1.38-2.12c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.87 5.87 0 0 0-1.38-2.12A5.87 5.87 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.41a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z",
  youtube:
    "M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8zM9.6 15.6V8.4l6.24 3.6-6.24 3.6z",
};

const SocialIcon = ({ name, href }) => {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={name}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-latte bg-card text-mocha transition-all duration-200 hover:-translate-y-0.5 hover:border-caramel hover:bg-caramel hover:text-espresso"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d={ICON_PATHS[name]} />
      </svg>
    </a>
  );
};

const Footer = () => {
  const year = useMemo(() => new Date().getFullYear(), []);

  const siteName = useSelector(selectSiteName);
  const siteLogo = useSelector(selectSiteLogo);
  const address = useSelector(selectFooterShowroomAddress);
  const phone = useSelector(selectFooterCarePhone);
  const companyLinks = useSelector(selectFooterCustomerCareLinks);

  const facebook = useSelector(selectFooterFacebookUrl);
  const whatsapp = useSelector(selectFooterWhatsappUrl);
  const pinterest = useSelector(selectFooterPinterestUrl);
  const linkedin = useSelector(selectFooterLinkedinUrl);
  const instagram = useSelector(selectFooterInstagramUrl);
  const youtube = useSelector(selectFooterYoutubeUrl);

  const socials = [
    { name: "facebook", href: facebook },
    { name: "whatsapp", href: whatsapp },
    { name: "pinterest", href: pinterest },
    { name: "linkedin", href: linkedin },
    { name: "instagram", href: instagram },
    { name: "youtube", href: youtube },
  ].filter((s) => s.href);

  const mapSrc = address
    ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : null;

  return (
    <footer className="border-t border-latte bg-latte-soft/50 text-espresso">
      <div className="mx-auto max-w-[1800px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1.3fr]">
          {/* Brand + contact */}
          <div className="space-y-6">
            <Link to="/" className="inline-flex items-center gap-2">
              {siteLogo?.secure_url ? (
                <img src={siteLogo.secure_url} alt={siteName} className="h-12 w-auto" />
              ) : (
                <span className="font-display text-2xl font-semibold text-espresso">{siteName}</span>
              )}
            </Link>

            {phone && (
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-caramel/15 text-caramel-deep">
                  <Headset className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <span>
                  <span className="block text-xs text-mocha">Got Questions? Call us 24/7!</span>
                  <a
                    href={`tel:${String(phone).replace(/\s+/g, "")}`}
                    className="block font-display text-xl font-semibold text-espresso transition-colors hover:text-caramel-deep"
                  >
                    {phone}
                  </a>
                </span>
              </div>
            )}

            {address && (
              <div className="space-y-1.5">
                <h3 className="font-display text-sm font-semibold text-espresso">Contact Info</h3>
                <p className="flex items-start gap-2 text-sm leading-relaxed text-mocha">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-caramel-deep" />
                  <span>{address}</span>
                </p>
              </div>
            )}

            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {socials.map((s) => (
                  <SocialIcon key={s.name} name={s.name} href={s.href} />
                ))}
              </div>
            )}
          </div>

          {/* Company links */}
          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-espresso">
              Company
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-mocha">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.url || "#"}
                    className="transition-colors duration-200 hover:text-caramel-deep"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Map */}
          {mapSrc && (
            <div className="overflow-hidden rounded-2xl border border-latte bg-card">
              <iframe
                title="Showroom location"
                src={mapSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-56 w-full lg:h-full lg:min-h-[220px]"
              />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-latte bg-latte-soft/70">
        <div className="mx-auto max-w-[1800px] px-4 py-4 text-xs text-mocha sm:px-6 lg:px-8">
          Copyright © 2021–{year} {siteName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
