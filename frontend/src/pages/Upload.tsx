import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Search,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { uploadDocument, type FileIngestResponse } from '../api/client';
import { Button } from '../components/common/Button';

interface UploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  result?: FileIngestResponse;
  error?: string;
}

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.markdown'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

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

    const newItems: UploadItem[] = Array.from(files).map((file) => {
      const error = validateFile(file);
      return {
        id: Math.random().toString(36).substring(2, 9),
        file,
        status: error ? 'error' : 'pending',
        progress: 0,
        error: error || undefined,
      };
    });

    setItems((prev) => [...prev, ...newItems]);
  };

  const processUpload = async (item: UploadItem) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading', progress: 30 } : i))
    );

    try {
      // Step: file transmission & indexing
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
                error: (err as Error).message || 'Failed to ingest file',
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

  const handleClear = () => {
    setItems([]);
  };

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const successCount = items.filter((i) => i.status === 'success').length;
  const errorCount = items.filter((i) => i.status === 'error').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '54rem' }}>
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
          Document Ingestion & Upload
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Upload PDF, Word (DOCX), plain text (TXT), or Markdown files for chunking, Ollama vector embedding, and indexing.
        </p>
      </div>

      {/* ── Drag & Drop Zone ─────────────────────────────────────────── */}
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
        className="glass-panel"
        style={{
          padding: '3rem 2rem',
          border: `2px dashed ${isDragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
          backgroundColor: isDragOver ? 'var(--accent-light)' : 'var(--bg-surface)',
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
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-surface-hover)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <UploadCloud size={28} />
        </div>

        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
            Drag and drop files here, or click to browse
          </h3>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Supports PDF, DOCX, TXT, and Markdown (Max 25 MB per document)
          </p>
        </div>
      </div>

      {/* ── Limitations & Architecture Notice ─────────────────────────── */}
      <div
        className="glass-panel"
        style={{
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem',
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <Info size={16} color="var(--accent)" style={{ marginTop: '0.15rem' }} />
        <div>
          <strong>Document Pipeline Details: </strong> Extracted text is split using word boundaries (250 words with 30 word overlap). For PDFs, physical 1-indexed page boundaries are preserved. Full embedding generation runs through local Ollama before insertion into DocumentDB.
        </div>
      </div>

      {/* ── File Queue List & Actions ─────────────────────────────────── */}
      {items.length > 0 && (
        <div className="solid-panel" style={{ padding: '1.5rem' }}>
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
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                Upload Queue ({items.length} files)
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {successCount} indexed • {pendingCount} pending • {errorCount} errors
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Clear Queue
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
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <FileText size={18} color="var(--accent)" />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.file.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {(item.file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  <div>
                    {item.status === 'pending' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => processUpload(item)}
                      >
                        Ingest File
                      </Button>
                    )}
                    {item.status === 'uploading' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: 'var(--accent)' }}>
                        <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Extracting & Embedding...</span>
                      </div>
                    )}
                    {item.status === 'success' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 600 }}>
                        <CheckCircle2 size={16} />
                        <span>Indexed Successfully</span>
                      </div>
                    )}
                    {item.status === 'error' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: 'var(--error)' }}>
                          <AlertCircle size={15} />
                          <span>Failed</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => processUpload(item)}
                        >
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Measurable Progress Bar */}
                {item.status === 'uploading' && (
                  <div
                    style={{
                      width: '100%',
                      height: '4px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--border-subtle)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${item.progress}%`,
                        height: '100%',
                        backgroundColor: 'var(--accent)',
                        transition: 'width 300ms ease',
                      }}
                    />
                  </div>
                )}

                {/* Error message */}
                {item.status === 'error' && item.error && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '0.2rem' }}>
                    {item.error}
                  </div>
                )}

                {/* Completion summary details */}
                {item.status === 'success' && item.result && (
                  <div
                    style={{
                      marginTop: '0.35rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-surface)',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      alignItems: 'center',
                    }}
                  >
                    <span><strong>Chunks:</strong> {item.result.chunks_created} created</span>
                    <span><strong>Dimensions:</strong> {item.result.dims}-D float32</span>
                    {item.result.pages_detected !== null && (
                      <span><strong>Pages:</strong> {item.result.pages_detected} detected</span>
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
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <Link
                to="/app/documents"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Inspect in Document Library <ArrowRight size={14} />
              </Link>
              <Link
                to="/app/search"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                <Search size={14} /> Run Vector Search
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
