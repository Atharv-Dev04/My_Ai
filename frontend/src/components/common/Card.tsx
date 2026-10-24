import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  variant = 'glass',
  padding = 'md',
  hoverable = false,
  children,
  style,
  className = '',
  ...props
}) => {
  const paddingMap = {
    none: 0,
    sm: 'var(--space-3)',
    md: 'var(--space-4)',
    lg: 'var(--space-6)',
  };

  const variantClass =
    variant === 'elevated'
      ? 'elevated-panel'
      : variant === 'solid'
      ? 'solid-panel'
      : 'glass-panel';

  return (
    <div
      className={`${variantClass} ${hoverable ? 'vm-hoverable-card' : ''} ${className}`}
      style={{
        padding: paddingMap[padding],
        transition: hoverable ? 'transform var(--transition-fast), border-color var(--transition-fast)' : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
      {hoverable && (
        <style>{`
          .vm-hoverable-card:hover {
            transform: translateY(-2px);
            border-color: var(--border-strong) !important;
          }
        `}</style>
      )}
    </div>
  );
};
