import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  id,
  style,
  className = '',
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--text-secondary)',
          }}
        >
          {label}
        </label>
      )}

      <select
        id={selectId}
        className={`vm-select ${className}`}
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${error ? 'var(--error)' : 'var(--border-subtle)'}`,
          backgroundColor: 'var(--bg-surface-solid)',
          color: 'var(--text-primary)',
          fontSize: 'var(--text-base)',
          fontFamily: 'inherit',
          outline: 'none',
          cursor: 'pointer',
          ...style,
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ backgroundColor: 'var(--bg-surface-solid)', color: 'var(--text-primary)' }}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--error)' }}>
          {error}
        </span>
      )}
    </div>
  );
};
