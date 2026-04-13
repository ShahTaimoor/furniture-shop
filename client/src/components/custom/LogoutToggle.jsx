import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { User } from "lucide-react";
import axios from "axios";
import { logout } from "../../redux/slices/auth/authSlice";
import { useAuthDrawer } from "@/contexts/AuthDrawerContext";

const ToggleLogout = ({ user }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { openAuthDrawer } = useAuthDrawer();

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
                navigate('/');
                openAuthDrawer('login');
            })
            .catch((error) => {
                // Clear cookies again even if API fails
                clearCookies();
                // Even if API fails, user is already logged out locally
                navigate('/');
                openAuthDrawer('login');
            });
    };

    return (
        <div>
        {/* Mobile: Avatar dropdown */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar>
                <AvatarFallback className="cursor-pointer">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                {(user?.role === 1 || user?.role === 2) ? (
                  <Link to="/admin/dashboard">Admin Dashboard</Link>
                ) : (
                  <Link to="/profile">Profile</Link>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/orders">My Orders</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
  
        {/* Desktop: Simple user icon - Furniture Style */}
        <div className="hidden md:block">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <User size={20} className="text-gray-700" />
          </button>
        </div>

      </div>
    );
};

export default ToggleLogout;
