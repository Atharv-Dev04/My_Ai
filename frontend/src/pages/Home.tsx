import React, { useEffect, useState } from 'react';
import { Activity, ArrowRight, BookOpen, Cpu, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { checkApiHealth, type HealthResponse } from '../api/client';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const HomePage: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    checkApiHealth()
      .then((data) => {
        if (mounted) {
          setHealth(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'FastAPI service offline');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero Section */}
      <div
        className="glass-panel"
        style={{
          padding: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '42rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.6rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent)',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
            <span>v0.1.0</span>
            <span>•</span>
            <span>Vector Engine & REST API</span>
          </div>
          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              marginBottom: '1rem',
              color: 'var(--text-primary)',
            }}
          >
            VectorMind Semantic Platform
          </h1>
          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}
          >
            AI knowledge and high-performance vector search engine featuring BruteForce, KD-Tree,
            and Hierarchical Navigable Small World (HNSW) graph indexing with Ollama embeddings.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              to="/search"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-foreground)',
                padding: '0.6rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              Try Vector Search <ArrowRight size={16} />
            </Link>
            <Link
              to="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '0.6rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              View System Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Backend Status Card */}
      <div className="solid-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="var(--accent)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Backend Service Connectivity</h3>
          </div>
          {loading ? (
            <LoadingSpinner size="sm" label="Connecting..." />
          ) : error ? (
            <span style={{ fontSize: '0.8125rem', color: 'var(--error)', fontWeight: 500 }}>{error}</span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8125rem',
                color: 'var(--success)',
                fontWeight: 600,
              }}
            >
              ● Connected ({health?.status})
            </span>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Configured API URL</div>
            <div style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '0.25rem' }}>
              {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
            </div>
          </div>
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vector Database Engine</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.25rem' }}>
              {health?.vector_db ? `${health.vector_db.items} items (${health.vector_db.dims}-D)` : 'Standalone In-Memory Engine'}
            </div>
          </div>
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>
            <Cpu size={24} />
          </div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Native Vector Engines</h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Bit-accurate Python implementations of BruteForce, KD-Tree, and HNSW graph traversal matching C++ reference parity.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>
            <BookOpen size={24} />
          </div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Ingestion & RAG Pipeline</h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Document chunking, context assembly, and Ollama embeddings for zero-mock, local-first semantic retrieval.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>
            <ShieldCheck size={24} />
          </div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Restrained Glassmorphic UI</h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Selective translucency, accessible typography, solid data tables, responsive layouts, and zero visual bloat.
          </p>
        </div>
      </div>
    </div>
  );
};
