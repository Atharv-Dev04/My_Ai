import React from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  FileText,
  Upload,
  Search,
  MessageSquare,
  BarChart3,
  User,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  Database,
  ExternalLink,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useTheme } from '../../context/useTheme';
import { useAuth } from '../../context/auth-context';
import { AuthModal } from '../auth/AuthModal';

const navigationItems = [
  { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Overview', path: '/app', icon: Home },
  { name: 'Documents', path: '/app/documents', icon: FileText },
  { name: 'Upload', path: '/app/upload', icon: Upload },
  { name: 'Search', path: '/app/search', icon: Search },
  { name: 'AI Chat', path: '/app/chat', icon: MessageSquare },
  { name: 'Analytics', path: '/app/analytics', icon: BarChart3 },
  { name: 'Profile', path: '/app/profile', icon: User },
  { name: 'Settings', path: '/app/settings', icon: Settings },
];

export const Layout: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();
  const [prevPathname, setPrevPathname] = React.useState(location.pathname);

  // Close mobile menu on navigate
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setMobileMenuOpen(false);
  }

  // Determine current section title
  const currentNav = navigationItems.find(
    (item) => item.path === location.pathname || (item.path === '/app' && location.pathname === '/app')
  );
  const pageTitle = currentNav?.name || 'Workspace';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar for Desktop */}
      <aside
        style={{
          width: '240px',
          backgroundColor: 'var(--bg-surface)',
          backdropFilter: 'var(--backdrop-blur)',
          WebkitBackdropFilter: 'var(--backdrop-blur)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
        }}
        className="desktop-sidebar"
      >
        {/* Brand */}
        <Link
          to="/"
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            borderBottom: '1px solid var(--border-subtle)',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            style={{
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent)',
              display: 'flex',
            }}
          >
            <Database size={20} />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              VectorMind
            </span>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Semantic Engine</div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav
          style={{
            flex: 1,
            padding: '1rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            overflowY: 'auto',
          }}
          aria-label="Sidebar Navigation"
        >
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/app'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  textDecoration: 'none',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                  transition: 'all var(--transition-fast)',
                })}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer / Theme Toggle */}
        <div
          style={{
            padding: '0.85rem 1rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            to="/"
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            Public Site <ExternalLink size={12} />
          </Link>
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
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '56px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            backdropFilter: 'var(--backdrop-blur)',
            WebkitBackdropFilter: 'var(--backdrop-blur)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Mobile brand & toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {pageTitle}
              </span>
            </div>
          </div>

          {/* Quick status badge & actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                backgroundColor: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
              }}
            >
              <span>API :8000</span>
            </div>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <NavLink
                  to="/app/profile"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    textDecoration: 'none',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--accent-light)',
                    color: 'var(--accent)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  <User size={13} />
                  <span>{user.full_name || user.email.split('@')[0]}</span>
                </NavLink>
                <button
                  onClick={logout}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.4rem',
                  }}
                  title="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-foreground)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </button>
            )}

            <button
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="topbar-theme-toggle"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.35rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'none',
              }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />

        {/* Mobile Nav Overlay */}
        {mobileMenuOpen && (
          <div
            style={{
              position: 'fixed',
              top: '56px',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'var(--bg-primary)',
              zIndex: 50,
              padding: '1.25rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              overflowY: 'auto',
            }}
          >
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/app'}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.95rem',
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

        {/* Main Routed Page Content */}
        <main
          style={{
            flex: 1,
            padding: '2rem 1.5rem',
            maxWidth: '1280px',
            width: '100%',
            margin: '0 auto',
          }}
          className="main-container"
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
          .topbar-theme-toggle {
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
