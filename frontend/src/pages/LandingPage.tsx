import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  Search,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText,
  MessageSquare,
  Code2,
  Sun,
  Moon,
  Menu,
  X,
  Workflow,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { useTheme } from '../context/useTheme';
import { AuthModal } from '../components/auth/AuthModal';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* ── Public Top Navigation ─────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'var(--bg-surface)',
          backdropFilter: 'var(--backdrop-blur)',
          WebkitBackdropFilter: 'var(--backdrop-blur)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '0.85rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              style={{
                padding: '0.45rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent)',
                display: 'flex',
              }}
            >
              <Database size={22} />
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                VectorMind
              </span>
              <span
                style={{
                  marginLeft: '0.5rem',
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                  fontWeight: 600,
                }}
              >
                v0.1
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2rem',
            }}
            className="desktop-nav"
            aria-label="Public Site Navigation"
          >
            <a href="#architecture" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
              Architecture
            </a>
            <a href="#features" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
              Engine
            </a>
            <a href="#workflow" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
              Workflow
            </a>
            <a
              href="https://github.com/Atharv-Dev04/My_Ai"
              target="_blank"
              rel="noreferrer"
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Code2 size={16} /> GitHub
            </a>
          </nav>

          {/* Action CTAs & Theme Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={toggleTheme}
              aria-label="Toggle visual theme"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.45rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
              }}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button
              onClick={() => {
                setAuthModalMode('login');
                setAuthModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>

            <Link
              to="/app/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-foreground)',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                transition: 'background-color var(--transition-fast)',
              }}
            >
              Launch App <ArrowRight size={15} />
            </Link>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle navigation menu"
              className="mobile-toggle"
              style={{
                display: 'none',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                padding: '0.4rem',
                cursor: 'pointer',
              }}
            >
              {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileNavOpen && (
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <a
              href="#architecture"
              onClick={() => setMobileNavOpen(false)}
              style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '1rem', fontWeight: 500 }}
            >
              Architecture
            </a>
            <a
              href="#features"
              onClick={() => setMobileNavOpen(false)}
              style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '1rem', fontWeight: 500 }}
            >
              Engine
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileNavOpen(false)}
              style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '1rem', fontWeight: 500 }}
            >
              Workflow
            </a>
            <a
              href="https://github.com/Atharv-Dev04/My_Ai"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '1rem', fontWeight: 500 }}
            >
              GitHub Repository
            </a>
          </div>
        )}
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section
        style={{
          padding: '4.5rem 1.5rem 3.5rem',
          maxWidth: '1240px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ maxWidth: '48rem', margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.3rem 0.8rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
            }}
          >
            <Sparkles size={14} />
            <span>Private Local-First Knowledge Platform</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.1rem, 5vw, 3.4rem)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.15,
              color: 'var(--text-primary)',
              marginBottom: '1.25rem',
            }}
          >
            Semantic vector search and grounded local RAG.
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.15rem)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '2.25rem',
            }}
          >
            VectorMind pairs native Python vector algorithms (BruteForce, KD-Tree, and HNSW)
            with local Ollama embeddings and generation. Ingest your documents, index semantic representations,
            and query knowledge with complete data privacy.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <Link
              to="/app/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-foreground)',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
              }}
            >
              Open Application <ArrowRight size={16} />
            </Link>
            <Link
              to="/app/search"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
              }}
            >
              Inspect Vector Engine
            </Link>
          </div>
        </div>

        {/* ── Product Preview Based on Real Workspace UI ───────────────── */}
        <div style={{ marginTop: '3.5rem' }}>
          <div
            className="glass-panel"
            style={{
              padding: '1.5rem',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* Window control bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.7)' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.7)' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.7)' }} />
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  padding: '0.2rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                FastAPI :8000 /vectors/query • Ollama Local
              </div>
              <div style={{ width: '40px' }} />
            </div>

            {/* UI Mockup Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
              }}
            >
              {/* Document Ingestion & Chunk Preview */}
              <div className="solid-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <FileText size={16} color="var(--accent)" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Document Chunker</span>
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    lineHeight: 1.5,
                  }}
                >
                  chunk_id: "doc_01#chunk_0"<br />
                  tokens: 128 • overlap: 16<br />
                  embedding: float32[16] [0.124, -0.441, 0.089, ...]<br />
                  status: indexed in HNSW layer-0
                </div>
              </div>

              {/* Real Engine Comparison */}
              <div className="solid-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Cpu size={16} color="var(--accent)" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Vector Index Engine</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>BruteForce Search</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Exact distance (NumPy)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>KD-Tree</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Exact Euclidean partition</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>HNSW Graph</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}>Sub-millisecond traversal</span>
                  </div>
                </div>
              </div>

              {/* RAG Context Output */}
              <div className="solid-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <MessageSquare size={16} color="var(--accent)" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Ollama Grounded RAG</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Synthesizes retrieved source chunks into concise answers while preserving source citations.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3-Stage Core Explanation ─────────────────────────────────── */}
      <section
        id="architecture"
        style={{
          padding: '4rem 1.5rem',
          maxWidth: '1240px',
          margin: '0 auto',
          width: '100%',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '36rem', margin: '0 auto 3rem' }}>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            The Retrieval-Augmented Architecture
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            VectorMind integrates document ingestion, vector geometry, and local language models into an unbroken pipeline.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}
        >
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '1rem' }}>
              <FileText size={26} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.65rem' }}>
              1. Document Ingestion
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Raw files and texts are normalized and split into overlapping chunks via the character chunker.
              Metadata (source document, positions, timestamps) is preserved alongside chunk contents.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '1rem' }}>
              <Search size={26} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.65rem' }}>
              2. Semantic Retrieval
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Query vectors navigate the multi-layer HNSW graph or KD-Tree structures to identify top-k nearest
              neighbors by Euclidean, Manhattan, or Cosine distance metrics.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '1rem' }}>
              <Cpu size={26} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.65rem' }}>
              3. Grounded Generation
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Candidate chunks are assembled into structured context prompts passed directly to local Ollama models,
              ensuring verifiable, source-referenced answers without external telemetry.
            </p>
          </div>
        </div>
      </section>

      {/* ── Feature Grid ─────────────────────────────────────────────── */}
      <section
        id="features"
        style={{
          padding: '4rem 1.5rem',
          maxWidth: '1240px',
          margin: '0 auto',
          width: '100%',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Engine Capabilities & Benchmarks
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Migrated faithfully from C++ with mathematical precision verified across 279 automated test suites.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <div className="solid-panel" style={{ padding: '1.5rem' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>
              <Layers size={22} />
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>HNSW Graph Indexing</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Multi-layer proximity graphs with configurable entry points, ef_search beam widths, and M-link budgets.
            </p>
          </div>

          <div className="solid-panel" style={{ padding: '1.5rem' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>
              <Cpu size={22} />
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>KD-Tree Space Partition</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Iterative non-recursive KD-Tree search avoiding recursion depth exceptions while guaranteeing exact Euclidean boundaries.
            </p>
          </div>

          <div className="solid-panel" style={{ padding: '1.5rem' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>
              <ShieldCheck size={22} />
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>C++ Reference Parity</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              0 mismatch count in HNSW layer distributions, neighbor selections, and tie-break rankings against g++ compiles.
            </p>
          </div>

          <div className="solid-panel" style={{ padding: '1.5rem' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>
              <Terminal size={22} />
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>REST API & In-Memory DB</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              FastAPI async endpoints with OpenAPI documentation, CORS management, and thread-safe vector storage.
            </p>
          </div>
        </div>
      </section>

      {/* ── Workflow Steps ───────────────────────────────────────────── */}
      <section
        id="workflow"
        style={{
          padding: '4rem 1.5rem',
          maxWidth: '1240px',
          margin: '0 auto',
          width: '100%',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Workflow size={20} color="var(--accent)" />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Operational Workflow</h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.25rem' }}>STEP 01</div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>Ingest & Chunk</h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Load raw documents or markdown snippets. Text is partitioned into controlled segments for high-resolution indexing.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.25rem' }}>STEP 02</div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>Embed with Ollama</h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Generate embeddings locally using nomic-embed-text without third-party API exposure.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.25rem' }}>STEP 03</div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>Index & Benchmark</h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Insert vectors into BruteForce, KD-Tree, or HNSW structures and compare search speed in microseconds.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.25rem' }}>STEP 04</div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>Query with Context</h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Retrieve relevant context chunks and submit to llama3.2 for source-referenced generative synthesis.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer
        style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          padding: '2.5rem 1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <Database size={18} color="var(--accent)" />
              <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>VectorMind</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              AI knowledge and semantic search platform. Derivative of{' '}
              <a
                href="https://github.com/perryvegehan/Your-OWN-AI"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}
              >
                perryvegehan/Your-OWN-AI
              </a>
              . Licensed under MIT.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8125rem' }}>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
            >
              FastAPI Docs
            </a>
            <a
              href="https://github.com/Atharv-Dev04/My_Ai"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
            >
              GitHub
            </a>
            <Link to="/app/settings" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              System Preferences
            </Link>
          </div>
        </div>
      </footer>

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-toggle {
            display: flex !important;
          }
        }
      `}</style>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
      />
    </div>
  );
};
