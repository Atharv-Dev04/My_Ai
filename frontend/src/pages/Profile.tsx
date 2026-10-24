import React, { useState } from 'react';
import {
  User,
  ShieldAlert,
  KeyRound,
  ExternalLink,
  Layers,
  FileText,
  Clock,
  Terminal,
} from 'lucide-react';
import { Button } from '../components/common/Button';

export const ProfilePage: React.FC = () => {
  const [showTokenDemoNotice, setShowTokenDemoNotice] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '52rem' }}>
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            marginBottom: '0.25rem',
            color: 'var(--text-primary)',
          }}
        >
          User Identity & Session
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Manage your local developer session, access credentials, and identity status.
        </p>
      </div>

      {/* ── Honest Unauthenticated Notice ─────────────────────────────── */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderLeft: '4px solid var(--warning)',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ color: 'var(--warning)', marginTop: '0.2rem' }}>
          <ShieldAlert size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, marginBottom: '0.35rem' }}>
            Unauthenticated Mode (Local Developer Session)
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            User authentication and database-backed account sessions (PostgreSQL) are scheduled for future milestones.
            The current FastAPI service operates in single-tenant local mode with in-memory indexes.
            Personal details, avatars, and protected account settings will activate once authentication models are wired.
          </p>
        </div>
      </div>

      {/* ── Active Session Card ───────────────────────────────────────── */}
      <div className="solid-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>
          Active Environment Session
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-surface-hover)',
              border: '2px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <User size={32} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              Local Engineer
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              single_tenant_dev@vectormind.local
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                marginTop: '0.4rem',
                color: 'var(--accent)',
                backgroundColor: 'var(--accent-light)',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                fontWeight: 600,
              }}
            >
              Developer Access
            </div>
          </div>
        </div>

        {/* Read-Only Account Specifications */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Backend Authority</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.2rem' }}>
              FastAPI Standalone
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Host Node</div>
            <div style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '0.2rem' }}>
              127.0.0.1:8000
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Session Started</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={14} color="var(--text-muted)" /> Local Runtime
            </div>
          </div>
        </div>
      </div>

      {/* ── API Keys & Tokens ─────────────────────────────────────────── */}
      <div className="solid-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, marginBottom: '0.25rem' }}>
              API Access & Secrets
            </h3>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Client authorization tokens for remote API interaction. Secrets are stored in server environment variables.
            </p>
          </div>
          <KeyRound size={20} color="var(--text-muted)" />
        </div>

        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-surface-hover)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>vm_dev_••••••••••••••••••••••••</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Read/Write Local</span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowTokenDemoNotice(true)}
          >
            Create New Access Key
          </Button>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              padding: '0.4rem 0.75rem',
            }}
          >
            Authorize via Swagger <ExternalLink size={13} />
          </a>
        </div>

        {showTokenDemoNotice && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
            }}
          >
            <strong>Note: </strong> Token generation will be wired to PostgreSQL user tables upon authentication rollout.
          </div>
        )}
      </div>

      {/* ── Engine Allocation Summary ─────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Allocated Engine Quotas
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ color: 'var(--accent)' }}><Layers size={20} /></div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max Vector Dimension</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Up to 4096-D (NumPy)</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ color: 'var(--accent)' }}><FileText size={20} /></div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chunk Allocation</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Uncapped In-Memory</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ color: 'var(--accent)' }}><Terminal size={20} /></div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vector Algorithms</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>HNSW, KD-Tree, BF</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
