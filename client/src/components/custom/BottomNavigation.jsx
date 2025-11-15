import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingCart, User, Package, Grid3x3, Heart } from "lucide-react";
import { useSelector } from "react-redux";
import { useMemo } from "react";
import { Badge } from "../ui/badge";
import { useAuthDrawer } from "../../contexts/AuthDrawerContext";
import { selectWishlistItems } from "@/redux/slices/wishlist/wishlistSlice";

const BottomNavigation = () => {
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const { items: cartItems = [] } = useSelector((state) => state.cart);
  const wishlistItems = useSelector(selectWishlistItems);
  const { openAuthDrawer } = useAuthDrawer();
  
  // Calculate total quantity
  const totalQuantity = useMemo(() => 
    cartItems.reduce((sum, item) => sum + item.quantity, 0), 
    [cartItems]
  );
  const wishlistCount = wishlistItems.length;

  // Don't render on desktop - but ensure it shows on mobile
  // Add debugging to check mobile detection
  
  // Always render but use responsive classes for visibility
  // if (!isMobile) return null;

  const navItems = [
    {
      path: "/orders",
      icon: Package,
      label: "Orders",
      show: true,
      requiresAuth: true
    },
    {
      path: "/",
      icon: Home,
      label: "Home",
      show: true,
      isCenter: true,
      isHome: true
    },
    {
      path: "/products",
      icon: Grid3x3,
      label: "Products",
      show: true
    },
    {
      path: "/wishlist",
      icon: Heart,
      label: "Wishlist",
      show: true,
      requiresAuth: true,
      isWishlist: true
    },
    {
      path: "/profile",
      icon: User,
      label: "Profile",
      show: true,
      requiresAuth: true
    }
  ];

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
     

      {/* Bottom Navigation - Matching the design */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-lg lg:hidden">
        <div className="flex items-end justify-around px-2 pb-3 pt-3 relative">
        {navItems.map((item, index) => {
          if (!item.show) return null;
          
          const Icon = item.icon;
          const active = isActive(item.path) || (item.isHome && location.pathname === "/");
          
          const handleNavClick = (event) => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (item.requiresAuth && !user) {
              event.preventDefault();
              openAuthDrawer('login');
            }
          };
          
          return (
            <Link
              key={`${item.path}-${index}`}
              to={item.path}
              onClick={handleNavClick}
              className={`flex flex-col items-center justify-center relative transition-all duration-300 flex-1`}
            >
              {item.isCenter ? (
                // Center Home button with floating orange circle
                <div className="relative -mt-2 mb-1">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
                    active 
                      ? "bg-primary scale-100" 
                      : "bg-gray-300 scale-90"
                  }`}>
                    <Icon 
                      size={24} 
                      className="text-white transition-all duration-300"
                      strokeWidth={2.5}
                    />
                    {/* Small horizontal line at bottom (door/base effect) */}
                    <div className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-0.5 rounded-full transition-opacity duration-300 ${
                      active ? "bg-white/40 opacity-100" : "opacity-0"
                    }`}></div>
                  </div>
                </div>
              ) : (
                // Inactive items - just icons, no background, light gray/silver color
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <div className="relative">
                    <Icon 
                      size={22} 
                      className={`transition-all duration-300 ${
                        active ? "text-primary" : "text-gray-400"
                      }`}
                      strokeWidth={1.5}
                      fill="none"
                    />
                    {item.isWishlist && wishlistCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 text-[9px] px-1.5 py-0.5 bg-red-500 text-white border-0 min-w-[16px] h-[16px] flex items-center justify-center rounded-full">
                        {wishlistCount > 9 ? '9+' : wishlistCount}
                      </Badge>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium transition-all duration-300 ${
                    active ? "text-primary" : "text-gray-400"
                  }`}>{item.label}</span>
                </div>
              )}
            </Link>
          );
        })}

        {/* Cart link */}
        <Link
          to="/cart"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex flex-col items-center justify-center flex-1 py-1 relative"
        >
          <div className="flex flex-col items-center justify-center gap-0.5">
            <div className="relative">
              <ShoppingCart
                size={22}
                className={`transition-all duration-300 ${
                  location.pathname.startsWith('/cart') ? "text-primary" : "text-gray-400"
                }`}
                strokeWidth={1.5}
                fill="none"
              />
              {totalQuantity > 0 && (
                <Badge className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 bg-primary text-white border-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                  {totalQuantity > 9 ? '9+' : totalQuantity}
                </Badge>
              )}
            </div>
            <span className={`text-[10px] font-medium transition-all duration-300 ${
              location.pathname.startsWith('/cart') ? "text-primary" : "text-gray-400"
            }`}>Cart</span>
          </div>
        </Link>

      </div>
    </nav>
    </>
  );
};

export default BottomNavigation;
