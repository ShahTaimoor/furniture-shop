import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingCart, User, Package, Grid3x3, MessageCircle, Download, ChevronLeft, ChevronRight, LogOut, Heart, LayoutGrid, Plus } from "lucide-react";
import { useSelector } from "react-redux";
import { useIsMobile } from "../../hooks/use-mobile";
import { useState, useMemo, useEffect } from "react";
import { Badge } from "../ui/badge";
import axios from "axios";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "../ui/sheet";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { removeFromCart, updateCartQuantity } from "../../redux/slices/cart/cartSlice";
import { logout } from "../../redux/slices/auth/authSlice";
import CartImage from "../ui/CartImage";
import Checkout from "../../pages/Checkout";

// Cart Product Component (simplified version for mobile)
const CartProduct = ({ product, quantity, onValidationChange }) => {
  const dispatch = useDispatch();
  const [inputQty, setInputQty] = useState(quantity);
  const { _id, title, price, stock } = product;
  const image = product.image || product.picture?.secure_url;

  const updateQuantity = (newQty) => {
    if (newQty !== quantity && newQty > 0 && newQty <= stock) {
      setInputQty(newQty);
      dispatch(updateCartQuantity({ productId: _id, quantity: newQty }));
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    dispatch(removeFromCart(_id));
    toast.success('Product removed from cart');
  };

  const handleDecrease = (e) => {
    e.stopPropagation();
    if (inputQty > 1) {
      updateQuantity(inputQty - 1);
    }
  };

  const handleIncrease = (e) => {
    e.stopPropagation();
    if (inputQty < stock) {
      updateQuantity(inputQty + 1);
    }
  };

  return (
    <div className="flex justify-between items-center gap-3 p-3 border-b">
      <div className="flex items-center gap-3">
        <CartImage
          src={image}
          alt={title}
          className="w-16 h-12 rounded-lg border object-cover"
          fallback="/fallback.jpg"
          quality={80}
        />
        <div className="max-w-[120px]">
          <h4 className="font-semibold text-xs text-gray-900 line-clamp-2">{title}</h4>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 border rounded-full">
          <button
            onClick={handleDecrease}
            className="w-6 h-6 rounded-l-full flex items-center justify-center text-xs font-bold hover:bg-gray-200"
            disabled={inputQty <= 1}
          >
            −
          </button>
          <span className="w-8 text-center text-xs font-medium">{inputQty}</span>
          <button
            onClick={handleIncrease}
            className="w-6 h-6 rounded-r-full flex items-center justify-center text-xs font-bold hover:bg-gray-200"
            disabled={inputQty >= stock}
          >
            +
          </button>
        </div>
        <button
          onClick={handleRemove}
          className="text-red-500 hover:text-red-600 text-xs"
        >
          Remove
        </button>
      </div>
    </div>
  );
};

const BottomNavigation = () => {
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const { items: cartItems = [] } = useSelector((state) => state.cart);
  const isMobile = useIsMobile();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [openCheckoutDialog, setOpenCheckoutDialog] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Calculate total quantity
  const totalQuantity = useMemo(() => 
    cartItems.reduce((sum, item) => sum + item.quantity, 0), 
    [cartItems]
  );

  const handleBuyNow = () => {
    if (!user) {
      return navigate('/login');
    }
    if (cartItems.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }
    setOpenCheckoutDialog(true);
  };

  // PWA Install functionality
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show install prompt if not already installed
      if (!window.matchMedia('(display-mode: standalone)').matches && 
          window.navigator.standalone !== true) {
        setShowInstallPrompt(true);
      }
    };

    // Check if app is already installed
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          window.navigator.standalone === true) {
        setShowInstallPrompt(false);
        setDeferredPrompt(null);
      }
    };

    // Check if user has already dismissed the install prompt
    const hasUserDismissed = localStorage.getItem('pwa-install-dismissed');
    if (hasUserDismissed) {
      setShowInstallPrompt(false);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    checkIfInstalled();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
        setDeferredPrompt(null);
        toast.success('App installed successfully!');
      } else {
        // User dismissed the install prompt, remember this choice
        localStorage.setItem('pwa-install-dismissed', 'true');
        setShowInstallPrompt(false);
      }
    } else {
      // Fallback for browsers that don't support beforeinstallprompt
      toast.info('To install this app, use your browser\'s menu and select "Add to Home Screen"');
    }
  };

  const handleDismissInstall = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setShowInstallPrompt(false);
  };

  const clearCookies = () => {
    const cookies = ['accessToken', 'refreshToken'];
    const domains = [window.location.hostname, 'localhost', '127.0.0.1'];
    const paths = ['/', '/api', '/admin'];
    
    cookies.forEach(cookieName => {
      domains.forEach(domain => {
        paths.forEach(path => {
          // Clear with different combinations
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain};`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=.${domain};`;
          document.cookie = `${cookieName}=; max-age=0; path=${path};`;
          document.cookie = `${cookieName}=; max-age=0; path=${path}; domain=${domain};`;
          document.cookie = `${cookieName}=; max-age=0; path=${path}; domain=.${domain};`;
        });
      });
    });
  };

  const handleLogout = () => {
    // Always clear local data first
    window.localStorage.removeItem('user');
    dispatch(logout());
    
    // Clear cookies on client side as fallback
    clearCookies();
    
    // Then try to logout from server
    axios
      .get(`${import.meta.env.VITE_API_URL}/logout`, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      })
      .then((response) => {
        // Clear cookies again after server response
        clearCookies();
        toast.success('Logged out successfully');
        navigate('/');
      })
      .catch((error) => {
        // Clear cookies again even if API fails
        clearCookies();
        // Even if API fails, user is already logged out locally
        toast.success('Logged out successfully');
        navigate('/');
      });
  };

  // Don't render on desktop - but ensure it shows on mobile
  // Add debugging to check mobile detection
  
  // Always render but use responsive classes for visibility
  // if (!isMobile) return null;

  // Navigation items matching the design: Install, My Orders, Home (center/active), Cart, Profile
  const navItems = [
    {
      path: "/",
      icon: Download,
      label: "Install",
      show: true,
      isCenter: false,
      onClick: handleInstall,
      isAction: true
    },
    {
      path: "/orders",
      icon: Package,
      label: "My Orders",
      show: user !== null,
      isCenter: false
    },
    {
      path: "/",
      icon: Home,
      label: "Home",
      show: true,
      isCenter: true, // This is the center/active item
      isHome: true
    },
    {
      path: "/profile",
      icon: User,
      label: "Profile",
      show: true,
      isCenter: false
    }
  ];

  const actionItems = [
    {
      icon: LogOut,
      label: "Logout",
      show: user !== null,
      onClick: handleLogout,
      className: "text-red-600 hover:text-red-700 hover:bg-red-50"
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
          
          // Handle action items (like Install) with onClick
          if (item.isAction && item.onClick) {
            return (
              <button
                key={`${item.label}-${index}`}
                onClick={(e) => {
                  item.onClick(e);
                  // Scroll to top when clicking navigation
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex flex-col items-center justify-center relative transition-all duration-300 flex-1"
              >
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <Icon 
                    size={22} 
                    className="text-gray-400 transition-all duration-300"
                    strokeWidth={1.5}
                    fill="none"
                  />
                  <span className="text-[10px] text-gray-400 font-medium">{item.label}</span>
                </div>
              </button>
            );
          }
          
          const handleNavClick = () => {
            // Scroll to top when clicking navigation
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
                  <Icon 
                    size={22} 
                    className={`transition-all duration-300 ${
                      active ? "text-primary" : "text-gray-400"
                    }`}
                    strokeWidth={1.5}
                    fill="none"
                  />
                  <span className={`text-[10px] font-medium transition-all duration-300 ${
                    active ? "text-primary" : "text-gray-400"
                  }`}>{item.label}</span>
                </div>
              )}
            </Link>
          );
        })}

        {/* Cart button - always visible, no background */}
        <Sheet>
          <SheetTrigger asChild>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex flex-col items-center justify-center flex-1 py-1 relative"
            >
              <div className="flex flex-col items-center justify-center gap-0.5">
                <div className="relative">
                  <ShoppingCart 
                    size={22} 
                    className={`transition-all duration-300 ${
                      location.pathname.includes('/checkout') ? "text-primary" : "text-gray-400"
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
                  location.pathname.includes('/checkout') ? "text-primary" : "text-gray-400"
                }`}>Cart</span>
              </div>
            </button>
          </SheetTrigger>
          <SheetContent className="w-full sm:w-[400px]">
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">Your Cart</SheetTitle>
              <SheetDescription>Total Items: {totalQuantity}</SheetDescription>
            </SheetHeader>
            <div className="mt-4 max-h-[60vh] overflow-y-auto">
              {cartItems.length > 0 ? (
                cartItems.map((item) => (
                  <CartProduct
                    key={item.product._id}
                    product={item.product}
                    quantity={item.quantity}
                  />
                ))
              ) : (
                <p className="text-center text-gray-500 py-6">Your cart is empty.</p>
              )}
            </div>
            <SheetFooter className="mt-6">
              <SheetClose asChild>
                <Button
                  onClick={handleBuyNow}
                  disabled={cartItems.length === 0}
                  className="w-full"
                >
                  Checkout
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>

      </div>
      
      {/* Checkout Dialog */}
      <Dialog open={openCheckoutDialog} onOpenChange={setOpenCheckoutDialog}>
        <DialogContent className="w-full lg:max-w-6xl h-[62vh] sm:h-[70vh] sm:w-[60vw] overflow-hidden p-0 bg-white rounded-xl shadow-xl flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>Complete your order</DialogDescription>
          </DialogHeader>
          <Checkout closeModal={() => setOpenCheckoutDialog(false)} />
        </DialogContent>
      </Dialog>
    </nav>
    </>
  );
};

export default BottomNavigation;
