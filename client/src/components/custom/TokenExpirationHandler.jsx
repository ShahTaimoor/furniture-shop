import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useCallback } from 'react';
import { clearTokenExpired, logout, setTokenExpired } from '@/redux/slices/auth/authSlice';

const TokenExpirationHandler = () => {
  const dispatch = useDispatch();
  const { tokenExpired, user } = useSelector((state) => state.auth);

  // Enhanced redirect logic with mobile support
  const handleTokenExpiration = useCallback(() => {
    if (tokenExpired) {
      // Clear token expired state
      dispatch(clearTokenExpired());
      
      // Clear user data
      dispatch(logout());
      
      // Get current path for redirect after login
      const currentPath = window.location.pathname;
      
      // Always redirect to /login for both admin and regular users
      const redirectUrl = `/login?expired=true&redirect=${encodeURIComponent(currentPath)}`;
      
      // Use window.location for redirect (works outside Router context)
      window.location.href = redirectUrl;
    }
  }, [tokenExpired, dispatch]);

  useEffect(() => {
    handleTokenExpiration();
  }, [handleTokenExpiration]);

  // Handle page visibility change for mobile (when app comes back to foreground)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Check if user is still authenticated when app becomes visible
        // This helps with mobile browser tab switching
        const checkAuth = async () => {
          try {
            const response = await fetch('/api/verify-token', {
              credentials: 'include',
              method: 'GET'
            });
            
            if (!response.ok) {
              dispatch(setTokenExpired());
            }
          } catch (error) {
            // Don't automatically logout on network errors
          }
        };
        
        checkAuth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, dispatch]);

  return null;
};

export default TokenExpirationHandler; 