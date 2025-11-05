import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import OneLoader from '@/components/ui/OneLoader';
import { Eye, EyeOff } from 'lucide-react'; // Add Eye and EyeOff icons
import axios from 'axios';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Signup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State for showing password
  const navigate = useNavigate();
  const [inputValue, setInputValues] = useState({
    name: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/signup`,
        inputValue,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      toast.success('Signup successful! Please login.');
      navigate('/');
    } catch (err) {
      console.error(err);
      toast.error('User already exists. Please choose another name.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

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
              Join GULTRADERS
            </h1>
            <p className='text-gray-600 text-sm sm:text-base'>
              Create your account to get started
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form fields */}
          <div className='space-y-6'>
            {/* Shop Name Field */}
            <div className='space-y-2'>
              <label className='block text-sm font-semibold text-gray-700'>
                Shop Name
              </label>
              <Input
                onChange={handleChange}
                placeholder='Enter your shop name'
                type='text'
                name='name'
                value={inputValue.name}
                required
                disabled={loading}
                autoComplete="username"
                className='h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200'
              />
            </div>

            {/* Password Field */}
            <div className='space-y-2'>
              <label className='block text-sm font-semibold text-gray-700'>
                Password
              </label>
              <div className="relative">
                <Input
                  onChange={handleChange}
                  placeholder='Enter your password'
                  type={showPassword ? 'text' : 'password'}
                  name='password'
                  value={inputValue.password}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  className='h-12 pr-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200'
                />
                <button
                  type="button"
                  className='absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700 p-2 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all duration-200'
                  onClick={togglePasswordVisibility}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
                <OneLoader size="small" text="Signing Up..." showText={false} />
                <span>Creating Account...</span>
              </div>
            ) : (
              'Create Account'
            )}
          </Button>

          {/* Sign in link */}
          <div className='mt-8 text-center'>
            <p className='text-gray-600 text-sm'>
              Already have an account?
              <Link 
                to="/login" 
                className='text-primary ml-2 hover:text-primary/80 font-semibold hover:underline transition-colors duration-200'
              >
                Sign In
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
