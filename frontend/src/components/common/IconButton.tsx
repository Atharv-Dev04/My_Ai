import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  ariaLabel: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  variant = 'ghost',
  size = 'md',
  ariaLabel,
  children,
  style,
  disabled,
  className = '',
  ...props
}) => {
  const sizeMap: Record<string, { width: string; height: string; fontSize: string }> = {
    xs: { width: '1.75rem', height: '1.75rem', fontSize: 'var(--text-xs)' },
    sm: { width: '2rem', height: '2rem', fontSize: 'var(--text-sm)' },
    md: { width: '2.35rem', height: '2.35rem', fontSize: 'var(--text-base)' },
    lg: { width: '2.75rem', height: '2.75rem', fontSize: 'var(--text-lg)' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--accent)',
      color: 'var(--accent-foreground)',
      borderColor: 'transparent',
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
      borderColor: 'transparent',
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
      aria-label={ariaLabel}
      className={`vm-icon-button ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all var(--transition-fast)',
        userSelect: 'none',
        padding: 0,
        ...sizeMap[size],
        ...variantStyles[variant],
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
