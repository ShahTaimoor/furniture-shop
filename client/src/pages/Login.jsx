import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import OneLoader from '@/components/ui/OneLoader';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login } from '@/redux/slices/auth/authSlice';


const Login = () => {

  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const params = new URLSearchParams(location.search);
  const expired = params.get('expired');
  const from = location.state?.from?.pathname || '/';

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState({ name: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [inputValue, setInputValues] = useState({
    name: '',
    password: ''
  });

  // Memoized validation functions
  const validateForm = useCallback(() => {
    const errors = { name: '', password: '' };
    
    if (!inputValue.name.trim()) {
      errors.name = 'Username is required';
    }
    
    if (!inputValue.password.trim()) {
      errors.password = 'Password is required';
    }
    
    return errors;
  }, [inputValue]);

  // Memoized error messages
  const errorMessages = useMemo(() => ({
    invalidCredentials: 'Username or password is incorrect',
    serverError: 'Something went wrong during login',
    networkError: 'Network error. Please check your connection'
  }), []);

  useEffect(() => {
    if (expired) {
      const timer = setTimeout(() => {
        toast.error("Session expired. Please login again.");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [expired]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setInputValues((prev) => ({ ...prev, [name]: value }));
    
    // Clear specific field error when user starts typing
    if (errorMsg[name]) {
      setErrorMsg(prev => ({ ...prev, [name]: '' }));
    }
  }, [errorMsg]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Client-side validation
    const validationErrors = validateForm();
    if (validationErrors.name || validationErrors.password) {
      setErrorMsg(validationErrors);
      return;
    }

    setLoading(true);
    setErrorMsg({ name: '', password: '' });

    try {
      const response = await dispatch(login(inputValue)).unwrap();
      
      if (response?.user) {
        toast.success('Login successful');
        setInputValues({ name: '', password: '' });
        navigate(from, { replace: true });
      } else {
        setErrorMsg({ name: 'Login failed', password: 'Login failed' });
        toast.error('Login failed');
      }
    } catch (error) {
      let nameError = '';
      let passwordError = '';

      if (error?.message?.toLowerCase().includes('username') ||
          error?.message?.toLowerCase().includes('name')) {
        nameError = 'Invalid username';
      }
      
      if (error?.message?.toLowerCase().includes('password')) {
        passwordError = 'Invalid password';
      }

      // If no specific field error, show generic error
      if (!nameError && !passwordError) {
        nameError = 'Invalid username';
        passwordError = 'Invalid password';
      }

      setErrorMsg({ name: nameError, password: passwordError });
      toast.error(errorMessages.invalidCredentials);
    } finally {
      setLoading(false);
    }
  }, [dispatch, inputValue, navigate, from, validateForm, errorMessages.invalidCredentials]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative'>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100/30 to-slate-100/30"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(0, 0, 0, 0.05) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(0, 0, 0, 0.05) 0%, transparent 50%)`
        }}></div>
      </div>

      {/* Main form container */}
      <div className="relative z-10 w-full max-w-md">
        <form onSubmit={handleSubmit} className='bg-white/80 backdrop-blur-sm p-8 rounded-2xl border border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-300'>
          {/* Logo section */}
          <div className='flex justify-center mb-8'>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-4 shadow-lg">
                <img 
                  src="/logo.jpeg" 
                  alt="GULTRADERS Logo" 
                  loading="eager" 
                  className="h-16 sm:h-20 w-auto object-contain" 
                />
              </div>
            </div>
          </div>
          
          {/* Header text */}
          <div className="text-center mb-8">
            <h1 className='text-3xl sm:text-4xl font-bold mb-3 text-gray-800'>
              Welcome Back
            </h1>
            <p className='text-gray-600 text-sm sm:text-base'>
              Sign in to your GULTRADERS account
            </p>
          </div>

          {/* Form fields */}
          <div className='space-y-6'>
            {/* Shop Name Field */}
            <div className='space-y-2'>
              <label className='block text-sm font-semibold text-gray-700'>
                Shop Name
              </label>
              <Input
                type='text'
                name='name'
                placeholder='Enter your shop name'
                value={inputValue.name}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="username"
                className='h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200'
              />
              {errorMsg.name && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {errorMsg.name}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className='space-y-2'>
              <label className='block text-sm font-semibold text-gray-700'>
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name='password'
                  placeholder='Enter your password'
                  value={inputValue.password}
                  onChange={handleChange}
                  required
                  className='h-12 pr-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200'
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className='absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700 p-2 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all duration-200'
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errorMsg.password && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {errorMsg.password}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            className='w-full mt-8 bg-gradient-to-r from-primary to-primary/90 hover:from-primary hover:to-primary/80 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]' 
            disabled={loading} 
            type='submit'
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <OneLoader size="small" text="Logging in..." showText={false} />
                <span>Signing In...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </Button>

          {/* Sign up link */}
          <div className='mt-8 text-center'>
            <p className='text-gray-600 text-sm'>
              Don't have an account?
              <Link 
                to='/signup' 
                className='text-primary ml-2 hover:text-primary/80 font-semibold hover:underline transition-colors duration-200'
              >
                Sign Up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(Login);
