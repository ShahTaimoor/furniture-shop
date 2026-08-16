import { useSelector, useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { logout } from "../../redux/slices/auth/authSlice";
import { fetchOrdersAdmin, fetchPendingOrderCount } from "@/redux/slices/order/orderSlice";
import { fetchChats } from "@/redux/slices/chat/chatSlice";
import {
  FilePlus2Icon,
  ChartBarStacked,
  GalleryVerticalEnd,
  PackageSearch,
  UserCheck,
  ShoppingCart,
  UserCog,
  ImageIcon,
  LogOut,
  PanelsTopLeft,
  MessageCircle,
  TrendingUp,
  Truck
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Separator } from "../ui/separator";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePendingOrdersCount } from "@/hooks/use-pending-orders-count";

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL;

// Sidebar links with enhanced structure
const items = [
  {
    title: "Products",
    url: "/admin/dashboard/all-products",
    icon: GalleryVerticalEnd,
    description: "Manage Products",
    category: "main"
  },
  {
    title: "Create Product",
    url: "/admin/dashboard",
    icon: FilePlus2Icon,
    description: "Add New Product",
    category: "main"
  },
  {
    title: "Categories",
    url: "/admin/category",
    icon: ChartBarStacked,
    description: "Product Categories",
    category: "main"
  },
  {
    title: "Banners",
    url: "/admin/dashboard/banners",
    icon: PanelsTopLeft,
    description: "Homepage & promo banners",
    category: "main"
  },
  {
    title: "Analytics",
    url: "/admin/dashboard/analytics",
    icon: TrendingUp,
    description: "Financial performance",
    category: "main",
    requiresSuperAdmin: true
  },
  {
    title: "Reviews",
    url: "/admin/dashboard/reviews",
    icon: MessageCircle,
    description: "Moderate customer feedback",
    category: "main"
  },
  {
    title: "Chat",
    url: `${STOREFRONT_URL}/chat`,
    icon: MessageCircle,
    description: "Real-time messaging",
    category: "main",
    showChatBadge: true,
    external: true
  },
  {
    title: "Media Library",
    url: "/admin/dashboard/media",
    icon: ImageIcon,
    description: "Manage Assets",
    category: "main"
  },
  {
    title: "Orders",
    url: "/admin/dashboard/orders",
    icon: PackageSearch,
    showBadge: true,
    description: "Order Management",
    category: "orders"
  },
  {
    title: "Driver Console",
    url: "/admin/dashboard/driver-console",
    icon: Truck,
    description: "Live status & GPS updates",
    category: "orders"
  },
  {
    title: "Users",
    url: "/admin/dashboard/users",
    icon: UserCheck,
    description: "User Management",
    category: "users"
  },
  {
    title: "Customer View",
    url: STOREFRONT_URL,
    icon: ShoppingCart,
    description: "View as Customer",
    category: "external",
    external: true
  },
];

const GROUPS = [
  { label: "Main", categories: ["main"] },
  { label: "Orders & Users", categories: ["orders", "users"] },
  { label: "External", categories: ["external"] },
];

export function AppSidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useSelector((state) => state.auth);
  const unreadCounts = useSelector((state) => state.chat.unreadCounts);
  const isSuperAdmin = user?.role === 2;
  const accessibleItems = items.filter((item) => !item.requiresSuperAdmin || isSuperAdmin);
  const [loading, setLoading] = useState(false);
  const reduxPendingCount = useSelector((state) => state.orders.pendingOrderCount);

  // Use real-time pending orders counter
  const { count: serverPendingCount } = usePendingOrdersCount({
    enabled: !!user && (user.role === 1 || user.role === 2),
    refreshInterval: 5000, // 5 seconds polling
  });

  // Use server count if available, fallback to Redux
  const pendingOrderCount = serverPendingCount !== undefined ? serverPendingCount : reduxPendingCount;
  const chatUnreadTotal = Object.values(unreadCounts || {}).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0
  );

  // Fetch orders after login
  useEffect(() => {
    if (user) {
      dispatch(fetchOrdersAdmin());
      dispatch(fetchPendingOrderCount());
      dispatch(fetchChats());
    }
  }, [dispatch, user]);

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

  // Handle logout
  const handleLogout = async () => {
    setLoading(true);

    // Always clear local data first
    localStorage.removeItem("user");
    dispatch(logout());

    // Clear cookies on client side as fallback
    clearCookies();

    try {
      await axios.get(`${import.meta.env.VITE_API_URL}/pg/logout`, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });
      // Clear cookies again after server response
      clearCookies();
      navigate("/login");
    } catch (error) {
      // Clear cookies again even if API fails
      clearCookies();
      // Even if API fails, user is already logged out locally
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border border-r">
      {/* Header with user info */}
      <SidebarHeader>
        {user && (
          <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-2 py-2 group-data-[collapsible=icon]:hidden">
            <Avatar className="h-7 w-7">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                {user.name?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{user.name || 'Admin'}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">{user.email}</p>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {GROUPS.map((group) => {
          const groupItems = accessibleItems.filter((item) => group.categories.includes(item.category));
          if (groupItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {groupItems.map((item) => {
                  const isActive = !item.external && pathname === item.url;
                  const Icon = item.icon;
                  const badgeCount = item.showBadge
                    ? pendingOrderCount
                    : item.showChatBadge
                      ? chatUnreadTotal
                      : 0;

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        {item.external ? (
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            <Icon />
                            <span>{item.title}</span>
                          </a>
                        ) : (
                          <Link to={item.url}>
                            <Icon />
                            <span>{item.title}</span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                      {badgeCount > 0 && (
                        <SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground rounded-full">
                          {badgeCount}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <Separator className="mb-1 bg-sidebar-border" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Admin Profile">
              <Link to="/admin/profile">
                <UserCog />
                <span>Admin Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Button
          onClick={handleLogout}
          disabled={loading}
          className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center"
          variant="destructive"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span className="group-data-[collapsible=icon]:hidden">Logging out...</span>
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
            </>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
