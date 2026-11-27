import React, { useEffect, useState } from 'react';
import {
  User,
  SlidersHorizontal,
  Server,
  Shield,
  Check,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Save,
  LogIn,
  LogOut,
} from 'lucide-react';
import { usePreferences } from '../context/usePreferences';
import { useAuth } from '../context/auth-context';
import { getSystemStatus, type StatusResponse } from '../api/client';
import { Link } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  const { user, logout } = useAuth();

  // Local draft state for preferences
  const [draft, setDraft] = useState(preferences);
  const [hasPrefChanges, setHasPrefChanges] = useState(false);
  const [prefSaveSuccess, setPrefSaveSuccess] = useState(false);

  // Profile editing state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(() => localStorage.getItem('vectormind_user_bio') || 'AI Researcher & Knowledge Explorer');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  const [systemStatus, setSystemStatus] = useState<StatusResponse | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
  }, [user]);

  useEffect(() => {
    getSystemStatus().then(setSystemStatus).catch(() => null);
  }, []);

  const handlePrefChange = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    setHasPrefChanges(JSON.stringify(next) !== JSON.stringify(preferences));
  };

  const handleSavePreferences = () => {
    updatePreferences(draft);
    setHasPrefChanges(false);
    setPrefSaveSuccess(true);
    setTimeout(() => setPrefSaveSuccess(false), 2500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('vectormind_user_bio', bio);
    localStorage.setItem('vectormind_user_name', fullName);
    setProfileSaveSuccess(true);
    setTimeout(() => setProfileSaveSuccess(false), 2500);
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
        gap: '2rem',
        maxWidth: '56rem',
        margin: '0 auto',
        width: '100%',
        padding: '1rem 0 4rem 0',
        color: '#ffffff',
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
          paddingBottom: '1.25rem',
          borderBottom: '1px solid #262626',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              margin: '0 0 0.35rem 0',
              color: '#ffffff',
            }}
          >
            Settings & Profile
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#a3a3a3' }}>
            Manage your personal profile, vector retrieval parameters, and AI model settings.
          </p>
        </div>
      </div>

      {/* ── Section 1: User Profile & Account ───────────────────────────── */}
      <div
        style={{
          padding: '1.75rem',
          backgroundColor: '#0d0d0d',
          border: '1px solid #262626',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem' }}>
          <User size={20} color="#ffffff" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: '#ffffff' }}>
            Profile Information
          </h2>
        </div>

        {profileSaveSuccess && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#1f1f1f',
              border: '1px solid #404040',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <Check size={16} /> Profile information updated successfully.
          </div>
        )}

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#d4d4d4', marginBottom: '0.35rem' }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your Name"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#171717',
                  border: '1px solid #262626',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#737373')}
                onBlur={(e) => (e.target.style.borderColor = '#262626')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#d4d4d4', marginBottom: '0.35rem' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={user?.email || 'guest@vectormind.local'}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: '#121212',
                    border: '1px solid #262626',
                    borderRadius: '8px',
                    color: '#737373',
                    fontSize: '0.875rem',
                    cursor: 'not-allowed',
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#d4d4d4', marginBottom: '0.35rem' }}>
              Bio / Role Description
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. AI Researcher, Systems Engineer"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#171717',
                border: '1px solid #262626',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.875rem',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#737373')}
              onBlur={(e) => (e.target.style.borderColor = '#262626')}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.8125rem', color: '#737373' }}>
              Account status:{' '}
              <strong style={{ color: user ? '#ffffff' : '#a3a3a3' }}>
                {user ? `Active (${user.email})` : 'Guest Mode (Local session)'}
              </strong>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {user ? (
                <button
                  type="button"
                  onClick={logout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #333333',
                    backgroundColor: '#171717',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              ) : (
                <Link
                  to="/login"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #333333',
                    backgroundColor: '#171717',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  <LogIn size={14} />
                  Sign In / Register
                </Link>
              )}

              <button
                type="submit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Save size={14} />
                Save Profile
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Section 2: AI & Vector Retrieval Preferences ──────────────── */}
      <div
        style={{
          padding: '1.75rem',
          backgroundColor: '#0d0d0d',
          border: '1px solid #262626',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <SlidersHorizontal size={20} color="#ffffff" />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: '#ffffff' }}>
              AI Model & Retrieval Settings
            </h2>
          </div>

          {hasPrefChanges && (
            <button
              onClick={handleSavePreferences}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#ffffff',
                color: '#000000',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Check size={14} /> Save Preferences
            </button>
          )}
        </div>

        {prefSaveSuccess && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#1f1f1f',
              border: '1px solid #404040',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <Check size={16} /> Retrieval preferences saved to storage.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Default Top-K */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>
                Context Document Depth (Top-K)
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#a3a3a3' }}>
                Number of relevant custom document chunks provided to the AI per prompt.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                min="1"
                max="20"
                value={draft.defaultTopK}
                onChange={(e) => handlePrefChange('defaultTopK', Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 3)))}
                style={{
                  width: '70px',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: '1px solid #262626',
                  backgroundColor: '#171717',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.8125rem', color: '#737373' }}>chunks</span>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #1f1f1f' }} />

          {/* Algorithm */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>
                Vector Search Engine Algorithm
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#a3a3a3' }}>
                Underlying index algorithm for retrieving answers from documents.
              </div>
            </div>

            <select
              value={draft.defaultAlgorithm}
              onChange={(e) => handlePrefChange('defaultAlgorithm', e.target.value as typeof draft.defaultAlgorithm)}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #262626',
                backgroundColor: '#171717',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 500,
                outline: 'none',
              }}
            >
              <option value="hnsw">HNSW Graph (High-Speed Approximate)</option>
              <option value="kdtree">KD-Tree (Spatial Partition)</option>
              <option value="bruteforce">Brute Force (Exact Linear Scan)</option>
            </select>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #1f1f1f' }} />

          {/* Distance Metric */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>
                Distance Metric
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#a3a3a3' }}>
                Mathematical formula used to compute semantic chunk similarity.
              </div>
            </div>

            <select
              value={draft.defaultMetric}
              onChange={(e) => handlePrefChange('defaultMetric', e.target.value as typeof draft.defaultMetric)}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #262626',
                backgroundColor: '#171717',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 500,
                outline: 'none',
              }}
            >
              <option value="cosine">Cosine Distance (Recommended)</option>
              <option value="euclidean">Euclidean L2</option>
              <option value="manhattan">Manhattan L1</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Section 3: Read-Only System Diagnostics ──────────────────── */}
      <div
        style={{
          padding: '1.75rem',
          backgroundColor: '#0d0d0d',
          border: '1px solid #262626',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <Server size={20} color="#ffffff" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: '#ffffff' }}>
            Ollama & Backend Diagnostics
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: '#141414', border: '1px solid #262626' }}>
            <div style={{ fontSize: '0.725rem', color: '#737373', textTransform: 'uppercase', fontWeight: 600 }}>API Status</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.25rem', color: '#ffffff' }}>
              {systemStatus ? 'Online (FastAPI)' : 'Checking...'}
            </div>
          </div>

          <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: '#141414', border: '1px solid #262626' }}>
            <div style={{ fontSize: '0.725rem', color: '#737373', textTransform: 'uppercase', fontWeight: 600 }}>Ollama Embedder</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.25rem', color: '#ffffff' }}>
              {systemStatus?.embed_model || 'nomic-embed-text'}
            </div>
          </div>

          <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: '#141414', border: '1px solid #262626' }}>
            <div style={{ fontSize: '0.725rem', color: '#737373', textTransform: 'uppercase', fontWeight: 600 }}>Ollama Generator</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.25rem', color: '#ffffff' }}>
              {systemStatus?.gen_model || 'llama3.2'}
            </div>
          </div>

          <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: '#141414', border: '1px solid #262626' }}>
            <div style={{ fontSize: '0.725rem', color: '#737373', textTransform: 'uppercase', fontWeight: 600 }}>Indexed Document Chunks</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.25rem', color: '#ffffff' }}>
              {systemStatus?.doc_count ?? 0} Chunks
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Reset & Storage ───────────────────────────────── */}
      <div
        style={{
          padding: '1.75rem',
          backgroundColor: '#0d0d0d',
          border: '1px solid #262626',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
          <Shield size={20} color="#a3a3a3" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: '#ffffff' }}>
            Storage & Cache Reset
          </h2>
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#a3a3a3', lineHeight: 1.5, marginBottom: '1.25rem' }}>
          Reset your locally saved preferences and clear cached conversation history from browser storage.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              resetPreferences();
              setDraft(preferences);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: '1px solid #333333',
              backgroundColor: '#171717',
              color: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
            Reset Defaults
          </button>

          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: '1px solid #404040',
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} />
            Clear Storage
          </button>
        </div>

        {showClearConfirm && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1.15rem',
              borderRadius: '8px',
              backgroundColor: '#171717',
              border: '1px solid #404040',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
              <AlertTriangle size={18} />
              <strong style={{ fontSize: '0.875rem' }}>Clear all local cache and preferences?</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#a3a3a3' }}>
              This will clear your local preferences and restore default values.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleClearLocalCache}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '6px',
                  backgroundColor: '#262626',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
