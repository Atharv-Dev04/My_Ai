import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Trash2,
  RefreshCw,
  Upload,
  AlertTriangle,
  ArrowUpDown,
  X,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getDocuments,
  deleteDocument,
  seedDemoKnowledge,
  type DocListItem,
} from '../api/client';
import { Skeleton } from '../components/common/Skeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';

type SortField = 'id' | 'title' | 'words';
type SortOrder = 'asc' | 'desc';
type FormatFilter = 'ALL' | 'PDF' | 'DOCX' | 'TXT' | 'MD';

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Selected document for preview drawer
  const [selectedDoc, setSelectedDoc] = useState<DocListItem | null>(null);

  // Deletion modal state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Seeding demo knowledge state
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

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

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    setError(null);
    setSeedSuccess(null);
    try {
      const res = await seedDemoKnowledge();
      setSeedSuccess(`Indexed ${res.chunks} demo knowledge chunks into DocumentDB!`);
      await fetchDocs();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to seed demo knowledge');
    } finally {
      setIsSeeding(false);
    }
  };

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

  // Helper to detect document format from title
  const getDocFormat = (title: string): FormatFilter => {
    const lower = title.toLowerCase();
    if (lower.endsWith('.pdf')) return 'PDF';
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'DOCX';
    if (lower.endsWith('.txt')) return 'TXT';
    if (lower.endsWith('.md')) return 'MD';
    return 'TXT';
  };

  // Filtering by search query & format
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.preview.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (formatFilter === 'ALL') return true;
      return getDocFormat(doc.title) === formatFilter;
    });
  }, [documents, searchQuery, formatFilter]);

  // Sorting
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

  // Pagination
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', position: 'relative' }}>
      {/* ── Page Header & Actions ───────────────────────────────────────── */}
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
              fontSize: '1.65rem',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)',
              margin: '0 0 0.25rem 0',
            }}
          >
            Document Library
          </h1>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Manage and inspect indexed knowledge chunks stored in DocumentDB.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={fetchDocs}
            disabled={loading}
            aria-label="Refresh library"
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
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleSeedDemo}
            disabled={isSeeding || loading}
            aria-label="Seed canonical demo knowledge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--accent)',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              cursor: isSeeding ? 'not-allowed' : 'pointer',
            }}
          >
            <Sparkles size={13} style={{ animation: isSeeding ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isSeeding ? 'Seeding...' : 'Seed Demo Knowledge'}</span>
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
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Upload size={14} />
            <span>+ Upload</span>
          </Link>
        </div>
      </div>

      {/* ── Demo Seed Success Notification ─────────────────────────────── */}
      {seedSuccess && (
        <div
          className="solid-panel"
          style={{
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.65rem',
            fontSize: 'var(--text-sm)',
            color: 'var(--success)',
            borderColor: 'rgba(45, 212, 191, 0.25)',
            backgroundColor: 'var(--success-bg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={16} />
            <span>{seedSuccess}</span>
          </div>
          <button
            onClick={() => setSeedSuccess(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Search & Filter Pills Bar (Reference Spec) ────────────────── */}
      <div
        className="solid-panel"
        style={{
          padding: '0.85rem 1rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface-solid)',
        }}
      >
        {/* Search Bar */}
        <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '380px' }}>
          <Search
            size={14}
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
            placeholder="Search documents or content..."
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem 0.45rem 2.25rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
            }}
          />
        </div>

        {/* Format Filter Pills (Reference Board: All, PDF, DOCX, TXT, MD) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {(['ALL', 'PDF', 'DOCX', 'TXT', 'MD'] as FormatFilter[]).map((fmt) => {
            const active = formatFilter === fmt;
            return (
              <button
                key={fmt}
                onClick={() => {
                  setFormatFilter(fmt);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: 'var(--radius-pill)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  backgroundColor: active ? 'var(--accent-light)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {fmt}
              </button>
            );
          })}
        </div>

        {/* Counter */}
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Showing {sortedDocs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
          {Math.min(currentPage * pageSize, sortedDocs.length)} of {sortedDocs.length} chunks
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
          description="No document chunks are currently indexed in DocumentDB. Upload your first text document or seed demo data."
          action={{
            label: 'Ingest Document',
            onClick: () => navigate('/app/upload'),
          }}
        />
      ) : sortedDocs.length === 0 ? (
        <EmptyState
          title="No Matching Documents Found"
          description={`No document titles or chunk contents match filter "${searchQuery}".`}
          action={{
            label: 'Clear Filter',
            onClick: () => {
              setSearchQuery('');
              setFormatFilter('ALL');
            },
          }}
        />
      ) : (
        /* Compact Dark Document Rows (Matching Reference Board) */
        <div className="solid-panel" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'var(--bg-surface-solid)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: 'var(--text-sm)',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    color: 'var(--text-muted)',
                    fontSize: 'var(--text-xs)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th
                    onClick={() => toggleSort('id')}
                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none', width: '80px' }}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>ID</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('title')}
                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>Document Title</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th style={{ padding: '0.75rem 1rem' }}>Preview Snippet</th>
                  <th
                    onClick={() => toggleSort('words')}
                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none', width: '130px' }}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>Word Count</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDocs.map((doc) => {
                  const isSelected = selectedDoc?.id === doc.id;
                  const format = getDocFormat(doc.title);
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color var(--transition-fast)',
                      }}
                    >
                      {/* ID */}
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>
                        #{doc.id}
                      </td>

                      {/* Title & Format Icon */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div
                            style={{
                              padding: '0.35rem',
                              borderRadius: 'var(--radius-xs)',
                              backgroundColor: format === 'PDF' ? 'rgba(251, 113, 133, 0.12)' : 'var(--accent-light)',
                              color: format === 'PDF' ? 'var(--error)' : 'var(--accent)',
                              display: 'flex',
                              flexShrink: 0,
                            }}
                          >
                            <FileText size={15} />
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                            {doc.title}
                          </span>
                        </div>
                      </td>

                      {/* Preview Snippet */}
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', maxWidth: '32rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.preview}
                      </td>

                      {/* Word Count */}
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                        <Badge variant="neutral" size="sm">
                          {doc.words} words
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td
                        style={{ padding: '0.75rem 1rem', textAlign: 'right' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <button
                            onClick={() => setSelectedDoc(doc)}
                            aria-label={`Preview chunk ${doc.id}`}
                            title="Preview chunk details"
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-xs)',
                              color: 'var(--text-secondary)',
                              padding: '0.35rem',
                              cursor: 'pointer',
                              display: 'flex',
                            }}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => setDeletingId(doc.id)}
                            aria-label={`Delete chunk ${doc.id}`}
                            title="Delete chunk from DocumentDB"
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-xs)',
                              color: 'var(--error)',
                              padding: '0.35rem',
                              cursor: 'pointer',
                              display: 'flex',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div
            style={{
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-elevated)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
            }}
          >
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface-solid)',
                  color: 'var(--text-primary)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface-solid)',
                  color: 'var(--text-primary)',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                }}
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document Details Preview Drawer ───────────────────────────── */}
      {selectedDoc && (
        <div
          className="solid-panel"
          style={{
            position: 'fixed',
            right: '1.5rem',
            bottom: '1.5rem',
            width: '420px',
            maxWidth: 'calc(100vw - 3rem)',
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'var(--bg-surface-solid)',
            zIndex: 40,
            border: '1px solid var(--border-strong)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="var(--accent)" />
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                Chunk #{selectedDoc.id} Preview
              </h3>
            </div>
            <button
              onClick={() => setSelectedDoc(null)}
              aria-label="Close preview"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Document Source</span>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                {selectedDoc.title}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Word Count</span>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                  {selectedDoc.words} words
                </div>
              </div>
              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Detected Format</span>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--accent)' }}>
                  {getDocFormat(selectedDoc.title)}
                </div>
              </div>
            </div>

            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Indexed Content Snippet</span>
              <div
                style={{
                  marginTop: '0.35rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {selectedDoc.preview}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ────────────────────────────────── */}
      {deletingId !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
              padding: '1.75rem',
              maxWidth: '28rem',
              width: '100%',
              backgroundColor: 'var(--bg-surface-solid)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)', marginBottom: '0.75rem' }}>
              <AlertTriangle size={20} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                Delete Document Chunk #{deletingId}?
              </h3>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              This chunk will be removed immediately from DocumentDB. This action cannot be undone.
            </p>
            {deleteError && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--error)', marginBottom: '1rem' }}>
                {deleteError}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={isDeleting}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: 'var(--error)',
                  color: '#ffffff',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
