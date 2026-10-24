import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Menu,
  X,
  Database,
  ExternalLink,
  LogIn,
  LogOut,
  Clock,
} from 'lucide-react';
import { useTheme } from '../../context/useTheme';
import { useAuth } from '../../context/auth-context';
import { AuthModal } from '../auth/AuthModal';
import { getDocuments, type DocListItem } from '../../api/client';
import { Badge } from '../common/Badge';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  exact?: boolean;
}

const mainNavItems: NavItem[] = [
  { name: 'Home', path: '/app', icon: Home, exact: true },
  { name: 'Search', path: '/app/search', icon: Search },
  { name: 'Chat', path: '/app/chat', icon: MessageSquare },
  { name: 'Documents', path: '/app/documents', icon: FileText },
  { name: 'Analytics', path: '/app/analytics', icon: BarChart3 },
  { name: 'Settings', path: '/app/settings', icon: Settings },
];

export const Layout: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [recentDocs, setRecentDocs] = useState<DocListItem[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  // Load real recently indexed documents for sidebar
  useEffect(() => {
    let mounted = true;
    getDocuments()
      .then((docs) => {
        if (mounted) {
          // Take top 3 unique document titles
          const seen = new Set<string>();
          const unique: DocListItem[] = [];
          for (const doc of docs) {
            if (!seen.has(doc.title)) {
              seen.add(doc.title);
              unique.push(doc);
              if (unique.length >= 3) break;
            }
          }
          setRecentDocs(unique);
        }
      })
      .catch(() => {
        // Quiet fail, empty recent state
      });
    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  const [prevPath, setPrevPath] = useState(location.pathname);

  // Close mobile drawer if location changes
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname);
    setMobileMenuOpen(false);
  }

  // Global search keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate('/app/search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: 'var(--bg-app)' }}>
      {/* ── Left Sidebar (Desktop) ────────────────────────────────────────── */}
      <aside
        className="desktop-sidebar"
        style={{
          width: isCollapsed ? '72px' : '250px',
          backgroundColor: 'var(--bg-surface-solid)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
          transition: 'width var(--transition-normal)',
          overflow: 'hidden',
        }}
        aria-label="Application Sidebar"
      >
        {/* Brand Header */}
        <div
          style={{
            padding: isCollapsed ? '1rem 0.5rem' : '1.15rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            minHeight: '64px',
          }}
        >
          <Link
            to="/app"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              textDecoration: 'none',
              color: 'inherit',
              overflow: 'hidden',
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
                flexShrink: 0,
                border: '1px solid rgba(56, 189, 248, 0.2)',
              }}
            >
              <Database size={18} />
            </div>
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <span style={{ fontWeight: 700, fontSize: '0.975rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  VectorMind
                </span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  v1.1 Workspace
                </span>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              aria-label="Collapse sidebar"
              className="sidebar-collapse-btn"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                padding: '0.25rem',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
            <button
              onClick={() => setIsCollapsed(false)}
              aria-label="Expand sidebar"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                padding: '0.25rem',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav
          style={{
            flex: 1,
            padding: isCollapsed ? '0.75rem 0.4rem' : '0.85rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
          aria-label="Primary Navigation"
        >
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                title={isCollapsed ? item.name : undefined}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  gap: '0.75rem',
                  padding: isCollapsed ? '0.65rem 0' : '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-base)',
                  fontWeight: isActive ? 600 : 500,
                  textDecoration: 'none',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid transparent',
                  transition: 'all var(--transition-fast)',
                })}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
                {!isCollapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}

          {/* Real Recently Viewed / Indexed Documents (Reference Board) */}
          {!isCollapsed && recentDocs.length > 0 && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '0 0.75rem 0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Clock size={12} />
                <span>Recently Indexed</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                {recentDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    to="/app/documents"
                    title={doc.title}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent)',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User Profile / Auth Area in Sidebar */}
        <div
          style={{
            padding: isCollapsed ? '0.75rem 0.4rem' : '0.85rem 1rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            gap: '0.5rem',
          }}
        >
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden', width: '100%' }}>
              <Link
                to="/app/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  textDecoration: 'none',
                  color: 'inherit',
                  overflow: 'hidden',
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-light)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: 'var(--text-xs)',
                    flexShrink: 0,
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                  }}
                >
                  {(user.full_name || user.email)[0].toUpperCase()}
                </div>
                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, overflow: 'hidden' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.full_name || user.email.split('@')[0]}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Authenticated
                    </span>
                  </div>
                )}
              </Link>

              {!isCollapsed && (
                <button
                  onClick={logout}
                  title="Sign out"
                  aria-label="Sign out"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: 'var(--radius-xs)',
                    display: 'flex',
                  }}
                >
                  <LogOut size={15} />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-foreground)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <LogIn size={14} />
              {!isCollapsed && <span>Sign In</span>}
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Application Workspace ────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: 'var(--bg-app)' }}>
        {/* Top Header & Search Shortcut Bar */}
        <header
          style={{
            height: '56px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-solid)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Left: Mobile Toggle & Global Search Shortcut */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, maxWidth: '480px' }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile navigation menu"
              className="mobile-toggle"
              style={{
                display: 'none',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                padding: '0.35rem',
                cursor: 'pointer',
              }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Functional Global Search Shortcut Bar */}
            <div
              onClick={() => navigate('/app/search')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate('/app/search');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                maxWidth: '360px',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                transition: 'border-color var(--transition-fast)',
              }}
              aria-label="Search knowledge base (Ctrl+K)"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={14} color="var(--text-muted)" />
                <span>Search knowledge base...</span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6875rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--bg-surface-solid)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                Ctrl K
              </span>
            </div>
          </div>

          {/* Right: API Telemetry & Theme Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <Badge variant="cyan" size="sm" dot>
              <span>API :8000</span>
            </Badge>

            <Link
              to="/"
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span>Site</span>
              <ExternalLink size={11} />
            </Link>

            <button
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.35rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border-color var(--transition-fast)',
              }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {/* ── Mobile Navigation Drawer ───────────────────────────────────── */}
        {mobileMenuOpen && (
          <div
            style={{
              position: 'fixed',
              top: '56px',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'var(--bg-surface-solid)',
              zIndex: 50,
              padding: '1.25rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              overflowY: 'auto',
            }}
          >
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-base)',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                  })}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        )}

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />

        {/* ── Routed Content Container ───────────────────────────────────── */}
        <main
          className="main-container"
          style={{
            flex: 1,
            padding: '1.75rem 2rem',
            maxWidth: '1360px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-toggle {
            display: flex !important;
          }
          .main-container {
            padding: 1.25rem 1rem !important;
          }
        }
      `}</style>
    </div>
  );
};
