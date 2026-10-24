import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  ExternalLink,
  Layers,
  FileText,
  Clock,
  Terminal,
  LogIn,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/auth-context';
import { AuthModal } from '../components/auth/AuthModal';

export const ProfilePage: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [showTokenDetails, setShowTokenDetails] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '52rem' }}>
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            Manage your authenticated account, relational persistence, and identity status.
          </p>
        </div>

        {user ? (
          <Button variant="secondary" size="sm" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <LogOut size={14} />
            <span>Sign Out</span>
          </Button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setAuthModalMode('login');
                setAuthModalOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setAuthModalMode('register');
                setAuthModalOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>Register</span>
            </Button>
          </div>
        )}
      </div>

      {/* ── Authenticated Status Notice ─────────────────────────────────── */}
      {user ? (
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem',
            borderLeft: '4px solid var(--success, #10b981)',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ color: 'var(--success, #10b981)', marginTop: '0.2rem' }}>
            <ShieldCheck size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
              Authenticated Session Active (PostgreSQL / Relational Persistence)
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your account is authenticated via signed JWT bearer tokens. All chat history, message citations,
              uploaded documents, and user preferences are persistently stored with strict cross-user resource isolation.
            </p>
          </div>
        </div>
      ) : (
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
              Anonymous Developer Session (Unauthenticated)
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              You are currently using the workspace without an active login. Sign in or register above to link your sessions,
              persist conversation histories across browser reloads, and access isolated document stores.
            </p>
          </div>
        </div>
      )}

      {/* ── Active Session Card ───────────────────────────────────────── */}
      <div className="solid-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>
          {user ? 'User Account Profile' : 'Local Environment Session'}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: user ? 'var(--accent-light)' : 'var(--bg-surface-hover)',
              border: '2px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: user ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            {user ? <UserCheck size={32} /> : <User size={32} />}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              {user ? (user.full_name || 'Authenticated Member') : 'Local Engineer'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {user ? user.email : 'single_tenant_dev@vectormind.local'}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                marginTop: '0.4rem',
                color: user ? 'var(--success, #10b981)' : 'var(--accent)',
                backgroundColor: user ? 'rgba(16, 185, 129, 0.12)' : 'var(--accent-light)',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                fontWeight: 600,
              }}
            >
              {user ? `User ID #${user.id} • Active` : 'Developer Access'}
            </div>
          </div>
        </div>

        {/* Account Specifications */}
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
              FastAPI Standalone (SQLAlchemy 2.x)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Host Node</div>
            <div style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '0.2rem' }}>
              127.0.0.1:8000
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Created</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={14} color="var(--text-muted)" />
              {user ? new Date(user.created_at).toLocaleDateString() : 'Local Runtime'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Security & Authentication Credentials ───────────────────────── */}
      <div className="solid-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <KeyRound size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
            Security & Token Credentials
          </h3>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          API calls from the frontend transmit signed JWT tokens in the <code>Authorization: Bearer</code> header.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {token ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTokenDetails(!showTokenDetails)}
            >
              {showTokenDetails ? 'Hide JWT Token Details' : 'View JWT Token Details'}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setAuthModalMode('login');
                setAuthModalOpen(true);
              }}
            >
              Sign In to Inspect JWT Token
            </Button>
          )}

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

        {showTokenDetails && token && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              wordBreak: 'break-all',
            }}
          >
            <strong>Bearer Token:</strong> {token}
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

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
      />
    </div>
  );
};
