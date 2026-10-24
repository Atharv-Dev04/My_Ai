import React, { useEffect, useState } from 'react';
import {
  Activity,
  Layers,
  FileText,
  Search,
  Upload,
  Cpu,
  RefreshCw,
  ArrowRight,
  Database,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  checkApiHealth,
  getSystemStatus,
  getVectorStats,
  getDocuments,
  loadDemoVectors,
  type HealthResponse,
  type StatusResponse,
  type VectorStats,
  type DocListItem,
} from '../api/client';
import { Skeleton } from '../components/common/Skeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';

export const DashboardPage: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [vectorStats, setVectorStats] = useState<VectorStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<DocListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [seedingDemo, setSeedingDemo] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [healthRes, statusRes, statsRes, docsRes] = await Promise.all([
          checkApiHealth(),
          getSystemStatus().catch(() => null),
          getVectorStats().catch(() => null),
          getDocuments().catch(() => [] as DocListItem[]),
        ]);
        if (mounted) {
          setHealth(healthRes);
          setStatus(statusRes);
          setVectorStats(statsRes);
          setRecentDocs(docsRes);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError((err as Error).message || 'Failed to connect to FastAPI backend');
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, statusRes, statsRes, docsRes] = await Promise.all([
        checkApiHealth(),
        getSystemStatus().catch(() => null),
        getVectorStats().catch(() => null),
        getDocuments().catch(() => [] as DocListItem[]),
      ]);
      setHealth(healthRes);
      setStatus(statusRes);
      setVectorStats(statsRes);
      setRecentDocs(docsRes);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to connect to FastAPI backend');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeedingDemo(true);
    try {
      await loadDemoVectors();
      await refreshData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Demo vectors already loaded or could not be inserted');
    } finally {
      setSeedingDemo(false);
    }
  };

  if (error && !health) {
    return (
      <div style={{ maxWidth: '36rem', margin: '2rem auto' }}>
        <ErrorState
          title="FastAPI Service Offline"
          message={error}
          onRetry={refreshData}
        />
      </div>
    );
  }

  const totalVectors = vectorStats?.count ?? status?.demo_count ?? 0;
  const vectorDims = vectorStats?.dims ?? status?.demo_dims ?? 16;
  const totalChunks = status?.doc_count ?? recentDocs.length;
  const isOllamaOnline = status?.ollama_available ?? false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* ── Page Header & Quick Controls ──────────────────────────────── */}
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
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              marginBottom: '0.25rem',
              color: 'var(--text-primary)',
            }}
          >
            System Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Real-time backend indexing metrics, Ollama model availability, and document chunk telemetry.
          </p>
        </div>

        <button
          onClick={refreshData}
          disabled={loading}
          aria-label="Refresh telemetry"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color var(--transition-fast)',
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* ── Metric Cards Grid ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Vectors Metric */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Indexed Vectors
            </span>
            <div style={{ color: 'var(--accent)' }}>
              <Layers size={18} />
            </div>
          </div>
          {loading ? (
            <Skeleton height="2rem" width="4rem" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {totalVectors}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ({vectorDims}-D vectors)
              </span>
            </div>
          )}
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Algorithms: HNSW, KD-Tree, BruteForce
          </div>
        </div>

        {/* Knowledge Chunks Metric */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Document Chunks
            </span>
            <div style={{ color: 'var(--accent)' }}>
              <FileText size={18} />
            </div>
          </div>
          {loading ? (
            <Skeleton height="2rem" width="4rem" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {totalChunks}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                in DocumentDB
              </span>
            </div>
          )}
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Word boundary chunking (250w / 30 ovlp)
          </div>
        </div>

        {/* Ollama Local Integration Status */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Ollama Engine
            </span>
            <div style={{ color: isOllamaOnline ? 'var(--success)' : 'var(--warning)' }}>
              <Cpu size={18} />
            </div>
          </div>
          {loading ? (
            <Skeleton height="2rem" width="6rem" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isOllamaOnline ? 'var(--success)' : 'var(--warning)',
                }}
              />
              <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                {isOllamaOnline ? 'Online (Local)' : 'Standby / Offline'}
              </span>
            </div>
          )}
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {status?.embed_model || 'nomic-embed-text'} • {status?.gen_model || 'llama3.2'}
          </div>
        </div>

        {/* API Backend Health */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              FastAPI Liveness
            </span>
            <div style={{ color: 'var(--success)' }}>
              <Activity size={18} />
            </div>
          </div>
          {loading ? (
            <Skeleton height="2rem" width="5rem" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success)',
                }}
              />
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--success)' }}>
                {health?.status || 'ok'} (v{health?.version || '0.1.0'})
              </span>
            </div>
          )}
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Port 8000 • In-Memory Python Engine
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="solid-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Quick Platform Actions
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            to="/app/upload"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-foreground)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            <Upload size={14} /> Ingest Document
          </Link>

          <Link
            to="/app/search"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--bg-surface-hover)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            <Search size={14} /> Run Vector Search
          </Link>

          {totalVectors === 0 && (
            <button
              onClick={handleSeedDemo}
              disabled={seedingDemo}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'var(--accent-light)',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: seedingDemo ? 'not-allowed' : 'pointer',
              }}
            >
              <Database size={14} /> {seedingDemo ? 'Seeding...' : 'Load 20 Demo Vectors'}
            </button>
          )}

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={14} /> FastAPI Swagger Docs
          </a>
        </div>
      </div>

      {/* ── Recent Document Chunks List / First-Run Empty State ───────── */}
      <div className="solid-panel" style={{ padding: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
              Recent Document Ingestion ({recentDocs.length})
            </h3>
          </div>
          <Link
            to="/app/documents"
            style={{
              fontSize: '0.75rem',
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
            }}
          >
            All Documents <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Skeleton height="3rem" />
            <Skeleton height="3rem" />
            <Skeleton height="3rem" />
          </div>
        ) : recentDocs.length === 0 ? (
          <EmptyState
            title="No Documents Ingested Yet"
            description="Your DocumentDB index is empty. Upload text or markdown to generate semantic embeddings with Ollama."
            action={{
              label: 'Upload First Document',
              onClick: () => {
                window.location.href = '/app/upload';
              },
            }}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.8125rem',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>Title</th>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>Preview</th>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>Word Count</th>
                </tr>
              </thead>
              <tbody>
                {recentDocs.slice(0, 5).map((doc) => (
                  <tr
                    key={doc.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background-color var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                      #{doc.id}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {doc.title}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', maxWidth: '28rem' }}>
                      {doc.preview}...
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {doc.words} words
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
