import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Menu,
  ShoppingCart,
  User,
  X,
  Heart,
  LogIn,
  LogOut,
  ShoppingBag
} from "lucide-react";
import ShopifySearchBar from "../search/ShopifySearchBar";
import { useSearchContext } from "../../contexts/SearchContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { logout } from "../../redux/slices/auth/authSlice";
import { fetchChats } from "@/redux/slices/chat/chatSlice";
import { fetchWishlist, resetWishlistState } from "../../redux/slices/wishlist/wishlistSlice";
import { useAuthDrawer } from "../../contexts/AuthDrawerContext";
import { selectSiteLogo, selectSiteName } from "@/redux/slices/settings/settingsSlice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";

const navLinks = [
  { label: "Products", to: "/products" },
  { label: "About Us", to: "/about" },
  { label: "Contact Us", to: "/contact" }
];

const moreLinks = [
  { label: "Best Sellers", to: "/products?sortBy=popularity" },
  { label: "New Arrivals", to: "/products?sortBy=newest" }
];

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useSelector((state) => state.auth);
  const { items: cartItems = [] } = useSelector((state) => state.cart);
  const wishlistCount = useSelector((state) => state.wishlist.items.length);
  const unreadCounts = useSelector((state) => state.chat.unreadCounts);
  const siteLogo = useSelector(selectSiteLogo);
  const siteName = useSelector(selectSiteName);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchContext = useSearchContext();
  const { openAuthDrawer } = useAuthDrawer();

  const totalQuantity = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileMenuOpen]);

  const userId = user?._id || user?.id || null;

  useEffect(() => {
    if (userId) {
      dispatch(fetchWishlist());
    } else {
      dispatch(resetWishlistState());
    }
  }, [dispatch, userId]);

  const chatUserId = user?.id || user?._id;

  useEffect(() => {
    if (chatUserId) {
      dispatch(fetchChats());
    }
  }, [dispatch, chatUserId]);

  const searchTerm = searchContext?.searchTerm ?? "";

  const handleLogout = useCallback(() => {
    dispatch(logout());
    toast.success("Logged out");
    navigate("/");
    openAuthDrawer("login");
  }, [dispatch, navigate, openAuthDrawer]);

  const handlePredictiveSubmit = useCallback((term) => {
    const trimmed = typeof term === "string" ? term.trim() : "";
    if (!trimmed) return;
    if (searchContext?.handleSearchWithTracking) {
      searchContext.handleSearchWithTracking(trimmed, null, []);
    }
    navigate(`/search?query=${encodeURIComponent(trimmed)}`);
  }, [navigate, searchContext]);

  const isAdmin = user?.role === 1 || user?.role === 2;
  const isSuperAdmin = user?.role === 2;
  const navigationLinks = navLinks;

  const chatUnreadTotal = useMemo(
    () =>
      Object.values(unreadCounts || {}).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0
      ),
    [unreadCounts]
  );

  const renderNavLink = (link) => (
    <NavLink
      key={link.label}
      to={link.to}
      className={({ isActive }) =>
        `text-sm font-medium transition-colors hover:text-primary ${isActive ? "text-primary" : "text-gray-700"}`
      }
      onClick={() => setMobileMenuOpen(false)}
    >
      {link.label}
    </NavLink>
  );

  return (
    <>
      <header className="lg:sticky lg:top-0 z-40 bg-cream/85 backdrop-blur-md border-b border-latte shadow-[0_1px_0_0_var(--latte),0_8px_24px_-16px_rgba(43,29,23,0.25)] transition-shadow">
        <div className="mx-auto hidden h-16 max-w-[1800px] items-center gap-4 px-4 sm:h-20 sm:gap-6 sm:px-6 lg:flex">
          <div className="flex items-center gap-3 lg:gap-6">
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 lg:hidden"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <img src={siteLogo?.secure_url || "/logo.svg"} alt={siteName || "Logo"} className="h-8 w-auto" />
            </Link>
            <nav className="hidden items-center gap-6 lg:flex">
              {navigationLinks.map(renderNavLink)}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-sm font-medium text-gray-700 transition hover:text-primary">
                    Explore
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {moreLinks.map((link) => (
                    <DropdownMenuItem
                      key={link.label}
                      onSelect={(event) => {
                        event.preventDefault();
                        navigate(link.to);
                      }}
                    >
                      {link.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>

          <div className="mx-auto hidden w-full max-w-3xl flex-1 lg:flex">
            <ShopifySearchBar
              initialValue={searchTerm}
              onSubmit={handlePredictiveSubmit}
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 sm:flex"
                  >
                    <User size={18} />
                    <span>{`Hej! ${user?.name?.split(" ")[0] || "User"}`}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {isAdmin && (
                    <>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          navigate("/admin/dashboard");
                        }}
                      >
                        <User size={16} className="mr-2" />
                        Admin Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      navigate("/profile");
                    }}
                  >
                    <User size={16} className="mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      navigate("/orders");
                    }}
                  >
                    <ShoppingBag size={16} className="mr-2" />
                    Orders
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      handleLogout();
                    }}
                  >
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                type="button"
                onClick={() => openAuthDrawer("login")}
                className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 sm:flex"
              >
                <User size={18} />
                <span>Hej! Log in</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate("/wishlist")}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100"
              aria-label="Wishlist"
            >
              <Heart size={18} />
              {wishlistCount > 0 && (
                <Badge className="absolute -top-1 -right-0.5 min-w-[18px] rounded-full border-0 bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {wishlistCount}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate("/cart")}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
              aria-label="Go to cart"
            >
              <ShoppingCart size={18} />
              {totalQuantity > 0 && (
                <Badge className="absolute -top-1 -right-0.5 min-w-[18px] rounded-full border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-black">
                  {totalQuantity}
                </Badge>
              )}
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 lg:hidden">
          <ShopifySearchBar
            initialValue={searchTerm}
            onSubmit={handlePredictiveSubmit}
          />
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white lg:hidden">
            <div className="mx-auto flex max-w-[1800px] flex-col gap-4 px-4 py-4">
              <nav className="flex flex-col gap-3">
                {navigationLinks.map(renderNavLink)}
                <div className="pt-2">
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Explore</p>
                  <div className="flex flex-col gap-2">
                    {moreLinks.map((link) => (
                      <button
                        key={link.label}
                        type="button"
                        className="text-left text-sm font-medium text-gray-700 transition hover:text-primary"
                        onClick={() => {
                          navigate(link.to);
                          setMobileMenuOpen(false);
                        }}
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                </div>
              </nav>

              <div className="flex flex-wrap items-center gap-3">
                {user ? (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <User size={16} className="mr-2" />
                    Logout
                  </Button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      openAuthDrawer("login");
                      setMobileMenuOpen(false);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <LogIn size={16} />
                    Login / Signup
                  </button>
                )}
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigate("/wishlist");
                    setMobileMenuOpen(false);
                  }}
                >
                  <Heart size={16} className="mr-2" />
                  Wishlist
                  {wishlistCount > 0 && (
                    <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {wishlistCount}
                    </span>
                  )}
                </Button>
                {user && isAdmin && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      navigate("/admin/dashboard");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <User size={16} className="mr-2" />
                    Admin
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Navbar;
