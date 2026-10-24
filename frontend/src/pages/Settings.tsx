import React, { useEffect, useState } from 'react';
import {
  Settings,
  Sliders,
  Moon,
  Sun,
  Server,
  Trash2,
  Check,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { usePreferences } from '../context/usePreferences';
import { Button } from '../components/common/Button';
import { getSystemStatus, type StatusResponse } from '../api/client';

export const SettingsPage: React.FC = () => {
  const { preferences, updatePreferences, resetPreferences } = usePreferences();

  // Local draft state to enable Save / Cancel workflow
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '52rem' }}>
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
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
            Preferences & Settings
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Configure client appearance, query defaults, and view local server connectivity parameters.
          </p>
        </div>

        {/* Global Save / Cancel action bar */}
        {hasChanges && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Success notification */}
      {saveSuccess && (
        <div
          role="status"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--success-bg)',
            border: '1px solid var(--success)',
            color: 'var(--success)',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Check size={16} /> Preferences successfully updated.
        </div>
      )}

      {/* ── Section 1: Appearance & UI ─────────────────────────────────── */}
      <div className="solid-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Sliders size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Appearance & Layout</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Theme Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Interface Theme</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Select visual display mode with restrained glassmorphic translucent surfaces.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleChange('theme', 'dark')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: draft.theme === 'dark' ? 'var(--accent)' : 'var(--bg-surface)',
                  color: draft.theme === 'dark' ? 'var(--accent-foreground)' : 'var(--text-primary)',
                }}
              >
                <Moon size={14} /> Dark
              </button>
              <button
                type="button"
                onClick={() => handleChange('theme', 'light')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: draft.theme === 'light' ? 'var(--accent)' : 'var(--bg-surface)',
                  color: draft.theme === 'light' ? 'var(--accent-foreground)' : 'var(--text-primary)',
                }}
              >
                <Sun size={14} /> Light
              </button>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

          {/* Table / Layout Density */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Information Density</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Adjust padding for data lists, telemetry grids, and document tables.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleChange('density', 'comfortable')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: draft.density === 'comfortable' ? 'var(--accent-light)' : 'var(--bg-surface)',
                  color: draft.density === 'comfortable' ? 'var(--accent)' : 'var(--text-secondary)',
                  borderColor: draft.density === 'comfortable' ? 'var(--accent)' : 'var(--border-subtle)',
                }}
              >
                Comfortable
              </button>
              <button
                type="button"
                onClick={() => handleChange('density', 'compact')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: draft.density === 'compact' ? 'var(--accent-light)' : 'var(--bg-surface)',
                  color: draft.density === 'compact' ? 'var(--accent)' : 'var(--text-secondary)',
                  borderColor: draft.density === 'compact' ? 'var(--accent)' : 'var(--border-subtle)',
                }}
              >
                Compact
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Vector Query Defaults ──────────────────────────── */}
      <div className="solid-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Settings size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Vector Query & Search Defaults</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Default Algorithm */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Default Engine Algorithm</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Algorithm selected by default in search benchmarks and retrieval tasks.
              </div>
            </div>

            <select
              value={draft.defaultAlgorithm}
              onChange={(e) => handleChange('defaultAlgorithm', e.target.value as typeof draft.defaultAlgorithm)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
              }}
            >
              <option value="hnsw">HNSW Graph (Recommended for large datasets)</option>
              <option value="kdtree">KD-Tree (Exact Euclidean partitions)</option>
              <option value="bruteforce">BruteForce (Exact linear baseline)</option>
            </select>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

          {/* Default Metric */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Default Distance Metric</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Similarity calculation across float32 query vectors.
              </div>
            </div>

            <select
              value={draft.defaultMetric}
              onChange={(e) => handleChange('defaultMetric', e.target.value as typeof draft.defaultMetric)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
              }}
            >
              <option value="cosine">Cosine Distance</option>
              <option value="euclidean">Euclidean (L2)</option>
              <option value="manhattan">Manhattan (L1)</option>
            </select>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

          {/* Default Top-K */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Default Top-K Results</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Number of nearest neighbor candidates returned per search (1 to 50).
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                min="1"
                max="50"
                value={draft.defaultTopK}
                onChange={(e) => handleChange('defaultTopK', Math.max(1, Math.min(50, parseInt(e.target.value) || 5)))}
                style={{
                  width: '70px',
                  padding: '0.4rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  textAlign: 'center',
                }}
              />
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>items</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Connection & Model Parameters (Read-Only) ───────── */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Server size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
            Server & Ollama Connectivity (Read-Only)
          </h3>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
          These backend parameters are managed via environment variables (e.g. <code>.env</code>) on the FastAPI server to ensure credentials and network addresses never leak to the client.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>API Base URL</div>
            <div style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '0.2rem' }}>
              {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
            </div>
          </div>

          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Embedding Model</div>
            <div style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '0.2rem' }}>
              {systemStatus?.embed_model || 'nomic-embed-text'}
            </div>
          </div>

          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generation Model</div>
            <div style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '0.2rem' }}>
              {systemStatus?.gen_model || 'llama3.2'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Data Management & Destructive Actions ───────────── */}
      <div className="solid-panel" style={{ padding: '1.5rem', borderColor: 'var(--error-bg)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--error)' }}>
          Preferences Reset & Cache
        </h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
          Restore factory defaults for UI density, top-k, and vector algorithm configurations stored in your browser.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={handleResetDefaults}>
            <RotateCcw size={14} /> Restore Default Settings
          </Button>

          <Button variant="danger" size="sm" onClick={() => setShowClearConfirm(true)}>
            <Trash2 size={14} /> Clear Local Browser Preferences
          </Button>
        </div>

        {/* Confirmation Modal */}
        {showClearConfirm && (
          <div
            role="alertdialog"
            aria-modal="true"
            style={{
              marginTop: '1.25rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--error-bg)',
              border: '1px solid var(--error)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)' }}>
              <AlertTriangle size={18} />
              <strong style={{ fontSize: '0.875rem' }}>Are you sure you want to clear preferences?</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              This will reset all theme and search defaults stored in localStorage back to default values.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="danger" size="sm" onClick={handleClearLocalCache}>
                Confirm & Reset
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
