import { useSelector, useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { logout } from "../../redux/slices/auth/authSlice";
import { fetchOrdersAdmin, fetchPendingOrderCount, updateOrderStatus } from "@/redux/slices/order/orderSlice";
import { fetchChats } from "@/redux/slices/chat/chatSlice";
import {
  FilePlus2Icon,
  ChartBarStacked,
  GalleryVerticalEnd,
  PackageSearch,
  ChartBar,
  UserCheck,
  ShoppingCart,
  UserCog,
  ImageIcon,
  LogOut,
  Settings,
  Bell,
  ChevronRight,
  Sparkles,
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthDrawer } from "@/contexts/AuthDrawerContext";
import { usePendingOrdersCount } from "@/hooks/use-pending-orders-count";

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
    url: "/chat",
    icon: MessageCircle,
    description: "Real-time messaging",
    category: "main",
    showChatBadge: true
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
    url: "/", 
    icon: ShoppingCart, 
    description: "View as Customer",
    category: "external"
  },
];

export function AppSidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { orders } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);
  const unreadCounts = useSelector((state) => state.chat.unreadCounts);
  const isSuperAdmin = user?.role === 2;
  const accessibleItems = items.filter((item) => !item.requiresSuperAdmin || isSuperAdmin);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);  // Loading state
  const reduxPendingCount = useSelector((state) => state.orders.pendingOrderCount);
  const { openAuthDrawer } = useAuthDrawer();
  
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
      await axios.get(`${import.meta.env.VITE_API_URL}/logout`, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });
      // Clear cookies again after server response
      clearCookies();
      navigate("/");
      openAuthDrawer('login');
    } catch (error) {
      // Clear cookies again even if API fails
      clearCookies();
      // Even if API fails, user is already logged out locally
      navigate("/");
      openAuthDrawer('login');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    // ...existing code...
    await dispatch(updateOrderStatus({ orderId, status: newStatus, packerName: packer })).unwrap();
    toast.success(`Order marked as ${newStatus}`);
    dispatch(fetchPendingOrderCount());
  };

  if (message) {
    return (
      <div className="h-screen flex justify-center items-center">
        <div className="text-center">
          <p className="text-black font-semibold">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <Sidebar className="shadow-2xl border-r bg-gradient-to-b from-slate-50 to-white min-h-screen">
      {/* Modern Header with User Info */}
      <SidebarHeader className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Admin Panel</h2>
          </div>
        </div>
        
        {/* User Profile Section */}
        {user && (
          <div className="mt-4 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">
                  {user.name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{user.name || 'Admin'}</p>
                <p className="text-slate-300 text-xs truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="p-4">
        {/* Main Navigation */}
        <SidebarGroup>
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Main Navigation</h3>
            <SidebarMenu className="space-y-1">
              {accessibleItems.filter(item => item.category === 'main').map((item) => {
                const isActive = pathname === item.url;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`group relative transition-all duration-300 rounded-xl ${
                        isActive
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                          : "hover:bg-slate-100 hover:shadow-md"
                      }`}
                    >
                      <Link to={item.url} className="flex items-center gap-3 p-3 w-full relative">
                        <Icon className={`w-5 h-5 transition-colors ${
                          isActive ? "text-white" : "text-slate-600 group-hover:text-blue-600"
                        }`} />
                        <span className="text-sm font-medium flex-1">{item.title}</span>
                        {item.showChatBadge && chatUnreadTotal > 0 && (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5">
                            {chatUnreadTotal}
                          </Badge>
                        )}
                        {isActive && <ChevronRight className="w-4 h-4 text-white ml-auto" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </div>

          {/* Orders Section */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Orders & Users</h3>
            <SidebarMenu className="space-y-1">
              {accessibleItems.filter(item => item.category === 'orders' || item.category === 'users').map((item) => {
                const isActive = pathname === item.url;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`group relative transition-all duration-300 rounded-xl ${
                        isActive
                          ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                          : "hover:bg-slate-100 hover:shadow-md"
                      }`}
                    >
                      <Link to={item.url} className="flex items-center gap-3 p-3 w-full relative">
                        <Icon className={`w-5 h-5 transition-colors ${
                          isActive ? "text-white" : "text-slate-600 group-hover:text-emerald-600"
                        }`} />
                        <span className="text-sm font-medium">{item.title}</span>
                        
                        {/* Enhanced Badge for Orders */}
                        {item.showBadge && pendingOrderCount > 0 && (
                          <Badge className="bg-black hover:bg-black/80 text-white text-xs font-bold px-2 py-1 animate-pulse ml-auto">
                            {pendingOrderCount}
                          </Badge>
                        )}
                        
                        {isActive && <ChevronRight className="w-4 h-4 text-white ml-auto" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </div>

          {/* External Links */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">External</h3>
            <SidebarMenu className="space-y-1">
              {accessibleItems.filter(item => item.category === 'external').map((item) => {
                const isActive = pathname === item.url;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`group relative transition-all duration-300 rounded-xl ${
                        isActive
                          ? "bg-black text-white shadow-lg shadow-black/25"
                          : "hover:bg-slate-100 hover:shadow-md"
                      }`}
                    >
                      <Link to={item.url} className="flex items-center gap-3 p-3 w-full relative">
                        <Icon className={`w-5 h-5 transition-colors ${
                          isActive ? "text-white" : "text-slate-600 group-hover:text-orange-600"
                        }`} />
                        <span className="text-sm font-medium">{item.title}</span>
                        {isActive && <ChevronRight className="w-4 h-4 text-white ml-auto" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </div>
        </SidebarGroup>
      </SidebarContent>

      {/* Modern Footer with Enhanced Logout */}
      <SidebarFooter className="p-4 border-t border-slate-200/60 bg-slate-50/50">
        <div className="space-y-3">
          {/* Admin Profile Link */}
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <Link to="/admin/profile" className="flex items-center gap-3">
              <UserCog className="w-4 h-4" />
              <span className="text-sm">Admin Profile</span>
            </Link>
          </Button>
          
          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            className="w-full bg-black hover:bg-black/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Logging out...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </div>
            )}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
