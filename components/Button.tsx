import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-bg disabled:opacity-40 disabled:pointer-events-none";

  const variants = {
    primary: "bg-accent hover:bg-accent-hover text-white focus:ring-accent shadow-sm",
    secondary: "bg-surface hover:bg-surface-hover text-text-primary border border-divider focus:ring-accent shadow-sm",
    danger: "bg-red/10 hover:bg-red/20 text-red border border-red/20 focus:ring-red",
    ghost: "bg-transparent hover:bg-black/[0.04] text-text-secondary hover:text-text-primary",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-12 px-6 text-base gap-2",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;