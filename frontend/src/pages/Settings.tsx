import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Moon,
  Sun,
  Server,
  Trash2,
  Check,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  Compass,
  Shield,
} from 'lucide-react';
import { usePreferences } from '../context/usePreferences';
import { Button } from '../components/common/Button';
import { getSystemStatus, type StatusResponse } from '../api/client';

export const SettingsPage: React.FC = () => {
  const { preferences, updatePreferences, resetPreferences } = usePreferences();

  // Local draft state to enable explicit Save / Cancel workflow
  const [draft, setDraft] = useState(preferences);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [systemStatus, setSystemStatus] = useState<StatusResponse | null>(null);

  // Destructive action confirmation modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [prevPreferences, setPrevPreferences] = useState(preferences);
  if (prevPreferences !== preferences) {
    setPrevPreferences(preferences);
    setDraft(preferences);
    setHasChanges(false);
  }

  useEffect(() => {
    getSystemStatus().then(setSystemStatus).catch(() => null);
  }, []);

  const handleChange = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    setHasChanges(JSON.stringify(next) !== JSON.stringify(preferences));
  };

  const handleSave = () => {
    updatePreferences(draft);
    setHasChanges(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCancel = () => {
    setDraft(preferences);
    setHasChanges(false);
  };

  const handleResetDefaults = () => {
    resetPreferences();
    setDraft(preferences);
    setHasChanges(false);
  };

  const handleClearLocalCache = () => {
    localStorage.removeItem('vectormind-user-preferences');
    resetPreferences();
    setShowClearConfirm(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        maxWidth: '56rem',
        margin: '0 auto',
        width: '100%',
        paddingBottom: '3rem',
      }}
    >
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--accent)',
                backgroundColor: 'var(--accent-light)',
                padding: '0.2rem 0.55rem',
                borderRadius: '9999px',
                border: '1px solid rgba(56, 189, 248, 0.2)',
              }}
            >
              <SlidersHorizontal size={12} />
              System Preferences
            </span>
          </div>
          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              margin: '0 0 0.25rem 0',
              color: 'var(--text-primary)',
            }}
          >
            Preferences & Settings
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Configure client theme, vector retrieval hyperparameters, and inspect read-only runtime parameters.
          </p>
        </div>

        {/* Global Save / Cancel action bar */}
        {hasChanges && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} leftIcon={<Check size={14} />}>
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Restrained success notification */}
      {saveSuccess && (
        <div
          role="status"
          style={{
            padding: '0.75rem 1.15rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--success-bg)',
            border: '1px solid rgba(45, 212, 191, 0.3)',
            color: 'var(--success)',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Check size={16} /> Preferences successfully updated and saved to local storage.
        </div>
      )}

      {/* ── Section 1: Appearance & UI ─────────────────────────────────── */}
      <div
        className="solid-panel"
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Sliders size={18} color="var(--accent)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Interface Appearance & Density
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Theme Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Visual Color Palette
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Dark-professional slate mode with restrained cyan accents or high-contrast light mode.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleChange('theme', 'dark')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.95rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${draft.theme === 'dark' ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  backgroundColor: draft.theme === 'dark' ? 'var(--accent-light)' : 'var(--bg-canvas)',
                  color: draft.theme === 'dark' ? 'var(--accent)' : 'var(--text-secondary)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Moon size={14} /> Dark Professional
              </button>
              <button
                type="button"
                onClick={() => handleChange('theme', 'light')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.95rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${draft.theme === 'light' ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  backgroundColor: draft.theme === 'light' ? 'var(--accent-light)' : 'var(--bg-canvas)',
                  color: draft.theme === 'light' ? 'var(--accent)' : 'var(--text-secondary)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Sun size={14} /> Light Canvas
              </button>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

          {/* Table / Layout Density */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Information Density
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Controls row height and padding across Document Library tables and telemetry cards.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleChange('density', 'comfortable')}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${draft.density === 'comfortable' ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  backgroundColor: draft.density === 'comfortable' ? 'var(--accent-light)' : 'var(--bg-canvas)',
                  color: draft.density === 'comfortable' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                Comfortable
              </button>
              <button
                type="button"
                onClick={() => handleChange('density', 'compact')}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${draft.density === 'compact' ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  backgroundColor: draft.density === 'compact' ? 'var(--accent-light)' : 'var(--bg-canvas)',
                  color: draft.density === 'compact' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                Compact (High Density)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Vector Retrieval Hyperparameters ───────────────── */}
      <div
        className="solid-panel"
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Compass size={18} color="var(--accent)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Vector Retrieval Hyperparameters
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Default Algorithm */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Primary Index Traversal Algorithm
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Index structure used during semantic similarity queries.
              </div>
            </div>

            <select
              value={draft.defaultAlgorithm}
              onChange={(e) => handleChange('defaultAlgorithm', e.target.value as typeof draft.defaultAlgorithm)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                outline: 'none',
              }}
            >
              <option value="hnsw">HNSW Graph (Hierarchical Navigable Small World)</option>
              <option value="kdtree">KD-Tree (Exact multidimensional partition)</option>
              <option value="bruteforce">BruteForce (Exact exhaustive baseline)</option>
            </select>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

          {/* Default Metric */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Similarity Distance Metric
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Mathematical distance formulation across high-dimensional float vectors.
              </div>
            </div>

            <select
              value={draft.defaultMetric}
              onChange={(e) => handleChange('defaultMetric', e.target.value as typeof draft.defaultMetric)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                outline: 'none',
              }}
            >
              <option value="cosine">Cosine Distance (Normalized directional alignment)</option>
              <option value="euclidean">Euclidean L2 (Straight-line spatial distance)</option>
              <option value="manhattan">Manhattan L1 (City-block sum of absolute differences)</option>
            </select>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

          {/* Default Top-K */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Default Candidate Depth (Top-K)
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Number of ranked candidate chunks returned per semantic query (1 to 20).
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                min="1"
                max="20"
                value={draft.defaultTopK}
                onChange={(e) => handleChange('defaultTopK', Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 5)))}
                style={{
                  width: '70px',
                  padding: '0.4rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-canvas)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>chunks</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Read-Only System Architecture & Models ─────────── */}
      <div
        className="solid-panel"
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Server size={18} color="var(--accent)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Server & Ollama Connectivity (Read-Only)
          </h2>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
          Runtime endpoints and hardware configurations are strictly bound through environment variables (<code>.env</code>) on the backend server.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>API Base Endpoint</div>
            <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
              {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
            </div>
          </div>

          <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Embedding Model</div>
            <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '0.25rem', color: 'var(--accent)' }}>
              {systemStatus?.embed_model || 'nomic-embed-text'}
            </div>
          </div>

          <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Generation Model</div>
            <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '0.25rem', color: 'var(--teal)' }}>
              {systemStatus?.gen_model || 'llama3.2'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Preferences Reset & Cache ───────────────────────── */}
      <div
        className="solid-panel"
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Shield size={18} color="var(--rose)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--rose)' }}>
            Preferences Reset & Storage Management
          </h2>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
          Restore factory defaults for UI layout density, top-k candidate limits, and vector algorithm configurations stored in browser storage.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="outline" size="sm" onClick={handleResetDefaults} leftIcon={<RotateCcw size={14} />}>
            Restore Default Settings
          </Button>

          <Button variant="danger" size="sm" onClick={() => setShowClearConfirm(true)} leftIcon={<Trash2 size={14} />}>
            Clear Local Preferences
          </Button>
        </div>

        {/* Confirmation Modal */}
        {showClearConfirm && (
          <div
            role="alertdialog"
            aria-modal="true"
            style={{
              marginTop: '1.25rem',
              padding: '1.15rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--rose)' }}>
              <AlertTriangle size={18} />
              <strong style={{ fontSize: '0.875rem' }}>Clear all stored preferences?</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              This will purge all custom theme, density, and retrieval settings from <code>localStorage</code> and reinitialize default values.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="danger" size="sm" onClick={handleClearLocalCache}>
                Confirm Purge
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
