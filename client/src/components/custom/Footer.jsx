import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import {
  selectSiteName,
  selectSiteLogo,
  selectFooterDescription,
  selectFooterHours,
  selectFooterShowroomAddress,
  selectFooterCarePhone,
  selectFooterStudioEmail,
  selectFooterCustomerCareLinks,
} from "@/redux/slices/settings/settingsSlice";

const Footer = () => {
  const year = useMemo(() => new Date().getFullYear(), []);

  const siteName = useSelector(selectSiteName);
  const siteLogo = useSelector(selectSiteLogo);
  const description = useSelector(selectFooterDescription);
  const hours = useSelector(selectFooterHours);
  const showroomAddress = useSelector(selectFooterShowroomAddress);
  const carePhone = useSelector(selectFooterCarePhone);
  const studioEmail = useSelector(selectFooterStudioEmail);
  const customerCareLinks = useSelector(selectFooterCustomerCareLinks);

  const contactInfo = [
    { label: "Showroom", value: showroomAddress },
    { label: "Customer Care", value: carePhone },
    { label: "Studio", value: studioEmail },
  ];

  return (
    <footer className="bg-espresso text-latte bg-grain">
      <div className="mx-auto max-w-[1800px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 font-display text-2xl font-semibold tracking-wide text-cream">
              {siteLogo?.secure_url ? (
                <img src={siteLogo.secure_url} alt={siteName} className="h-8 w-auto" />
              ) : null}
              {siteName}
            </Link>
            <p className="text-sm text-latte/70">{description}</p>
            <div className="text-xs uppercase tracking-[0.14em] text-caramel">{hours}</div>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-cream">
              Customer care
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-latte/70">
              {customerCareLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.url || '#'} className="transition-colors duration-200 hover:text-caramel">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-cream">
              Contact
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-latte/70">
              {contactInfo.map((item) => (
                <li key={item.label}>
                  <p className="text-xs uppercase tracking-[0.14em] text-caramel/80">
                    {item.label}
                  </p>
                  <p>{item.value}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-latte/15 pt-6 text-sm text-latte/60 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} {siteName}. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-caramel transition-colors duration-200">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-caramel transition-colors duration-200">
              Terms
            </Link>
            <Link to="/contact" className="hover:text-caramel transition-colors duration-200">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
