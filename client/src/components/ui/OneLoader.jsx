import React from 'react';

const sizeToScale = {
  tiny: 0.3,
  small: 0.5,
  medium: 1,
  large: 1.5,
  xl: 2,
};

const OneLoader = ({
  size = 'medium',
  text = 'Loading...',
  showText = true,
  inline = false,
  className = ''
}) => {
  const scale = sizeToScale[size] ?? 1;

  const spinner = (
    <span
      className="one-loader"
      style={{ '--size': `${scale}px` }}
      role="status"
      aria-label={text || 'Loading'}
    />
  );

  if (inline) {
    return <span className={`inline-flex items-center ${className}`}>{spinner}</span>;
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {spinner}
      {showText && text && (
        <p className="text-sm font-medium text-muted-foreground">{text}</p>
      )}
    </div>
  );
};

export default OneLoader;
