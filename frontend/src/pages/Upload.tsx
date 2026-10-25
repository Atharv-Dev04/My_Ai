import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  ArrowRight,
  Search,
  RefreshCw,
  Info,
  X,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { uploadDocument, type FileIngestResponse } from '../api/client';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

interface UploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  result?: FileIngestResponse;
  error?: string;
}

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.markdown'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB real backend limit

export const UploadPage: React.FC = () => {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return `Unsupported file format. Please upload PDF, DOCX, TXT, or Markdown.`;
    }
    if (file.size === 0) {
      return `File is empty (0 bytes).`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File exceeds maximum upload size of 25 MB.`;
    }
    return null;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Prevent duplicate submissions of identical file names currently in the queue
    setItems((prev) => {
      const existingNames = new Set(prev.map((i) => i.file.name));
      const incoming: UploadItem[] = [];

      for (const file of Array.from(files)) {
        if (!existingNames.has(file.name)) {
          const error = validateFile(file);
          incoming.push({
            id: Math.random().toString(36).substring(2, 9),
            file,
            status: error ? 'error' : 'pending',
            progress: 0,
            error: error || undefined,
          });
          existingNames.add(file.name);
        }
      }
      return [...prev, ...incoming];
    });
  };

  const processUpload = async (item: UploadItem) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading', progress: 40 } : i))
    );

    try {
      const result = await uploadDocument(item.file);
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: 'success', progress: 100, result }
            : i
        )
      );
    } catch (err: unknown) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: 'error',
                progress: 0,
                error: (err as Error).message || 'Failed to ingest file into DocumentDB',
              }
            : i
        )
      );
    }
  };

  const handleStartAllPending = async () => {
    const pending = items.filter((i) => i.status === 'pending');
    for (const item of pending) {
      await processUpload(item);
    }
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClear = () => {
    setItems([]);
  };

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const successCount = items.filter((i) => i.status === 'success').length;
  const errorCount = items.filter((i) => i.status === 'error').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '58rem', margin: '0 auto', width: '100%' }}>
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div>
        <h1
          style={{
            fontSize: '1.65rem',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            marginBottom: '0.25rem',
            color: 'var(--text-primary)',
          }}
        >
          Document Ingestion & Upload
        </h1>
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Ingest multi-format files into DocumentDB with sliding-window chunking and Ollama vector embeddings.
        </p>
      </div>

      {/* ── Drag & Drop Zone (Matching Reference Elevation) ───────────── */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className="solid-panel"
        style={{
          padding: '3rem 2rem',
          border: `2px dashed ${isDragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
          backgroundColor: isDragOver ? 'var(--accent-light)' : 'var(--bg-surface-solid)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            fileInputRef.current?.click();
          }
        }}
        aria-label="Upload file dropzone. Click or drag files to upload."
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          multiple
          accept=".pdf,.docx,.txt,.md,.markdown"
          style={{ display: 'none' }}
        />

        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(56, 189, 248, 0.25)',
          }}
        >
          <UploadCloud size={26} />
        </div>

        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
            Drag & drop files here, or click to browse
          </h3>
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Supports PDF, Word (DOCX), plain text (TXT), and Markdown • Max 25 MB
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Badge variant="neutral" size="sm">PDF</Badge>
          <Badge variant="neutral" size="sm">DOCX</Badge>
          <Badge variant="neutral" size="sm">TXT</Badge>
          <Badge variant="neutral" size="sm">MD</Badge>
        </div>
      </div>

      {/* ── Real Backend Constraints & Stage Notice ───────────────────── */}
      <div
        className="solid-panel"
        style={{
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          backgroundColor: 'var(--bg-surface-solid)',
        }}
      >
        <Info size={16} color="var(--accent)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
        <div>
          <strong>Ingestion Pipeline Stages: </strong>
          The backend performs text extraction, word sliding-window chunking (250 words with 30 word overlap), 768-D vector embedding via local Ollama (<code>nomic-embed-text</code>), and persistent registration in DocumentDB in a unified transaction.
        </div>
      </div>

      {/* ── Selected File Queue List & Actions ────────────────────────── */}
      {items.length > 0 && (
        <div className="solid-panel" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-surface-solid)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                Selected Files Queue ({items.length})
              </h3>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {successCount} indexed • {pendingCount} pending • {errorCount} errors
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Clear All
              </Button>
              {pendingCount > 0 && (
                <Button variant="primary" size="sm" onClick={handleStartAllPending}>
                  Start Ingestion ({pendingCount})
                </Button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '0.9rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
                    <div
                      style={{
                        padding: '0.4rem',
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
                        {item.file.name}
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {(item.file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {item.status === 'pending' && (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => processUpload(item)}
                      >
                        Ingest File
                      </Button>
                    )}
                    {item.status === 'uploading' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--text-xs)', color: 'var(--accent)' }}>
                        <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Chunking & Embedding...</span>
                      </div>
                    )}
                    {item.status === 'success' && (
                      <Badge variant="teal" size="sm" dot>
                        Indexed
                      </Badge>
                    )}
                    {item.status === 'error' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Badge variant="rose" size="sm">
                          Failed
                        </Badge>
                        <button
                          onClick={() => processUpload(item)}
                          title="Retry ingestion"
                          aria-label="Retry ingestion"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--accent)',
                            cursor: 'pointer',
                            display: 'flex',
                            padding: '0.2rem',
                          }}
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => handleRemove(item.id)}
                      title="Remove file from queue"
                      aria-label="Remove file from queue"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        padding: '0.2rem',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                {item.status === 'uploading' && (
                  <div
                    style={{
                      width: '100%',
                      height: '3px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--border-subtle)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${item.progress}%`,
                        height: '100%',
                        backgroundColor: 'var(--accent)',
                        transition: 'width 250ms ease',
                      }}
                    />
                  </div>
                )}

                {/* Error reason */}
                {item.status === 'error' && item.error && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--error)' }}>
                    {item.error}
                  </div>
                )}

                {/* Completion telemetry summary */}
                {item.status === 'success' && item.result && (
                  <div
                    style={{
                      padding: '0.4rem 0.65rem',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-surface-solid)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.85rem',
                      alignItems: 'center',
                    }}
                  >
                    <span><strong>Chunks:</strong> {item.result.chunks_created} created</span>
                    <span><strong>Vector Dims:</strong> {item.result.dims}-D float32</span>
                    {item.result.pages_detected !== null && (
                      <span><strong>Pages:</strong> {item.result.pages_detected}</span>
                    )}
                    <span><strong>Chunk IDs:</strong> #{item.result.chunk_ids.join(', #')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick links upon completion */}
          {successCount > 0 && (
            <div
              style={{
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: '1.25rem',
                flexWrap: 'wrap',
              }}
            >
              <Link
                to="/app/documents"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                <FileCheck size={15} />
                <span>Inspect in Document Library</span>
                <ArrowRight size={13} />
              </Link>
              <Link
                to="/app/search"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                <Search size={14} />
                <span>Test in Semantic Search</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
