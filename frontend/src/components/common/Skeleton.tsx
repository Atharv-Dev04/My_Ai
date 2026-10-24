import React from 'react';

interface SkeletonProps {
  height?: string | number;
  width?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  height = '1rem',
  width = '100%',
  borderRadius = 'var(--radius-sm)',
  className = '',
  style,
}) => {
  return (
    <div
      className={`skeleton-loader ${className}`}
      style={{
        height,
        width,
        borderRadius,
        backgroundColor: 'var(--border-subtle)',
        opacity: 0.5,
        animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        ...style,
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};
