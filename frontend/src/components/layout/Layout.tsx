import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Database,
  LogIn,
  LogOut,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { AuthModal } from '../auth/AuthModal';
import {
  listConversations,
  createConversation,
  deleteConversation,
  type ConversationSummary,
} from '../../api/client';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  // Load user conversations for the left sidebar
  const fetchConversations = async () => {
    try {
      const convs = await listConversations();
      setConversations(convs);
    } catch {
      // Quiet fallback for guest
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [location.pathname, user]);

  const [prevPath, setPrevPath] = useState(location.pathname);
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname);
    setMobileMenuOpen(false);
  }

  const handleNewChat = async () => {
    try {
      await createConversation('New Chat');
      await fetchConversations();
    } catch {
      // Fallback
    }
    navigate('/');
    // Trigger window custom event for ChatPage to reset input/session
    window.dispatchEvent(new CustomEvent('vectormind:new-chat'));
  };

  const handleDeleteConv = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      window.dispatchEvent(new CustomEvent('vectormind:deleted-chat', { detail: { id } }));
    } catch {
      // Quiet error
    }
  };

  const handleSelectConv = (id: number) => {
    navigate('/');
    window.dispatchEvent(new CustomEvent('vectormind:select-chat', { detail: { id } }));
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: '#000000', color: '#ffffff' }}>
      {/* ── Left Sidebar (ChatGPT / Claude style) ────────────────────────── */}
      <aside
        className="desktop-sidebar"
        style={{
          width: isCollapsed ? '64px' : '260px',
          backgroundColor: '#0a0a0a',
          borderRight: '1px solid #262626',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
          transition: 'width 0.2s ease',
          overflow: 'hidden',
          flexShrink: 0,
        }}
        aria-label="Application Sidebar"
      >
        {/* Brand Header */}
        <div
          style={{
            padding: isCollapsed ? '1rem 0.5rem' : '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid #1f1f1f',
            minHeight: '56px',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              textDecoration: 'none',
              color: '#ffffff',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#171717',
                border: '1px solid #333333',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Database size={17} />
            </div>
            {!isCollapsed && (
              <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
                VectorMind
              </span>
            )}
          </Link>

          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              aria-label="Collapse sidebar"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#737373',
                cursor: 'pointer',
                display: 'flex',
                padding: '0.25rem',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#737373')}
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
                color: '#737373',
                cursor: 'pointer',
                display: 'flex',
                padding: '0.25rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#737373')}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* New Chat Button */}
        <div style={{ padding: isCollapsed ? '0.75rem 0.5rem' : '0.85rem 1rem 0.5rem 1rem' }}>
          <button
            onClick={handleNewChat}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '0.55rem',
              padding: isCollapsed ? '0.6rem 0' : '0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #333333',
              backgroundColor: '#141414',
              color: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1f1f1f')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#141414')}
            title="New Chat"
          >
            <Plus size={16} />
            {!isCollapsed && <span>New chat</span>}
          </button>
        </div>

        {/* Navigation / Chat Sessions List */}
        <nav
          style={{
            flex: 1,
            padding: isCollapsed ? '0.5rem 0.4rem' : '0.5rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
          aria-label="Primary Navigation"
        >
          {/* Main App Links */}
          <NavLink
            to="/"
            end
            title={isCollapsed ? 'Chat' : undefined}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '0.65rem',
              padding: isCollapsed ? '0.6rem 0' : '0.5rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
              color: isActive ? '#ffffff' : '#a3a3a3',
              backgroundColor: isActive ? '#1c1c1c' : 'transparent',
              border: `1px solid ${isActive ? '#333333' : 'transparent'}`,
              transition: 'all 0.15s ease',
            })}
          >
            <MessageSquare size={16} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span>Chat</span>}
          </NavLink>

          <NavLink
            to="/settings"
            title={isCollapsed ? 'Settings' : undefined}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '0.65rem',
              padding: isCollapsed ? '0.6rem 0' : '0.5rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
              color: isActive ? '#ffffff' : '#a3a3a3',
              backgroundColor: isActive ? '#1c1c1c' : 'transparent',
              border: `1px solid ${isActive ? '#333333' : 'transparent'}`,
              transition: 'all 0.15s ease',
            })}
          >
            <Settings size={16} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span>Settings</span>}
          </NavLink>

          {/* Past Conversations List (if not collapsed) */}
          {!isCollapsed && conversations.length > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #1f1f1f' }}>
              <div
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  color: '#737373',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '0 0.5rem 0.5rem',
                }}
              >
                Recent Chats
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                {conversations.slice(0, 8).map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConv(conv.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                      color: '#a3a3a3',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#141414')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '170px',
                      }}
                    >
                      {conv.title || 'Conversation'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConv(e, conv.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#525252',
                        cursor: 'pointer',
                        padding: '0.15rem',
                        display: 'flex',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#525252')}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User Profile / Auth Footer */}
        <div
          style={{
            padding: isCollapsed ? '0.75rem 0.4rem' : '0.85rem 1rem',
            borderTop: '1px solid #1f1f1f',
            backgroundColor: '#050505',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            gap: '0.5rem',
          }}
        >
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden', width: '100%' }}>
              <Link
                to="/settings"
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
                    backgroundColor: '#1f1f1f',
                    color: '#ffffff',
                    border: '1px solid #333333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    flexShrink: 0,
                  }}
                >
                  {(user.full_name || user.email)[0].toUpperCase()}
                </div>
                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.full_name || user.email.split('@')[0]}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#737373' }}>
                      {user.email}
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
                    color: '#737373',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#737373')}
                >
                  <LogOut size={15} />
                </button>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#000000',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <LogIn size={14} />
              {!isCollapsed && <span>Sign In</span>}
            </Link>
          )}
        </div>
      </aside>

      {/* ── Main Application Workspace (Outlet) ───────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: '#000000' }}>
        {/* Mobile Header Bar (< 768px) */}
        <header
          className="mobile-header"
          style={{
            height: '48px',
            borderBottom: '1px solid #1f1f1f',
            backgroundColor: '#0a0a0a',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1rem',
          }}
        >
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>VectorMind</span>
          <div style={{ width: 24 }} />
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div
            style={{
              position: 'fixed',
              top: '48px',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#0a0a0a',
              zIndex: 50,
              padding: '1.25rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <button
              onClick={handleNewChat}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#000000',
                fontWeight: 600,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Plus size={16} /> New Chat
            </button>
            <NavLink
              to="/"
              style={{ padding: '0.65rem 1rem', color: '#ffffff', textDecoration: 'none', fontSize: '0.9rem' }}
            >
              Chat Interface
            </NavLink>
            <NavLink
              to="/settings"
              style={{ padding: '0.65rem 1rem', color: '#ffffff', textDecoration: 'none', fontSize: '0.9rem' }}
            >
              Settings & Profile
            </NavLink>
          </div>
        )}

        {/* Page Content */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};
