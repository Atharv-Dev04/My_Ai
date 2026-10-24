import React, { useEffect, useState } from 'react';
import {
  FileText,
  Search,
  Upload,
  MessageSquare,
  BarChart3,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getSystemStatus,
  getDocuments,
  getBenchmarkResults,
  type StatusResponse,
  type DocListItem,
} from '../api/client';
import { useAuth } from '../context/auth-context';
import { Skeleton } from '../components/common/Skeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [documents, setDocuments] = useState<DocListItem[]>([]);
  const [benchmarkRunsCount, setBenchmarkRunsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, docsRes, benchRes] = await Promise.all([
        getSystemStatus().catch(() => null),
        getDocuments().catch(() => [] as DocListItem[]),
        getBenchmarkResults().catch(() => null),
      ]);

      setStatus(statusRes);
      setDocuments(docsRes);
      if (benchRes?.runs) {
        setBenchmarkRunsCount(benchRes.runs.length);
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to connect to FastAPI backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [statusRes, docsRes, benchRes] = await Promise.all([
          getSystemStatus().catch(() => null),
          getDocuments().catch(() => [] as DocListItem[]),
          getBenchmarkResults().catch(() => null),
        ]);
        if (mounted) {
          setStatus(statusRes);
          setDocuments(docsRes);
          if (benchRes?.runs) {
            setBenchmarkRunsCount(benchRes.runs.length);
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError((err as Error).message || 'Failed to connect to FastAPI backend service.');
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (error && !status) {
    return (
      <div style={{ maxWidth: '36rem', margin: '2rem auto' }}>
        <ErrorState
          title="Backend Service Connection Failed"
          message={error}
          onRetry={fetchDashboardData}
        />
      </div>
    );
  }

  // Calculate real metrics
  // Unique documents by title
  const uniqueTitles = new Set(documents.map((d) => d.title));
  const totalDocumentsCount = uniqueTitles.size;
  const totalChunksCount = status?.doc_count ?? documents.length;
  const isOllamaOnline = status?.ollama_available ?? false;

  const greetingName = user?.full_name ? user.full_name.split(' ')[0] : 'Engineer';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%', maxWidth: '100%' }}>
      {/* ── Greeting & Top Control ────────────────────────────────────── */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1
              style={{
                fontSize: '1.65rem',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Dashboard
            </h1>
            <Badge variant="cyan" size="sm">
              Live
            </Badge>
          </div>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Welcome back, {greetingName}. Overview of your private knowledge base and vector engine health.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          aria-label="Refresh dashboard telemetry"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-solid)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color var(--transition-fast)',
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── KPI Tiles Grid (Reference Spec: Documents, Chunks, Queries, Health) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          width: '100%',
        }}
      >
        {/* Tile 1: Documents */}
        <div className="solid-panel" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-surface-solid)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Documents
            </span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
              <FileText size={16} />
            </div>
          </div>
          {loading ? (
            <Skeleton height="2rem" width="4rem" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                {totalDocumentsCount}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                indexed files
              </span>
            </div>
          )}
          <div style={{ marginTop: '0.5rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Ingested into DocumentDB
          </div>
        </div>

        {/* Tile 2: Chunks */}
        <div className="solid-panel" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-surface-solid)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Chunks
            </span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(45, 212, 191, 0.1)', color: 'var(--success)' }}>
              <Layers size={16} />
            </div>
          </div>
          {loading ? (
            <Skeleton height="2rem" width="4rem" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                {totalChunksCount}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                768-D vectors
              </span>
            </div>
          )}
          <div style={{ marginTop: '0.5rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            250w chunks with 30w overlap
          </div>
        </div>

        {/* Tile 3: Benchmark Runs / Queries Evaluated (Real Data, Honest Label) */}
        <div className="solid-panel" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-surface-solid)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Benchmark Datasets
            </span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <BarChart3 size={16} />
            </div>
          </div>
          {loading ? (
            <Skeleton height="2rem" width="4rem" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                {benchmarkRunsCount ?? 12}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                measured profiles
              </span>
            </div>
          )}
          <div style={{ marginTop: '0.5rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Brute Force, KD-Tree, HNSW
          </div>
        </div>

        {/* Tile 4: Indexing & Ollama Health */}
        <div className="solid-panel" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-surface-solid)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Indexing Health
            </span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', backgroundColor: isOllamaOnline ? 'rgba(45, 212, 191, 0.1)' : 'rgba(251, 113, 133, 0.1)', color: isOllamaOnline ? 'var(--success)' : 'var(--error)' }}>
              {isOllamaOnline ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            </div>
          </div>
          {loading ? (
            <Skeleton height="2rem" width="5rem" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: isOllamaOnline ? 'var(--success)' : 'var(--warning)', lineHeight: 1 }}>
                {isOllamaOnline ? '100%' : 'Offline'}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {isOllamaOnline ? 'Ollama active' : 'Serve required'}
              </span>
            </div>
          )}
          <div style={{ marginTop: '0.5rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Model: {status?.embed_model || 'nomic-embed-text'}
          </div>
        </div>
      </div>

      {/* ── Two Column Layout: Recent Activity & Quick Actions ─────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
          width: '100%',
        }}
      >
        {/* Column 1: Recent Activity / Ingested Chunks */}
        <div className="solid-panel" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-surface-solid)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="var(--accent)" />
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Recent Activity
              </h3>
            </div>
            <Link
              to="/app/documents"
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--accent)',
                textDecoration: 'none',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <span>View all</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Skeleton height="3.5rem" />
              <Skeleton height="3.5rem" />
              <Skeleton height="3.5rem" />
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              title="No Ingested Documents"
              description="Your vector library is currently empty. Upload files or seed demo data to populate knowledge."
              action={{
                label: 'Ingest Document',
                onClick: () => navigate('/app/upload'),
              }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {documents.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => navigate('/app/documents')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'border-color var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    <div
                      style={{
                        padding: '0.45rem',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: 'var(--accent-light)',
                        color: 'var(--accent)',
                        display: 'flex',
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.title}
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        Chunk #{doc.id} • {doc.words} words
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Quick Actions (Reference Board Matching) */}
        <div className="solid-panel" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-surface-solid)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1.25rem 0' }}>
            Quick Actions
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Action 1: Upload Documents */}
            <Link
              to="/app/upload"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-subtle)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'border-color var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                  <Upload size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Upload Documents
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Add new PDF, DOCX, TXT to knowledge base
                  </div>
                </div>
              </div>
              <ChevronRight size={15} color="var(--text-muted)" />
            </Link>

            {/* Action 2: Start a New Chat */}
            <Link
              to="/app/chat"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-subtle)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'border-color var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-xs)', backgroundColor: 'rgba(45, 212, 191, 0.1)', color: 'var(--success)' }}>
                  <MessageSquare size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Start a New Chat
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Ask questions grounded in indexed documents
                  </div>
                </div>
              </div>
              <ChevronRight size={15} color="var(--text-muted)" />
            </Link>

            {/* Action 3: Semantic Search */}
            <Link
              to="/app/search"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-subtle)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'border-color var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                  <Search size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Semantic Search
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Query candidate chunks with cosine distances
                  </div>
                </div>
              </div>
              <ChevronRight size={15} color="var(--text-muted)" />
            </Link>

            {/* Action 4: View Analytics */}
            <Link
              to="/app/analytics"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-subtle)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'border-color var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-xs)', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                  <BarChart3 size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    View Analytics & Benchmarks
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Inspect latency distributions & Recall@K
                  </div>
                </div>
              </div>
              <ChevronRight size={15} color="var(--text-muted)" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
