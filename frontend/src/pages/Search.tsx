import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Clock,
  ArrowRight,
  ExternalLink,
  Info,
  CheckCircle2,
  X,
  FileText,
  FileCode,
  File,
  Layers,
  Filter,
  Sparkles,
  BookOpen,
  Copy,
  Check,
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
import { Badge } from '../components/common/Badge';

type FormatFilter = 'ALL' | 'PDF' | 'DOCX' | 'TXT' | 'MD';

export const SearchPage: React.FC = () => {
  const { preferences } = usePreferences();

  // Search parameters
  const [query, setQuery] = useState<string>('');
  const [topK, setTopK] = useState<number>(preferences.defaultTopK || 5);
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('ALL');

  // Search state & results
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<DocSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Selected chunk for detailed inspection modal
  const [selectedChunk, setSelectedChunk] = useState<ContextChunk | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Cancellation ref for in-flight search requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keyboard navigation & Esc shortcut to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedChunk) {
        setSelectedChunk(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedChunk]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    // Abort previous in-flight request if user submits again
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await searchDocuments(cleanQuery, topK);
      setResponse(res);
    } catch (err: unknown) {
      const message = (err as Error).message || 'Semantic search failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  const handleClear = () => {
    handleCancel();
    setQuery('');
    setResponse(null);
    setError(null);
    setHasSearched(false);
  };

  const handleCopySnippet = (chunk: ContextChunk, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(chunk.text);
    setCopiedId(chunk.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to detect document format from title
  const getDocFormat = (title: string): FormatFilter => {
    const lower = title.toLowerCase();
    if (lower.endsWith('.pdf')) return 'PDF';
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'DOCX';
    if (lower.endsWith('.txt')) return 'TXT';
    if (lower.endsWith('.md')) return 'MD';
    return 'TXT';
  };

  const getFormatIcon = (format: FormatFilter) => {
    switch (format) {
      case 'PDF':
        return <FileText size={16} color="var(--rose)" />;
      case 'DOCX':
        return <FileText size={16} color="var(--accent)" />;
      case 'MD':
        return <FileCode size={16} color="var(--teal)" />;
      case 'TXT':
      default:
        return <File size={16} color="var(--amber)" />;
    }
  };

  // Filtered results based on client-side format filter
  const filteredContexts = useMemo(() => {
    if (!response || !response.contexts) return [];
    if (formatFilter === 'ALL') return response.contexts;
    return response.contexts.filter((c) => getDocFormat(c.title) === formatFilter);
  }, [response, formatFilter]);

  // Extract real search query terms for subtle highlight preview
  const searchTerms = useMemo(() => {
    return query
      .toLowerCase()
      .split(/\s+/)
      .map((term) => term.replace(/[^a-z0-9]/g, ''))
      .filter((term) => term.length > 2);
  }, [query]);

  // Snippet highlighter
  const renderHighlightedSnippet = (text: string) => {
    if (!searchTerms.length) {
      return text;
    }
    // Build a regex matching any of the search terms
    const regex = new RegExp(`(${searchTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => {
      const isMatch = searchTerms.includes(part.toLowerCase());
      return isMatch ? (
        <mark
          key={i}
          style={{
            backgroundColor: 'rgba(56, 189, 248, 0.22)',
            color: 'var(--text-primary)',
            padding: '0.1rem 0.25rem',
            borderRadius: '2px',
            fontWeight: 600,
          }}
        >
          {part}
        </mark>
      ) : (
        part
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '64rem', margin: '0 auto', width: '100%' }}>
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
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
              <Sparkles size={12} />
              VectorMind Retrieval Engine
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
            Semantic Knowledge Search
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Vector similarity retrieval over your DocumentDB index using local Ollama embeddings and exact cosine metric.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link to="/app/chat">
            <Button variant="ghost" size="sm" rightIcon={<ExternalLink size={14} />}>
              Open RAG Chat
            </Button>
          </Link>
          <Link to="/app/upload">
            <Button variant="outline" size="sm" leftIcon={<BookOpen size={14} />}>
              Document Library
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Prominent Search Query Bar & API Controls ─────────────────── */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Main Prominent Input Field */}
          <div style={{ position: 'relative' }}>
            <Search
              size={20}
              style={{
                position: 'absolute',
                left: '1.15rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: query ? 'var(--accent)' : 'var(--text-muted)',
                pointerEvents: 'none',
                transition: 'color var(--transition-fast)',
              }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter a natural language question or concept (e.g., 'What is dynamic programming?')..."
              style={{
                width: '100%',
                padding: '0.875rem 5.5rem 0.875rem 3.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.25)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
              autoFocus
            />

            {/* Clear Button */}
            {query && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search input"
                title="Clear query"
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Controls Bar: Top-K, Index Meta, Submit/Cancel Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              paddingTop: '0.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              {/* Top-K Selector (mapped directly to API parameter k) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <SlidersHorizontal size={14} color="var(--accent)" />
                <label htmlFor="topk-select" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Top-K:
                </label>
                <select
                  id="topk-select"
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value, 10))}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value={1}>1 chunk</option>
                  <option value={3}>3 chunks</option>
                  <option value={5}>5 chunks (default)</option>
                  <option value={10}>10 chunks</option>
                  <option value={15}>15 chunks</option>
                </select>
              </div>

              {/* Format Filter (client-side refinement over retrieved set) */}
              {response && response.contexts.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                  <Filter size={14} color="var(--teal)" />
                  <label htmlFor="format-filter" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Format:
                  </label>
                  <select
                    id="format-filter"
                    value={formatFilter}
                    onChange={(e) => setFormatFilter(e.target.value as FormatFilter)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface-hover)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="ALL">All formats ({response.contexts.length})</option>
                    <option value="PDF">PDF only</option>
                    <option value="DOCX">DOCX only</option>
                    <option value="TXT">TXT only</option>
                    <option value="MD">Markdown only</option>
                  </select>
                </div>
              )}

              {/* Index Indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  borderLeft: '1px solid var(--border-subtle)',
                  paddingLeft: '1rem',
                }}
              >
                <span>Index:</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>DocumentDB / Cosine</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {loading && (
                <Button variant="ghost" size="md" onClick={handleCancel} type="button">
                  Cancel
                </Button>
              )}
              {response && !loading && (
                <Button variant="ghost" size="md" onClick={handleClear} type="button">
                  Clear
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={loading}
                disabled={!query.trim() || loading}
                rightIcon={!loading ? <ArrowRight size={15} /> : undefined}
              >
                Search Knowledge
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Scoring Metric Explanation Callout ─────────────────────────── */}
      <div
        className="glass-panel"
        style={{
          padding: '0.75rem 1.15rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
          backgroundColor: 'rgba(16, 29, 36, 0.45)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <Info size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Metric Note: </strong> DocumentDB evaluates cosine distance <code>d = 1.0 - cos_sim(u, v)</code>. Lower distance indicates closer semantic alignment (<code>0.0</code> is identical; <code>d ≤ 0.70</code> passes the retrieval gate).
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
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface-hover)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <span>
              Retrieved <strong>{response.contexts.length}</strong> candidate chunks
              {formatFilter !== 'ALL' && ` (${filteredContexts.length} shown for filter: ${formatFilter})`} for:{' '}
              <em style={{ color: 'var(--text-primary)' }}>"{response.query}"</em>
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={13} color="var(--accent)" /> {response.latency_ms} ms roundtrip
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Layers size={13} color="var(--teal)" /> {response.total_chunks_scanned} chunks scanned
            </span>
          </div>
        </div>
      )}

      {/* ── Main Content Area: Loading, Error, Empty, or Result Rows ──── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <Skeleton height="6.5rem" />
          <Skeleton height="6.5rem" />
          <Skeleton height="6.5rem" />
        </div>
      ) : error && error.toLowerCase().includes('no documents') ? (
        <EmptyState
          title="No Knowledge Indexed Yet"
          description="Your DocumentDB vector store is currently empty. Upload or seed documents to enable natural language semantic search."
          action={{
            label: 'Upload Knowledge Documents',
            onClick: () => {
              window.location.href = '/app/upload';
            },
          }}
        />
      ) : error ? (
        <div style={{ maxWidth: '38rem', margin: '1rem auto', width: '100%' }}>
          <ErrorState
            title="Semantic Search Failed"
            message={error}
            onRetry={handleSearch}
          />
        </div>
      ) : response && response.contexts.length === 0 ? (
        <EmptyState
          title={response.total_chunks_scanned === 0 ? 'No Knowledge Indexed Yet' : 'No Matching Candidates Found'}
          description={
            response.total_chunks_scanned === 0
              ? 'Your DocumentDB vector store contains 0 chunks. Upload or seed knowledge documents first.'
              : `No chunks met the cosine distance threshold (d <= 0.70) for "${response.query}". Try rephrasing your search or uploading additional documents.`
          }
          action={{
            label: 'Upload Knowledge Documents',
            onClick: () => {
              window.location.href = '/app/upload';
            },
          }}
        />
      ) : response && filteredContexts.length === 0 ? (
        <EmptyState
          title="No Chunks Match Filter"
          description={`Retrieved ${response.contexts.length} candidates, but none matched format filter '${formatFilter}'.`}
          action={{
            label: 'Reset Format Filter',
            onClick: () => setFormatFilter('ALL'),
          }}
        />
      ) : response ? (
        /* ── Compact Ranked Result Rows ───────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredContexts.map((ctx, idx) => {
            const format = getDocFormat(ctx.title);
            const similarityPercent = Math.max(0, Math.min(100, Math.round((1.0 - ctx.distance) * 100)));
            const isHighConfidence = ctx.distance < 0.35;
            const isModerate = ctx.distance < 0.6;

            return (
              <div
                key={ctx.id}
                onClick={() => setSelectedChunk(ctx)}
                className="solid-panel"
                style={{
                  padding: '1.15rem 1.35rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'border-color var(--transition-fast), background-color var(--transition-fast), transform var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                }}
                tabIndex={0}
                role="button"
                aria-label={`View ranked chunk ${idx + 1} from ${ctx.title}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedChunk(ctx);
                  }
                }}
              >
                {/* Header: Rank, Icon, Filename, Score Badges */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.65rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {/* Rank Indicator */}
                    <span
                      style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--accent-light)',
                        color: 'var(--accent)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                      }}
                    >
                      #{idx + 1}
                    </span>

                    {/* Format Icon */}
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      {getFormatIcon(format)}
                    </span>

                    {/* Document Title / Source */}
                    <h3
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        margin: 0,
                        color: 'var(--text-primary)',
                        maxWidth: '24rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={ctx.title}
                    >
                      {ctx.title}
                    </h3>
                  </div>

                  {/* Similarity & Distance Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Badge variant={isHighConfidence ? 'teal' : isModerate ? 'cyan' : 'amber'}>
                      {similarityPercent}% match
                    </Badge>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--bg-canvas)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                      }}
                      title="Exact Cosine Distance (0.0 = identical)"
                    >
                      d: {ctx.distance.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Snippet preview with matched term highlights */}
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.55,
                    margin: '0 0 0.75rem 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {renderHighlightedSnippet(ctx.text)}
                </p>

                {/* Footer metadata: ID, page/chunk index, quick actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '0.55rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                    <span>Chunk #{ctx.id}</span>
                    {ctx.page_number !== null && ctx.page_number !== undefined && (
                      <span style={{ color: 'var(--text-secondary)' }}>Page {ctx.page_number}</span>
                    )}
                    <span>Position #{ctx.chunk_index ?? 0}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <button
                      type="button"
                      onClick={(e) => handleCopySnippet(ctx, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: copiedId === ctx.id ? 'var(--success)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.2rem 0.4rem',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                      title="Copy chunk text"
                    >
                      {copiedId === ctx.id ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === ctx.id ? 'Copied' : 'Copy'}
                    </button>

                    <span
                      style={{
                        color: 'var(--accent)',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontFamily: 'inherit',
                      }}
                    >
                      Inspect <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : !hasSearched ? (
        /* First-run prompt before any query */
        <EmptyState
          title="Ready for Semantic Search"
          description="Type a question or keywords above. Your query will be transformed into an embedding vector via local Ollama models and compared against DocumentDB."
          action={{
            label: 'Try "What is dynamic programming?"',
            onClick: () => {
              setQuery('What is dynamic programming?');
            },
          }}
        />
      ) : null}

      {/* ── Slide-Over Chunk Inspection Modal ─────────────────────────── */}
      {selectedChunk && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Chunk Context Inspection"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
              maxWidth: '42rem',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '1.75rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  CHUNK #{selectedChunk.id} • DISTANCE {selectedChunk.distance}
                </div>
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    margin: '0.35rem 0 0 0',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                  }}
                >
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
                  padding: '0.35rem',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Metadata Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.75rem',
                  fontSize: '0.8rem',
                }}
              >
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    Cosine Distance
                  </div>
                  <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {selectedChunk.distance}
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    Similarity Score
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--accent)' }}>
                    {Math.max(0, Math.min(100, Math.round((1.0 - selectedChunk.distance) * 100)))}% match
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    Page Number
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedChunk.page_number ?? 'N/A (Plaintext)'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    Chunk Index
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    Position #{selectedChunk.chunk_index ?? 0}
                  </div>
                </div>
              </div>

              {/* Full Chunk Text */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.45rem',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Full Chunk Text Content
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleCopySnippet(selectedChunk, e)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedId === selectedChunk.id ? 'var(--success)' : 'var(--accent)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    {copiedId === selectedChunk.id ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === selectedChunk.id ? 'Copied to clipboard' : 'Copy chunk'}
                  </button>
                </div>
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.875rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.65,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {selectedChunk.text}
                </div>
              </div>

              {/* Modal Actions */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <Button variant="ghost" size="sm" onClick={() => setSelectedChunk(null)}>
                  Close
                </Button>
                <Link
                  to="/app/chat"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-foreground)',
                    textDecoration: 'none',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                  }}
                >
                  Query with RAG Chat <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
