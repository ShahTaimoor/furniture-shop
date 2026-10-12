import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Home, LayoutGrid, Layers, Heart, ShoppingCart, Tag, Headphones, Store } from 'lucide-react';
import { useAuthDrawer } from '@/contexts/AuthDrawerContext';
import { selectSiteName } from '@/redux/slices/settings/settingsSlice';

const railItems = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Categories', to: '/categories', icon: LayoutGrid },
  { label: 'Collections', to: '/products', icon: Layers },
  { label: 'Wishlist', to: '/wishlist', icon: Heart, requiresAuth: true, countKey: 'wishlist' },
  { label: 'Orders', to: '/orders', icon: ShoppingCart, requiresAuth: true },
  { label: 'Deals', to: '/products?sortBy=sale', icon: Tag },
  { label: 'Support', to: '/contact', icon: Headphones },
];

/**
 * Desktop-only icon rail pinned to the left edge. Mobile keeps BottomNavigation.
 */
const SideRail = () => {
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const wishlistCount = useSelector((state) => state.wishlist.items.length);
  const siteName = useSelector(selectSiteName);
  const { openAuthDrawer } = useAuthDrawer();

  const current = `${location.pathname}${location.search}`;
  const isActive = (to) => {
    if (to.includes('?')) return current === to;
    if (to === '/') return location.pathname === '/';
    // "/products" must not light up while the Deals link (a /products query) is active.
    return location.pathname.startsWith(to) && !railItems.some((item) => item.to === current && item.to !== to);
  };

  return (
    <aside className="glass-panel fixed bottom-3 left-3 top-3 z-50 hidden w-[68px] flex-col items-center rounded-[26px] py-4 shadow-[0_24px_50px_-26px_rgba(60,50,160,0.5)] lg:flex">
      <Link
        to="/"
        aria-label={siteName || 'Home'}
        className="bg-gradient-brand mb-5 flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-[0_10px_20px_-8px_rgba(91,79,245,0.8)] transition-transform duration-200 hover:scale-105 hover:rotate-3"
      >
        <Store className="h-5 w-5" strokeWidth={2} />
      </Link>

      <nav className="flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto scrollbar-hide" aria-label="Primary">
        {railItems.map(({ label, to, icon: Icon, requiresAuth, countKey }) => {
          const active = isActive(to);
          const count = countKey === 'wishlist' ? wishlistCount : 0;
          return (
            <Link
              key={label}
              to={to}
              onClick={(event) => {
                if (requiresAuth && !user) {
                  event.preventDefault();
                  openAuthDrawer('login', { redirectTo: to });
                }
              }}
              aria-current={active ? 'page' : undefined}
              className="group flex w-full flex-col items-center gap-1 py-1"
            >
              <span
                className={`relative flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  active
                    ? 'bg-gradient-brand text-white shadow-[0_10px_20px_-8px_rgba(91,79,245,0.8)]'
                    : 'text-mocha group-hover:-translate-y-0.5 group-hover:bg-brand-soft group-hover:text-brand'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-medium leading-none ${active ? 'text-brand' : 'text-mocha/80'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default SideRail;
