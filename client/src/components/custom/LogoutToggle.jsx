import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";

import axios from "axios";
import { logout } from "../../redux/slices/auth/authSlice";

const ToggleLogout = ({ user }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

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
                // Redirect to the login page
                navigate('/login');
            })
            .catch((error) => {
                // Clear cookies again even if API fails
                clearCookies();
                // Even if API fails, user is already logged out locally
                // Redirect to login page anyway
                navigate('/login');
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
  
        {/* Desktop: Horizontal menu */}
        <div className="hidden md:flex items-center gap-2 mr-18">
             {/* Home*/}
  <Link
    to="/"
    className="px-4 py-2 rounded-lg bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 transition"
  >
    Home
  </Link>
  {/* Dashboard / Profile */}
  {(user?.role === 1 || user?.role === 2) ? (
    <Link
      to="/admin/dashboard"
      className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
    >
      Admin Dashboard
    </Link>
  ) : (
    <Link
      to="/profile"
      className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
    >
      Profile
    </Link>
  )}

  {/* Orders */}
  <Link
    to="/orders"
    className="px-4 py-2 rounded-lg bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 transition"
  >
    My Orders
  </Link>

  {/* Logout */}
  <button
    onClick={handleLogout}
    className="px-4 py-2 rounded-lg bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 transition"
  >
    Logout
  </button>
</div>

      </div>
    );
};

export default ToggleLogout;
