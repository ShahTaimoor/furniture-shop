import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthDrawer } from '@/contexts/AuthDrawerContext';
import SEO from '@/components/seo/SEO';

const Login = () => {
  const { openAuthDrawer } = useAuthDrawer();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasOpened, setHasOpened] = useState(false);

  const redirectTarget = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('redirect') || location.state?.from?.pathname || '/';
  }, [location.search, location.state?.from?.pathname]);

  useEffect(() => {
    if (hasOpened) return;
    setHasOpened(true);
    openAuthDrawer('login', { redirectTo: redirectTarget });
  }, [hasOpened, openAuthDrawer, redirectTarget]);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <SEO
      title="Login"
      description="Sign in to your Ecommerce account to manage orders, wishlist items, and checkout faster."
      keywords={['login', 'Ecommerce account']}
      noIndex
    />
  );
};

export default Login;
