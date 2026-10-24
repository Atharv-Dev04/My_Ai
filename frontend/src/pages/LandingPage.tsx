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
  Upload,
  Lock,
  Zap,
} from 'lucide-react';
import { useTheme } from '../context/useTheme';
import { AuthModal } from '../components/auth/AuthModal';
import { Badge } from '../components/common/Badge';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)' }}>
      {/* ── Public Top Navigation ─────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'var(--bg-surface-solid)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
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
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(56, 189, 248, 0.25)',
              }}
            >
              <Database size={18} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                VectorMind
              </span>
              <Badge variant="cyan" size="sm">
                v1.1
              </Badge>
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
            <a href="#overview" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
              Overview
            </a>
            <a href="#architecture" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
              Architecture
            </a>
            <a href="#engine" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
              Vector Engine
            </a>
            <a
              href="https://github.com/Atharv-Dev04/My_Ai"
              target="_blank"
              rel="noreferrer"
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Code2 size={15} /> GitHub
            </a>
          </nav>

          {/* Action CTAs & Theme Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.4rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
              }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
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
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>

            <Link
              to="/app"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-foreground)',
                padding: '0.45rem 0.95rem',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                transition: 'background-color var(--transition-fast)',
              }}
            >
              Open Workspace <ArrowRight size={14} />
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
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileNavOpen && (
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-solid)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <a
              href="#overview"
              onClick={() => setMobileNavOpen(false)}
              style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 'var(--text-base)', fontWeight: 500 }}
            >
              Overview
            </a>
            <a
              href="#architecture"
              onClick={() => setMobileNavOpen(false)}
              style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 'var(--text-base)', fontWeight: 500 }}
            >
              Architecture
            </a>
            <a
              href="#engine"
              onClick={() => setMobileNavOpen(false)}
              style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 'var(--text-base)', fontWeight: 500 }}
            >
              Vector Engine
            </a>
          </div>
        )}
      </header>

      {/* ── Hero Section (Dark Landscape / Document Visual Board) ─────────── */}
      <section
        id="overview"
        style={{
          padding: '4rem 1.5rem 3rem',
          maxWidth: '1280px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div
          className="elevated-panel"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 'var(--radius-xl)',
            padding: '3.5rem 2.5rem',
            border: '1px solid var(--border-strong)',
            background: 'linear-gradient(135deg, rgba(16, 29, 36, 0.95) 0%, rgba(7, 17, 22, 0.98) 100%)',
          }}
        >
          {/* Subtle Ambient Background Gradient Elements */}
          <div
            style={{
              position: 'absolute',
              top: '-20%',
              right: '-10%',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ maxWidth: '42rem', position: 'relative', zIndex: 1 }}>
            {/* Tagline */}
            <div
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--accent)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '1rem',
              }}
            >
              WELCOME TO VECTORMIND
            </div>

            {/* Editorial Headline */}
            <h1
              style={{
                fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
                fontWeight: 800,
                letterSpacing: '-0.035em',
                lineHeight: 1.1,
                color: 'var(--text-primary)',
                marginBottom: '1.25rem',
              }}
            >
              Turn Your Documents Into Answers
            </h1>

            {/* Concise Truthful Explanation */}
            <p
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.15rem)',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginBottom: '2rem',
              }}
            >
              Upload, search, and chat with your own knowledge using native Python vector algorithms (HNSW, KD-Tree, Brute Force) and local AI. Private, fast, and completely on-premises.
            </p>

            {/* Actions: Upload Documents & Start Chat */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Link
                to="/app/upload"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-foreground)',
                  padding: '0.7rem 1.4rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: 'var(--text-base)',
                  textDecoration: 'none',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'opacity var(--transition-fast)',
                }}
              >
                <Upload size={16} />
                <span>Upload Documents</span>
                <ArrowRight size={14} />
              </Link>

              <Link
                to="/app/chat"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                  padding: '0.7rem 1.4rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: 'var(--text-base)',
                  textDecoration: 'none',
                  transition: 'background-color var(--transition-fast)',
                }}
              >
                <MessageSquare size={16} color="var(--accent)" />
                <span>Start Chat</span>
              </Link>
            </div>
          </div>

          {/* 4 Feature Badges Bottom Bar */}
          <div
            style={{
              marginTop: '3.5rem',
              paddingTop: '2rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--accent)' }}>
                <Lock size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Local AI</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Your data stays local</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--accent)' }}>
                <Search size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Semantic Search</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Find what matters</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--accent)' }}>
                <FileText size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Multiple Formats</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>PDF, DOCX, TXT, MD</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--accent)' }}>
                <Code2 size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Open Source</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Built for developers</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Architecture Pipeline (Grounded in Real Codebase) ────────────── */}
      <section
        id="architecture"
        style={{
          padding: '3rem 1.5rem',
          maxWidth: '1280px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ maxWidth: '36rem', marginBottom: '2.5rem' }}>
          <Badge variant="cyan" size="sm" style={{ marginBottom: '0.75rem' }}>
            Pipeline Overview
          </Badge>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Retrieval-Augmented Architecture
          </h2>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Multi-stage pipeline connecting raw document ingestion, vectorized indexing, and local LLM synthesis.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* Step 1 */}
          <div className="solid-panel" style={{ padding: '1.75rem' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '1rem' }}>
              <FileText size={24} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              1. Ingestion & Chunking
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Ingests multi-format documents (PDF, DOCX, TXT, MD) using sliding-window word chunking (250 words with 30 word overlap) to preserve contextual boundaries.
            </p>
          </div>

          {/* Step 2 */}
          <div className="solid-panel" style={{ padding: '1.75rem' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '1rem' }}>
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              2. Vector Embedding & Indexing
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Ollama generates 768-D embeddings with <code>nomic-embed-text</code>. Vectors are indexed into HNSW, KD-Tree, or Brute-Force structures for sub-millisecond retrieval.
            </p>
          </div>

          {/* Step 3 */}
          <div className="solid-panel" style={{ padding: '1.75rem' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '1rem' }}>
              <MessageSquare size={24} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              3. Grounded RAG Synthesis
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Top candidate chunks are retrieved by cosine distance and supplied to local <code>llama3.2</code>, synthesizing factual answers with verifiable citations.
            </p>
          </div>
        </div>
      </section>

      {/* ── Verified Engine Capabilities ─────────────────────────────────── */}
      <section
        id="engine"
        style={{
          padding: '3rem 1.5rem 5rem',
          maxWidth: '1280px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ maxWidth: '36rem', marginBottom: '2.5rem' }}>
          <Badge variant="teal" size="sm" style={{ marginBottom: '0.75rem' }}>
            Core Engine
          </Badge>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Triple Vector Search Algorithms
          </h2>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Native Python implementations tested for mathematical precision against C++ reference benchmarks.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <div className="solid-panel" style={{ padding: '1.5rem' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>
              <Layers size={22} />
            </div>
            <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: '0.35rem' }}>HNSW Graph</h4>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Multi-layer hierarchical navigable small world graph. Achieves logarithmic nearest neighbor query scaling for high-dimensional semantic spaces.
            </p>
          </div>

          <div className="solid-panel" style={{ padding: '1.5rem' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>
              <Cpu size={22} />
            </div>
            <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: '0.35rem' }}>KD-Tree Partitioning</h4>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Space-partitioning tree supporting exact Euclidean neighbor searches, optimized for lower-dimensional vector clusters.
            </p>
          </div>

          <div className="solid-panel" style={{ padding: '1.5rem' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>
              <ShieldCheck size={22} />
            </div>
            <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: '0.35rem' }}>Brute-Force Baseline</h4>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Exhaustive linear scan accelerated with vectorized NumPy calculations, serving as ground-truth for Recall@K evaluation.
            </p>
          </div>
        </div>
      </section>

      {/* ── Public Footer ──────────────────────────────────────────────── */}
      <footer
        style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-solid)',
          padding: '2rem 1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={16} color="var(--accent)" />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>VectorMind</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>— MIT License</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <Link to="/app" style={{ color: 'inherit', textDecoration: 'none' }}>Workspace</Link>
            <Link to="/app/search" style={{ color: 'inherit', textDecoration: 'none' }}>Search</Link>
            <Link to="/app/chat" style={{ color: 'inherit', textDecoration: 'none' }}>Chat</Link>
            <a href="https://github.com/Atharv-Dev04/My_Ai" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>GitHub</a>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
      />

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
    </div>
  );
};
