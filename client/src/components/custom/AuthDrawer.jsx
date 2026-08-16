import { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { login } from '@/redux/slices/auth/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from '@/components/ui/drawer';

const initialFormState = {
  email: '',
  password: '',
};

const emailRegex = /^\S+@\S+\.\S+$/;

const AuthDrawer = ({ open, mode, options, onOpenChange, onModeChange, onOptionsChange }) => {
  const dispatch = useDispatch();
  const [loginValues, setLoginValues] = useState(initialFormState);
  const [signupValues, setSignupValues] = useState(initialFormState);
  const [loginErrors, setLoginErrors] = useState(initialFormState);
  const [signupErrors, setSignupErrors] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const activeValues = mode === 'login' ? loginValues : signupValues;
  const activeErrors = mode === 'login' ? loginErrors : signupErrors;

  const resetForms = useCallback(() => {
    setLoginValues(initialFormState);
    setSignupValues(initialFormState);
    setLoginErrors(initialFormState);
    setSignupErrors(initialFormState);
    setShowPassword(false);
  }, []);

  useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => {
        resetForms();
        onModeChange('login');
        onOptionsChange({});
      }, 200);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [open, onModeChange, onOptionsChange, resetForms]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      if (!nextOpen) {
        onOpenChange(false);
        return;
      }
      onOpenChange(true);
    },
    [onOpenChange]
  );

  const updateField = (field, value) => {
    if (mode === 'login') {
      setLoginValues((prev) => ({ ...prev, [field]: value }));
      setLoginErrors((prev) => ({ ...prev, [field]: '' }));
    } else {
      setSignupValues((prev) => ({ ...prev, [field]: value }));
      setSignupErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const trimmedEmail = activeValues.email.trim();
    const trimmedPassword = activeValues.password.trim();
    const nextErrors = { email: '', password: '' };

    if (!trimmedEmail) {
      nextErrors.email = 'Email is required';
    } else if (!emailRegex.test(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address';
    }
    if (!trimmedPassword) {
      nextErrors.password = 'Password is required';
    } else if (trimmedPassword.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'login') {
      setLoginErrors(nextErrors);
    } else {
      setSignupErrors(nextErrors);
    }

    return !nextErrors.email && !nextErrors.password;
  };

  const getCurrentUrl = () => {
    if (typeof window === 'undefined') return '/';
    const { pathname, search, hash } = window.location;
    return `${pathname}${search}${hash}`;
  };

  const handleRedirect = (user) => {
    if (typeof options?.onSuccess === 'function') {
      options.onSuccess(user);
      return;
    }
    const redirectTarget = options?.redirectTo ?? getCurrentUrl();
    const currentUrl = getCurrentUrl();
    if (!redirectTarget || redirectTarget === currentUrl) return;
    if (typeof window !== 'undefined') {
      if (options?.replace) {
        window.location.replace(redirectTarget);
      } else {
        window.location.assign(redirectTarget);
      }
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await dispatch(login(loginValues)).unwrap();
      if (response?.user) {
        toast.success(`Welcome back ${response.user.name || ''}`.trim());
        handleOpenChange(false);
        handleRedirect(response.user);
      }
    } catch (error) {
      const message = error?.message?.toLowerCase() || '';
      const emailError = message.includes('email') ? 'Invalid email' : 'Unable to login';
      const passwordError = message.includes('password') ? 'Invalid password' : 'Unable to login';
      setLoginErrors({
        email: emailError,
        password: passwordError,
      });
      toast.error('Invalid credentials, please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/pg/signup`,
        signupValues,
        { headers: { 'Content-Type': 'application/json' } }
      );
      toast.success('Account created! Please login.');
      onModeChange('login');
      setSignupValues(initialFormState);
    } catch (error) {
      const serverMessage = error?.response?.data?.message;
      toast.error(serverMessage || 'An account with this email already exists.');
      setSignupErrors({
        email: 'Email already in use',
        password: '',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = mode === 'login' ? handleLogin : handleSignup;
  const primaryCta = mode === 'login' ? 'Sign In' : 'Create Account';
  const secondaryLabel = mode === 'login' ? 'New customer? Create your account' : 'Already have an account? Sign in';

  const toggleMode = () => {
    onModeChange(mode === 'login' ? 'signup' : 'login');
  };

  const title = useMemo(() => (mode === 'login' ? 'Login' : 'Create Account'), [mode]);
  const subtitle = useMemo(
    () => (mode === 'login' ? 'Sign in to access your orders, wishlist, and more.' : 'Join Ecommerce for faster checkout and exclusive offers.'),
    [mode]
  );

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} direction="right">
      <DrawerContent className="w-full max-w-md rounded-none border-l border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400">Account</p>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          </div>
          <DrawerClose className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100" aria-label="Close authentication drawer">
            <X size={18} />
          </DrawerClose>
        </div>

        <div className="space-y-8 px-6 py-8">
          <div className="space-y-2">
            <p className="text-base font-medium text-gray-900">{mode === 'login' ? 'Welcome back' : 'Let’s get started'}</p>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-800">
                Email <span className="text-black">*</span>
              </label>
              <Input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={activeValues.email}
                onChange={(event) => updateField('email', event.target.value)}
                autoComplete="email"
                required
              />
              {activeErrors.email && <p className="text-xs text-red-500">{activeErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-800">
                  Password <span className="text-black">*</span>
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="text-sm font-medium text-gray-900 hover:text-black"
                    onClick={() => toast.info('Password reset is coming soon.')}
                  >
                    Forgot your password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={activeValues.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  className="pr-12"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {activeErrors.password && <p className="text-xs text-red-500">{activeErrors.password}</p>}
            </div>

            <Button type="submit" disabled={loading} className="h-12 w-full rounded-full bg-black text-base font-semibold text-white transition hover:bg-gray-900">
              {loading ? 'Please wait...' : primaryCta}
            </Button>
          </form>

          <div className="text-center">
            <button type="button" className="text-sm font-medium text-gray-700 underline-offset-2 hover:underline" onClick={toggleMode}>
              {secondaryLabel}
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AuthDrawer;

