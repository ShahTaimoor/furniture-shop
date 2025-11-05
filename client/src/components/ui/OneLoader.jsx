import React from 'react';

const OneLoader = ({ 
  size = 'medium', 
  color = 'blue', 
  text = 'Loading...', 
  showText = true,
  className = '' 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    white: 'border-white',
    green: 'border-green-600',
    red: 'border-red-600'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`}
      />
      {showText && text && (
        <p className={`mt-2 text-sm font-medium ${
          color === 'white' ? 'text-white' : 'text-gray-600'
        }`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default OneLoader;
