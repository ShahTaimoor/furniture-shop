import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { clearTokenExpired, logout, setTokenExpired } from '@/redux/slices/auth/authSlice';
import { fetchCart } from '@/redux/slices/cart/cartSlice';

const ProtectedRoute = ({ children }) => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const { user, isAuthenticated, tokenExpired } = useSelector((state) => state.auth);
  const { items: cartItems = [] } = useSelector((state) => state.cart);

  // Enhanced auth check for mobile devices
  const checkAuthentication = useCallback(async () => {
    if (user && isAuthenticated) {
      try {
        // Make a lightweight auth check
        const response = await fetch('/api/verify-token', {
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

  useEffect(() => {
    if (user && isAuthenticated) {
      dispatch(fetchCart());
    }
  }, [dispatch, user, isAuthenticated]);

  // Periodic auth check for mobile (every 5 minutes)
  useEffect(() => {
    if (user && isAuthenticated) {
      const interval = setInterval(checkAuthentication, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [user, isAuthenticated, checkAuthentication]);

  const alwaysPublicPaths = ['/login', '/signup'];
  const guestAllowedPaths = ['/checkout', '/order-confirmation'];

  // Handle token expiration - redirect to login page
  if (tokenExpired) {
    dispatch(clearTokenExpired());
    dispatch(logout());
    
    // Redirect to login page (unless on checkout - allow guest checkout)
    if (![...alwaysPublicPaths, ...guestAllowedPaths].includes(pathname)) {
      const redirectPath = '/login';
      window.location.href = `${redirectPath}?expired=true`;
      return null;
    }
  }

  // Check if user is not authenticated and trying to access protected route
  // Allow guest checkout and order confirmation
  if (
    !isAuthenticated &&
    !alwaysPublicPaths.includes(pathname) &&
    !guestAllowedPaths.includes(pathname)
  ) {
    const redirectPath = '/login';
    window.location.href = redirectPath;
    return null;
  }

  // Admin or Super Admin trying to revisit /login
  if ((user?.role === 1 || user?.role === 2) && pathname === '/login') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Normal user trying to access admin route
  if (user?.role === 0 && pathname.startsWith('/admin')) {
    return <Navigate to="/" replace />;
  }

  if (pathname.startsWith('/admin/dashboard/analytics') && user?.role !== 2) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Authenticated trying to access login/signup
  if (isAuthenticated && alwaysPublicPaths.includes(pathname)) {
    return <Navigate to={(user?.role === 1 || user?.role === 2) ? '/admin/dashboard' : '/'} replace />;
  }

  // Empty cart, disallow checkout (for both authenticated and guest)
  if (pathname === '/checkout' && cartItems.length === 0) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
