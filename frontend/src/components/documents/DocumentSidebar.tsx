import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Check,
  AlertCircle,
  X,
  FileUp,
  Database,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getDocuments,
  deleteDocument,
  uploadDocument,
  insertDocument,
  seedDemoKnowledge,
  type DocListItem,
} from '../../api/client';

interface DocumentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentsChanged?: () => void;
}

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  isOpen,
  onClose,
  onDocumentsChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view');
  const [docs, setDocs] = useState<DocListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // File upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success?: string; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Raw text ingest state
  const [showRawText, setShowRawText] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textIngesting, setTextIngesting] = useState(false);

  const [expandedChunkId, setExpandedChunkId] = useState<number | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const data = await getDocuments();
      setDocs(data);
    } catch {
      // Quiet fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDocs();
    }
  }, [isOpen]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId === id) return;
    setDeletingId(id);
    try {
      await deleteDocument(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      onDocumentsChanged?.();
    } catch {
      // Quiet error
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await uploadDocument(file);
      setUploadResult({
        success: `Successfully ingested "${res.filename}" into ${res.chunks_created} chunks.`,
      });
      await fetchDocs();
      onDocumentsChanged?.();
      setActiveTab('view');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'File upload and chunking failed.';
      setUploadResult({ error: msg });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRawTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textTitle.trim() || !textContent.trim()) return;

    setTextIngesting(true);
    setUploadResult(null);
    try {
      const res = await insertDocument(textTitle.trim(), textContent.trim());
      setUploadResult({
        success: `Document "${textTitle}" indexed into ${res.chunks} chunks.`,
      });
      setTextTitle('');
      setTextContent('');
      setShowRawText(false);
      await fetchDocs();
      onDocumentsChanged?.();
      setActiveTab('view');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to ingest raw text.';
      setUploadResult({ error: msg });
    } finally {
      setTextIngesting(false);
    }
  };

  const handleSeedDemo = async () => {
    setLoading(true);
    try {
      await seedDemoKnowledge();
      await fetchDocs();
      onDocumentsChanged?.();
    } catch {
      // Quiet error
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      d.preview.toLowerCase().includes(filterQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <aside
      style={{
        width: '340px',
        maxWidth: '100vw',
        height: '100%',
        backgroundColor: '#0a0a0a',
        borderLeft: '1px solid #262626',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 35,
        color: '#ffffff',
        flexShrink: 0,
        position: 'relative',
      }}
      aria-label="Custom Documents Sidebar"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #262626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} color="#ffffff" />
          <span style={{ fontWeight: 600, fontSize: '0.9375rem', letterSpacing: '-0.01em' }}>
            Knowledge & Docs
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '0.15rem 0.45rem',
              borderRadius: '9999px',
              backgroundColor: '#1f1f1f',
              border: '1px solid #333333',
              color: '#d4d4d4',
              fontWeight: 500,
            }}
          >
            {docs.length}
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#737373',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            borderRadius: '4px',
          }}
          aria-label="Close sidebar"
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#737373')}
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Sub Navigation Tabs ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #262626',
          backgroundColor: '#000000',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('view')}
          style={{
            flex: 1,
            padding: '0.65rem 0.5rem',
            fontSize: '0.8125rem',
            fontWeight: activeTab === 'view' ? 600 : 400,
            color: activeTab === 'view' ? '#ffffff' : '#737373',
            border: 'none',
            borderBottom: activeTab === 'view' ? '2px solid #ffffff' : '2px solid transparent',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
        >
          <Database size={14} />
          Current Docs ({docs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('add')}
          style={{
            flex: 1,
            padding: '0.65rem 0.5rem',
            fontSize: '0.8125rem',
            fontWeight: activeTab === 'add' ? 600 : 400,
            color: activeTab === 'add' ? '#ffffff' : '#737373',
            border: 'none',
            borderBottom: activeTab === 'add' ? '2px solid #ffffff' : '2px solid transparent',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
        >
          <Plus size={14} />
          Add Documents
        </button>
      </div>

      {/* ── Status Notifications ────────────────────────────────────────── */}
      {uploadResult && (
        <div
          style={{
            margin: '0.75rem 1rem 0',
            padding: '0.65rem 0.85rem',
            borderRadius: '6px',
            backgroundColor: uploadResult.success ? '#171717' : '#261b1b',
            border: `1px solid ${uploadResult.success ? '#333333' : '#4d2626'}`,
            fontSize: '0.8125rem',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {uploadResult.success ? (
            <Check size={15} style={{ color: '#d4d4d4', flexShrink: 0 }} />
          ) : (
            <AlertCircle size={15} style={{ color: '#f5f5f5', flexShrink: 0 }} />
          )}
          <span style={{ flex: 1, wordBreak: 'break-word' }}>
            {uploadResult.success || uploadResult.error}
          </span>
          <button
            onClick={() => setUploadResult(null)}
            style={{ background: 'none', border: 'none', color: '#737373', cursor: 'pointer' }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Content Area ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {activeTab === 'add' ? (
          /* ── ADD DOCUMENTS VIEW ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.25rem' }}>
                Upload Custom Document
              </div>
              <p style={{ fontSize: '0.75rem', color: '#a3a3a3', margin: 0, lineHeight: 1.4 }}>
                Drop a PDF, DOCX, Markdown, or plain text file. The AI will chunk and embed it to ground answers.
              </p>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `1.5px dashed ${isDragging ? '#ffffff' : '#333333'}`,
                borderRadius: '8px',
                padding: '1.75rem 1rem',
                textAlign: 'center',
                backgroundColor: isDragging ? '#1a1a1a' : '#111111',
                cursor: uploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                disabled={uploading}
              />
              <FileUp
                size={28}
                style={{ margin: '0 auto 0.65rem auto', color: isDragging ? '#ffffff' : '#737373' }}
              />
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.25rem' }}>
                {uploading ? 'Processing & embedding...' : 'Click or drop file to upload'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#737373' }}>
                Supports PDF, DOCX, TXT, MD (up to 20MB)
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#262626' }} />
              <span style={{ fontSize: '0.7rem', color: '#737373', textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#262626' }} />
            </div>

            {/* Ingest Raw Text Section */}
            <div>
              <button
                type="button"
                onClick={() => setShowRawText(!showRawText)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #262626',
                  backgroundColor: '#121212',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <span>Paste raw text document</span>
                {showRawText ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {showRawText && (
                <form
                  onSubmit={handleRawTextSubmit}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    marginTop: '0.75rem',
                    padding: '0.85rem',
                    backgroundColor: '#141414',
                    borderRadius: '8px',
                    border: '1px solid #262626',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#a3a3a3', marginBottom: '0.25rem' }}>
                      Document Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Project Architecture Notes"
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.65rem',
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333333',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '0.8125rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#a3a3a3', marginBottom: '0.25rem' }}>
                      Document Content
                    </label>
                    <textarea
                      placeholder="Paste your custom document text here..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      required
                      rows={5}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.65rem',
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333333',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '0.8125rem',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={textIngesting}
                    style={{
                      padding: '0.55rem',
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-foreground)',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: textIngesting ? 'not-allowed' : 'pointer',
                      opacity: textIngesting ? 0.7 : 1,
                    }}
                  >
                    {textIngesting ? 'Ingesting & Chunking...' : 'Ingest Document'}
                  </button>
                </form>
              )}
            </div>

            {/* Quick Demo Seed */}
            {docs.length === 0 && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: '#121212',
                  border: '1px solid #262626',
                  textAlign: 'center',
                }}
              >
                <Sparkles size={20} style={{ color: '#ffffff', margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.25rem' }}>
                  Need sample knowledge?
                </div>
                <p style={{ fontSize: '0.725rem', color: '#a3a3a3', margin: '0 0 0.75rem 0' }}>
                  Load 20 canonical computer science documents into DocumentDB to test search and chat immediately.
                </p>
                <button
                  type="button"
                  onClick={handleSeedDemo}
                  disabled={loading}
                  style={{
                    padding: '0.45rem 0.85rem',
                    backgroundColor: '#1f1f1f',
                    color: '#ffffff',
                    border: '1px solid #333333',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Seed Demo Knowledge
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── VIEW DOCUMENTS LIST ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Search filter bar */}
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.65rem',
                  borderRadius: '6px',
                  backgroundColor: '#141414',
                  border: '1px solid #262626',
                }}
              >
                <Search size={14} color="#737373" />
                <input
                  type="text"
                  placeholder="Filter documents..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    outline: 'none',
                    width: '100%',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={fetchDocs}
                title="Refresh documents"
                style={{
                  padding: '0.45rem',
                  borderRadius: '6px',
                  backgroundColor: '#141414',
                  border: '1px solid #262626',
                  color: '#737373',
                  cursor: 'pointer',
                  display: 'flex',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#737373')}
              >
                <RefreshCw size={14} className={loading ? 'spinner' : ''} />
              </button>
            </div>

            {/* List */}
            {filteredDocs.length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#737373',
                }}
              >
                <Database size={28} />
                <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#d4d4d4' }}>
                  No documents found
                </div>
                <p style={{ fontSize: '0.75rem', margin: 0 }}>
                  Upload documents from the "Add Documents" tab so the AI can reference them.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('add')}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.45rem 0.85rem',
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-foreground)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Upload First Document
                </button>
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isExpanded = expandedChunkId === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setExpandedChunkId(isExpanded ? null : doc.id)}
                    style={{
                      padding: '0.75rem 0.85rem',
                      borderRadius: '8px',
                      backgroundColor: '#121212',
                      border: '1px solid #262626',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#404040')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#262626')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.title}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(doc.id, e)}
                        title="Delete chunk"
                        disabled={deletingId === doc.id}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#737373',
                          cursor: 'pointer',
                          padding: '0.15rem',
                          display: 'flex',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#737373')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#a3a3a3', lineHeight: 1.4 }}>
                      {isExpanded ? doc.preview : `${doc.preview.slice(0, 95)}...`}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.2rem', fontSize: '0.6875rem', color: '#737373' }}>
                      <span>{doc.words} words</span>
                      <span>•</span>
                      <span>Chunk #{doc.chunk_index ?? 0}</span>
                      {doc.page_number && (
                        <>
                          <span>•</span>
                          <span>Page {doc.page_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
