import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'cyan' | 'teal' | 'amber' | 'rose' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'cyan',
  size = 'md',
  dot = false,
  children,
  style,
  className = '',
  ...props
}) => {
  const colorMap: Record<string, { bg: string; text: string; border: string; dotColor: string }> = {
    cyan: {
      bg: 'var(--accent-light)',
      text: 'var(--accent)',
      border: 'rgba(56, 189, 248, 0.25)',
      dotColor: 'var(--accent)',
    },
    teal: {
      bg: 'var(--success-bg)',
      text: 'var(--success)',
      border: 'rgba(45, 212, 191, 0.25)',
      dotColor: 'var(--success)',
    },
    amber: {
      bg: 'var(--warning-bg)',
      text: 'var(--warning)',
      border: 'rgba(245, 158, 11, 0.25)',
      dotColor: 'var(--warning)',
    },
    rose: {
      bg: 'var(--error-bg)',
      text: 'var(--error)',
      border: 'rgba(251, 113, 133, 0.25)',
      dotColor: 'var(--error)',
    },
    neutral: {
      bg: 'var(--bg-surface-hover)',
      text: 'var(--text-secondary)',
      border: 'var(--border-subtle)',
      dotColor: 'var(--text-muted)',
    },
  };

  const current = colorMap[variant] || colorMap.neutral;

  return (
    <span
      className={`vm-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: size === 'sm' ? '0.15rem 0.45rem' : '0.2rem 0.65rem',
        borderRadius: 'var(--radius-pill)',
        fontSize: size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)',
        fontWeight: 600,
        backgroundColor: current.bg,
        color: current.text,
        border: `1px solid ${current.border}`,
        lineHeight: 1.2,
        userSelect: 'none',
        ...style,
      }}
      {...props}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: current.dotColor,
          }}
        />
      )}
      {children}
    </span>
  );
};
