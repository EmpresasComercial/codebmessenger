import React from 'react';
import { cn } from '../lib/utils';
// spinner uses CSS animation

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, isLoading, children, disabled, variant = 'primary', ...props }, ref) => {
    const variantClasses = {
      primary: 'ms-btn-primary',
      secondary: 'bg-[#f2f2f2] text-gray-900 hover:bg-gray-200 border border-[#d2d2d2]',
      outline: 'bg-transparent border border-[#d2d2d2] text-gray-700 hover:bg-gray-50',
      ghost: 'bg-transparent text-[#666] hover:bg-gray-100',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'relative flex items-center justify-center transition-all duration-200 px-6 h-[45px] font-semibold text-sm active:scale-[0.98] disabled:pointer-events-none rounded-sm',
          variant !== 'primary' && variantClasses[variant],
          variant === 'primary' && 'ms-btn-primary',
          className
        )}
        {...props}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-inherit rounded-sm">
            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
          </div>
        )}
        <div className={cn('flex items-center justify-center gap-2', isLoading && 'opacity-0')}>
          {children}
        </div>
      </button>
    );
  }
);

Button.displayName = 'Button';

