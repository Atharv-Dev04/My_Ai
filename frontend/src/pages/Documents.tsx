import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Trash2,
  RefreshCw,
  Upload,
  AlertTriangle,
  ArrowUpDown,
  X,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getDocuments,
  deleteDocument,
  type DocListItem,
} from '../api/client';
import { Skeleton } from '../components/common/Skeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';

type SortField = 'id' | 'title' | 'words';
type SortOrder = 'asc' | 'desc';

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Selected document for details drawer / preview
  const [selectedDoc, setSelectedDoc] = useState<DocListItem | null>(null);

  // Destructive delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch document library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    getDocuments()
      .then((data) => {
        if (mounted) {
          setDocuments(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError((err as Error).message || 'Failed to fetch document library');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
      setDeletingId(null);
    } catch (err: unknown) {
      setDeleteError((err as Error).message || 'Failed to delete chunk');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter & Sort
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const q = searchQuery.toLowerCase();
      return doc.title.toLowerCase().includes(q) || doc.preview.toLowerCase().includes(q);
    });
  }, [documents, searchQuery]);

  const sortedDocs = useMemo(() => {
    return [...filteredDocs].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'id') {
        comparison = a.id - b.id;
      } else if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortField === 'words') {
        comparison = a.words - b.words;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredDocs, sortField, sortOrder]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(sortedDocs.length / pageSize));
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDocs.slice(start, start + pageSize);
  }, [sortedDocs, currentPage, pageSize]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', position: 'relative' }}>
      {/* ── Page Header & Top Controls ────────────────────────────────── */}
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
            Knowledge Documents
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Inspect, search, and manage document chunks stored in DocumentDB.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={fetchDocs}
            disabled={loading}
            aria-label="Refresh documents"
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
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>

          <Link
            to="/app/upload"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-foreground)',
              padding: '0.45rem 0.95rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Upload size={14} /> Ingest Document
          </Link>
        </div>
      </div>

      {/* ── Honest Backend Contract Notice ────────────────────────────── */}
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
          <strong>Backend Contract: </strong> Documents are stored as semantic chunks (<code>GET /documents</code>, <code>DELETE /documents/{'{id}'}</code>). Document renaming and file re-processing are not exposed on the C++ port or FastAPI REST router and will be added with PostgreSQL document persistence.
        </span>
      </div>

      {/* ── Search Bar & Filter Controls ──────────────────────────────── */}
      <div className="solid-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '420px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by title or preview text..."
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem 0.45rem 2.25rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <span>
            Showing {sortedDocs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, sortedDocs.length)} of {sortedDocs.length} chunks
          </span>
        </div>
      </div>

      {/* ── Content View / Error / Empty States ───────────────────────── */}
      {error ? (
        <div style={{ maxWidth: '36rem', margin: '1.5rem auto' }}>
          <ErrorState
            title="Failed to Load Document Library"
            message={error}
            onRetry={fetchDocs}
          />
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Skeleton height="3.5rem" />
          <Skeleton height="3.5rem" />
          <Skeleton height="3.5rem" />
          <Skeleton height="3.5rem" />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          title="Document Library is Empty"
          description="No document chunks are currently indexed in DocumentDB. Upload your first text document to start semantic retrieval."
          action={{
            label: 'Ingest Document',
            onClick: () => {
              window.location.href = '/app/upload';
            },
          }}
        />
      ) : sortedDocs.length === 0 ? (
        <EmptyState
          title="No Matching Chunks Found"
          description={`No document titles or chunk contents match "${searchQuery}".`}
          action={{
            label: 'Clear Search Filter',
            onClick: () => setSearchQuery(''),
          }}
        />
      ) : (
        <div className="solid-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.85rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <th
                    onClick={() => toggleSort('id')}
                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>Chunk ID</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('title')}
                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>Title / Source</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ padding: '0.75rem 1rem' }}>Preview Content</th>
                  <th
                    onClick={() => toggleSort('words')}
                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>Word Count</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: selectedDoc?.id === doc.id ? 'var(--accent-light)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>
                      #{doc.id}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {doc.title}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', maxWidth: '28rem' }}>
                      {doc.preview}...
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                      {doc.words} words
                    </td>
                    <td
                      style={{ padding: '0.75rem 1rem', textAlign: 'right' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setDeletingId(doc.id)}
                        aria-label={`Delete chunk ${doc.id}`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0.35rem',
                          borderRadius: 'var(--radius-sm)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          transition: 'color var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--error)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Slide-Over Document Details Drawer ────────────────────────── */}
      {selectedDoc && (
        <div
          role="dialog"
          aria-label="Document Chunk Details"
          className="solid-panel"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            width: 'clamp(320px, 90vw, 480px)',
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 60,
            border: '1px solid var(--border-strong)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>
                CHUNK ID #{selectedDoc.id}
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--text-primary)' }}>
                {selectedDoc.title}
              </h3>
            </div>
            <button
              onClick={() => setSelectedDoc(null)}
              aria-label="Close details drawer"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.25rem',
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Word Count</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{selectedDoc.words} words</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Text Preview (Safe Plaintext)</div>
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  maxHeight: '160px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'inherit',
                }}
              >
                {selectedDoc.preview}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeletingId(selectedDoc.id)}
              >
                <Trash2 size={14} /> Delete Chunk
              </Button>
              <Link
                to="/app/chat"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontSize: '0.8125rem',
                }}
              >
                Ask Questions with Context <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal for Destructive Delete ─────────────────── */}
      {deletingId !== null && (
        <div
          role="alertdialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="solid-panel"
            style={{
              maxWidth: '28rem',
              width: '100%',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)', marginBottom: '0.75rem' }}>
              <AlertTriangle size={20} />
              <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>
                Delete Document Chunk #{deletingId}?
              </h4>
            </div>

            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              This will remove chunk #{deletingId} from both the DocumentDB text store and the underlying HNSW vector graph index. This action is irreversible.
            </p>

            {deleteError && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--error-bg)',
                  color: 'var(--error)',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button
                variant="ghost"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeletingId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isDeleting}
                onClick={() => handleDelete(deletingId)}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
