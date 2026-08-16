import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { clearTokenExpired, logout, setTokenExpired } from '@/redux/slices/auth/authSlice';

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL;

const ProtectedRoute = ({ children }) => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const { user, isAuthenticated, tokenExpired } = useSelector((state) => state.auth);

  // Enhanced auth check for mobile devices
  const checkAuthentication = useCallback(async () => {
    if (user && isAuthenticated) {
      try {
        // Make a lightweight auth check
        const response = await fetch('/api/pg/verify-token', {
          credentials: 'include',
          method: 'GET'
        });

        if (!response.ok) {
          dispatch(setTokenExpired());
        }
      } catch (error) {
        // Don't logout on network errors, just log
      }
    }
  }, [user, isAuthenticated, dispatch]);

  // Periodic auth check for mobile (every 5 minutes)
  useEffect(() => {
    if (user && isAuthenticated) {
      const interval = setInterval(checkAuthentication, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [user, isAuthenticated, checkAuthentication]);

  const alwaysPublicPaths = ['/login'];

  // Handle token expiration - redirect to login page
  if (tokenExpired) {
    dispatch(clearTokenExpired());
    dispatch(logout());

    if (!alwaysPublicPaths.includes(pathname)) {
      window.location.href = '/login?expired=true';
      return null;
    }
  }

  // Not authenticated and trying to access a protected route
  if (!isAuthenticated && !alwaysPublicPaths.includes(pathname)) {
    window.location.href = '/login';
    return null;
  }

  // Admin or Super Admin trying to revisit /login
  if ((user?.role === 1 || user?.role === 2) && pathname === '/login') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Normal (non-admin) user trying to access the admin app
  if (isAuthenticated && user?.role === 0) {
    window.location.href = STOREFRONT_URL;
    return null;
  }

  if (pathname.startsWith('/admin/dashboard/analytics') && user?.role !== 2) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
