import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  Clock,
  ArrowRight,
  ExternalLink,
  Info,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  searchDocuments,
  type ContextChunk,
  type DocSearchResponse,
} from '../api/client';
import { usePreferences } from '../context/usePreferences';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Skeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';

export const SearchPage: React.FC = () => {
  const { preferences } = usePreferences();

  // Search parameters
  const [query, setQuery] = useState<string>('');
  const [topK, setTopK] = useState<number>(preferences.defaultTopK || 5);

  // Search state & results
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<DocSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Selected chunk for detailed inspection modal
  const [selectedChunk, setSelectedChunk] = useState<ContextChunk | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    setLoading(true);
    setError(null);
    try {
      const res = await searchDocuments(cleanQuery, topK);
      setResponse(res);
    } catch (err: unknown) {
      setError((err as Error).message || 'Semantic search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResponse(null);
    setError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '56rem' }}>
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
          Semantic Knowledge Search
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Natural language semantic retrieval powered by local Ollama embeddings and DocumentDB vector traversal.
        </p>
      </div>

      {/* ── Search Query Box & Controls ───────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question or enter semantic concepts (e.g., 'What is dynamic programming?')..."
              style={{
                width: '100%',
                padding: '0.75rem 2.5rem 0.75rem 2.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-hover)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear query"
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Controls Bar: Top-K, Algorithm Info, Submit Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              paddingTop: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              {/* Top-K Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Top-K:</span>
                <select
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value))}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <option value={1}>1 chunk</option>
                  <option value={3}>3 chunks</option>
                  <option value={5}>5 chunks</option>
                  <option value={10}>10 chunks</option>
                  <option value={15}>15 chunks</option>
                </select>
              </div>

              {/* Algorithm Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
                <SlidersHorizontal size={14} color="var(--accent)" />
                <span style={{ color: 'var(--text-muted)' }}>Index:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                  DocumentDB (Cosine HNSW)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {response && (
                <Button variant="ghost" size="md" onClick={handleClear} type="button">
                  Clear
                </Button>
              )}
              <Button variant="primary" size="md" type="submit" isLoading={loading} disabled={!query.trim()}>
                Search Documents <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Distance & Metric Reference Notice ────────────────────────── */}
      <div
        className="glass-panel"
        style={{
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
        }}
      >
        <Info size={16} color="var(--accent)" />
        <span>
          <strong>Scoring Metric: </strong> DocumentDB computes cosine distance <code>d = 1.0 - cos_sim(u, v)</code>. A lower distance indicates closer semantic alignment (<code>0.0</code> is identical, <code>≤ 0.7</code> satisfies the retrieval threshold).
        </span>
      </div>

      {/* ── Results Telemetry Banner ──────────────────────────────────── */}
      {response && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-surface-hover)',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={15} color="var(--success)" />
            <span>Found <strong>{response.contexts.length}</strong> matching candidate chunks for: <em>"{response.query}"</em></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontFamily: 'var(--font-mono)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={13} /> {response.latency_ms} ms roundtrip
            </span>
            <span>Index size: {response.total_chunks_scanned}</span>
          </div>
        </div>
      )}

      {/* ── Loading Skeleton / Error / Empty States ───────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Skeleton height="7rem" />
          <Skeleton height="7rem" />
          <Skeleton height="7rem" />
        </div>
      ) : error ? (
        <div style={{ maxWidth: '36rem', margin: '1rem auto' }}>
          <ErrorState
            title="Semantic Search Failed"
            message={error}
            onRetry={handleSearch}
          />
        </div>
      ) : response && response.contexts.length === 0 ? (
        <EmptyState
          title="No Relevant Chunks Found"
          description={`No document chunks met the cosine similarity threshold (max_dist <= 0.7) for "${response.query}". Try rephrasing your search or uploading more knowledge.`}
          action={{
            label: 'Upload Knowledge Documents',
            onClick: () => {
              window.location.href = '/app/upload';
            },
          }}
        />
      ) : response ? (
        /* ── Candidate Results List ─────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {response.contexts.map((ctx, idx) => {
            const similarityPercent = Math.max(0, Math.min(100, Math.round((1.0 - ctx.distance) * 100)));
            return (
              <div
                key={ctx.id}
                onClick={() => setSelectedChunk(ctx)}
                className="solid-panel"
                style={{
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'border-color var(--transition-fast), transform var(--transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--accent-light)',
                        color: 'var(--accent)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      RANK #{idx + 1}
                    </span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                      {ctx.title}
                    </h3>
                  </div>

                  {/* Similarity & Distance Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        backgroundColor: ctx.distance < 0.4 ? 'var(--success-bg)' : 'var(--warning-bg)',
                        color: ctx.distance < 0.4 ? 'var(--success)' : 'var(--warning)',
                        fontWeight: 600,
                      }}
                    >
                      {similarityPercent}% match
                    </span>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      dist: {ctx.distance.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Safe plain text snippet */}
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    margin: '0 0 0.85rem 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {ctx.text}
                </p>

                {/* Metadata tags */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Chunk ID: #{ctx.id}</span>
                  {ctx.page_number && <span>Page {ctx.page_number}</span>}
                  <span>Position #{ctx.chunk_index}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    Inspect full chunk <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* First-run prompt before any query */
        <EmptyState
          title="Ready for Semantic Search"
          description="Type a question or keywords above. Your query will be transformed into an embedding vector via local Ollama models and compared against DocumentDB."
          action={{
            label: 'Search "Dynamic Programming"',
            onClick: () => {
              setQuery('What is dynamic programming?');
            },
          }}
        />
      )}

      {/* ── Slide-Over Chunk Inspection Modal ─────────────────────────── */}
      {selectedChunk && (
        <div
          role="dialog"
          aria-label="Chunk Context Inspection"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
          onClick={() => setSelectedChunk(null)}
        >
          <div
            className="solid-panel"
            style={{
              maxWidth: '38rem',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>
                  CHUNK #{selectedChunk.id} • DISTANCE {selectedChunk.distance}
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--text-primary)' }}>
                  {selectedChunk.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedChunk(null)}
                aria-label="Close modal"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.75rem',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Cosine Distance</div>
                  <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{selectedChunk.distance}</div>
                </div>
                <div style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Page Number</div>
                  <div style={{ fontWeight: 600 }}>{selectedChunk.page_number ?? 'N/A (Plaintext)'}</div>
                </div>
                <div style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Document Index</div>
                  <div style={{ fontWeight: 600 }}>Chunk #{selectedChunk.chunk_index}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Full Chunk Text Content
                </div>
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.6,
                    maxHeight: '260px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {selectedChunk.text}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <Link
                  to="/app/chat"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.95rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-foreground)',
                    textDecoration: 'none',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                  }}
                >
                  Open in RAG Chat <ExternalLink size={13} />
                </Link>
                <Button variant="ghost" size="sm" onClick={() => setSelectedChunk(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
