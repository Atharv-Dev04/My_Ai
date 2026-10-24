import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface RoutePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  nextTaskNote?: string;
}

export const RoutePlaceholder: React.FC<RoutePlaceholderProps> = ({
  title,
  description,
  icon: Icon,
  badge = 'Foundation Route',
  nextTaskNote,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1.25rem',
        }}
      >
        <div
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent)',
            display: 'flex',
          }}
        >
          <Icon size={28} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {title}
            </h2>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              {badge}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.925rem', color: 'var(--text-secondary)' }}>
            {description}
          </p>
        </div>
      </div>

      {/* Solid Surface Information Card */}
      <div className="solid-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Architecture & Implementation Details
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
          This route foundation is established with responsive layout scaffolding, design system tokens,
          and routing boundaries. In future tasks, full specialized interactive views will be wired to backend endpoints.
        </p>

        {nextTaskNote && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface-hover)',
              borderLeft: '3px solid var(--accent)',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
            }}
          >
            <strong>Roadmap: </strong> {nextTaskNote}
          </div>
        )}
      </div>
    </div>
  );
};
