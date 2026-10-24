import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  style,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.45rem',
    fontWeight: 600,
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    borderRadius: 'var(--radius-sm)',
    transition: 'all var(--transition-fast)',
    border: '1px solid transparent',
    fontFamily: 'inherit',
    lineHeight: 1.2,
    textDecoration: 'none',
    position: 'relative',
    userSelect: 'none',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    xs: { padding: '0.25rem 0.5rem', fontSize: 'var(--text-xs)' },
    sm: { padding: '0.4rem 0.75rem', fontSize: 'var(--text-sm)' },
    md: { padding: '0.5rem 1rem', fontSize: 'var(--text-base)' },
    lg: { padding: '0.7rem 1.4rem', fontSize: 'var(--text-md)' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--accent)',
      color: 'var(--accent-foreground)',
      boxShadow: 'var(--shadow-sm)',
    },
    secondary: {
      backgroundColor: 'var(--bg-surface-hover)',
      borderColor: 'var(--border-subtle)',
      color: 'var(--text-primary)',
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: 'var(--border-strong)',
      color: 'var(--text-primary)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
    },
    danger: {
      backgroundColor: 'var(--error-bg)',
      borderColor: 'var(--error)',
      color: 'var(--error)',
    },
  };

  return (
    <button
      className={`vm-button ${className}`}
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span
          style={{
            display: 'inline-block',
            width: '1em',
            height: '1em',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'vm-spin 0.6s linear infinite',
          }}
        />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
      <style>{`
        @keyframes vm-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
};
