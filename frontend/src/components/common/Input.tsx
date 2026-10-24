import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightElement,
  style,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--text-secondary)',
          }}
        >
          {label}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {leftIcon && (
          <div
            style={{
              position: 'absolute',
              left: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          >
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          className={`vm-input ${className}`}
          style={{
            width: '100%',
            padding: leftIcon ? '0.5rem 0.75rem 0.5rem 2.25rem' : '0.5rem 0.75rem',
            paddingRight: rightElement ? '2.5rem' : '0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${error ? 'var(--error)' : 'var(--border-subtle)'}`,
            backgroundColor: 'var(--bg-surface-solid)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-base)',
            fontFamily: 'inherit',
            transition: 'border-color var(--transition-fast)',
            outline: 'none',
            ...style,
          }}
          {...props}
        />

        {rightElement && (
          <div
            style={{
              position: 'absolute',
              right: '0.65rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {rightElement}
          </div>
        )}
      </div>

      {error && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--error)', marginTop: '0.1rem' }}>
          {error}
        </span>
      )}
    </div>
  );
};
