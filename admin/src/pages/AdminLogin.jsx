import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { login } from '@/redux/slices/auth/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import OneLoader from '@/components/ui/OneLoader';

const initialFormState = { email: '', password: '' };
const emailRegex = /^\S+@\S+\.\S+$/;

const AdminLogin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [values, setValues] = useState(initialFormState);
  const [errors, setErrors] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Already logged in (as admin/super-admin) — skip straight to the dashboard
  useEffect(() => {
    if (isAuthenticated && (user?.role === 1 || user?.role === 2)) {
      navigate(searchParams.get('redirect') || '/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate, searchParams]);

  const updateField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const trimmedEmail = values.email.trim();
    const trimmedPassword = values.password.trim();
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

    setErrors(nextErrors);
    return !nextErrors.email && !nextErrors.password;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await dispatch(login(values)).unwrap();
      if (response?.user) {
        toast.success(`Welcome back ${response.user.name || ''}`.trim());
        navigate(searchParams.get('redirect') || '/admin/dashboard', { replace: true });
      }
    } catch (error) {
      const message = error?.message?.toLowerCase() || '';
      setErrors({
        email: message.includes('email') ? 'Invalid email' : 'Unable to login',
        password: message.includes('password') ? 'Invalid password' : 'Unable to login',
      });
      toast.error('Invalid credentials, please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Sign in to continue</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={values.email}
                onChange={(e) => updateField('email', e.target.value)}
                autoComplete="email"
                required
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={values.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  autoComplete="current-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <OneLoader size="tiny" inline className="mr-2" /> Please wait...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
