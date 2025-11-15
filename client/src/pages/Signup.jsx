import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthDrawer } from '@/contexts/AuthDrawerContext';
import SEO from '@/components/seo/SEO';

const Signup = () => {
  const { openAuthDrawer } = useAuthDrawer();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasOpened, setHasOpened] = useState(false);

  const redirectTarget = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('redirect') || '/';
  }, [location.search]);

  useEffect(() => {
    if (hasOpened) return;
    setHasOpened(true);
    openAuthDrawer('signup', { redirectTo: redirectTarget });
  }, [hasOpened, openAuthDrawer, redirectTarget]);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <SEO
      title="Create a HELLAS Account"
      description="Join HELLAS to save wishlists, track orders, and enjoy personalised recommendations."
      keywords={['signup', 'create account', 'HELLAS']}
      noIndex
    />
  );
};

export default Signup;
