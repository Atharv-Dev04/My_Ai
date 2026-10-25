import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Bot,
  User,
  BookOpen,
  AlertCircle,
  Plus,
  RefreshCw,
  X,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  Sparkles,
  MessageSquare,
  Trash2,
  ExternalLink,
  Layers,
  StopCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ragAsk,
  listConversations,
  getConversation,
  createConversation,
  deleteConversation,
  appendMessage,
  type ContextChunk,
  type ConversationSummary,
} from '../api/client';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Tooltip } from '../components/common/Tooltip';
import { usePreferences } from '../context/usePreferences';

interface UIConversationMessage {
  id: string | number;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: ContextChunk[];
  model?: string;
  hasNoContext?: boolean;
  isError?: boolean;
}

export const ChatPage: React.FC = () => {
  const { preferences } = usePreferences();

  // Three-panel layout visibility states
  const [showLeftRail, setShowLeftRail] = useState<boolean>(true);
  const [showRightRail, setShowRightRail] = useState<boolean>(true);

  // Mobile / tablet panel switch ('chat' | 'sources' | 'history')
  const [mobileTab, setMobileTab] = useState<'chat' | 'sources' | 'history'>('chat');

  // Retrieval & LLM controls
  const [topK, setTopK] = useState<number>(preferences.defaultTopK || 3);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active conversation state
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<UIConversationMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Citations & inspection
  const [inspectCitation, setInspectCitation] = useState<ContextChunk | null>(null);
  const [copiedChunkId, setCopiedChunkId] = useState<number | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | number | null>(null);

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // DOM Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keyboard escape shortcut to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && inspectCitation) {
        setInspectCitation(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectCitation]);

  // Load conversations list on mount (if authenticated / available)
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const convs = await listConversations();
        setConversations(convs);
      } catch {
        // Unauthenticated or table empty; fallback gracefully to local session
      }
    };
    fetchConversations();
  }, []);

  // Auto-scroll conversation to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSubmitting]);

  // Active citations across the latest assistant response
  const latestAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'assistant' && messages[i].citations && messages[i].citations!.length > 0) {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  const activeCitations: ContextChunk[] = useMemo(() => {
    return latestAssistantMessage?.citations || [];
  }, [latestAssistantMessage]);

  // Switch or load conversation
  const handleSelectConversation = async (convId: number) => {
    if (activeConvId === convId) return;
    setIsLoadingHistory(true);
    setActiveConvId(convId);
    try {
      const detail = await getConversation(convId);
      const mapped: UIConversationMessage[] = detail.messages.map((m) => ({
        id: m.id,
        sender: m.sender as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: Array.isArray(m.citations) ? (m.citations as ContextChunk[]) : undefined,
        model: 'llama3.2',
        hasNoContext: Array.isArray(m.citations) && m.citations.length === 0,
      }));
      setMessages(mapped);
      setMobileTab('chat');
    } catch {
      // Failed to load conversation details
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Start new conversation session
  const handleNewConversation = async () => {
    try {
      const newConv = await createConversation('New Conversation');
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      setMessages([]);
    } catch {
      // Local in-memory session reset
      setActiveConvId(null);
      setMessages([]);
    }
    setInputPrompt('');
    setMobileTab('chat');
    inputRef.current?.focus();
  };

  // Delete conversation
  const handleDeleteConversation = async (e: React.MouseEvent, convId: number) => {
    e.stopPropagation();
    try {
      await deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch {
      // Fallback
    }
  };

  // Submit chat prompt
  const handleSendMessage = async (e?: React.FormEvent, directPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = (directPrompt !== undefined ? directPrompt : inputPrompt).trim();
    if (!promptToSend || isSubmitting) return;

    const userMsgId = `usr-${Date.now()}`;
    const userMsg: UIConversationMessage = {
      id: userMsgId,
      sender: 'user',
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsSubmitting(true);

    abortControllerRef.current = new AbortController();

    try {
      // 1. Persist user message to active DB session if present
      if (activeConvId) {
        appendMessage(activeConvId, 'user', promptToSend).catch(() => {});
      }

      // 2. Perform RAG retrieval + LLM synthesis
      const response = await ragAsk(promptToSend, topK);

      const assistantMsgId = `ast-${Date.now()}`;
      const assistantMsg: UIConversationMessage = {
        id: assistantMsgId,
        sender: 'assistant',
        content: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: response.contexts,
        model: response.model || 'llama3.2',
        hasNoContext: response.contexts.length === 0,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // 3. Persist assistant response to DB session if present
      if (activeConvId) {
        appendMessage(activeConvId, 'assistant', response.answer, response.contexts).catch(() => {});
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to synthesize RAG response';
      let helpfulText = `RAG Generation failed: ${msg}. Please ensure Ollama is running and has models pulled (e.g. nomic-embed-text, llama3.2).`;
      if (msg.toLowerCase().includes('no documents indexed')) {
        helpfulText = `No knowledge documents are indexed in DocumentDB yet. Because VectorMind uses grounded retrieval, please upload or seed knowledge documents at http://localhost:5173/app/upload before querying.`;
      }

      const errorMsg: UIConversationMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        content: helpfulText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSubmitting(false);
      abortControllerRef.current = null;
      inputRef.current?.focus();
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSubmitting(false);
  };

  const handleRetryLastMessage = () => {
    if (messages.length === 0) return;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') {
        handleSendMessage(undefined, messages[i].content);
        break;
      }
    }
  };

  const handleCopyMessage = (msg: UIConversationMessage) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedMsgId(msg.id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleCopyCitationChunk = (chunk: ContextChunk, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(chunk.text);
    setCopiedChunkId(chunk.id);
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Lightweight Markdown & code block parser
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const language = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
        const code = language ? lines.slice(1).join('\n') : lines.join('\n');

        return (
          <div
            key={index}
            style={{
              position: 'relative',
              margin: '0.75rem 0',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#050a0e',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.35rem 0.85rem',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
              }}
            >
              <span>{language || 'code'}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(code)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <Copy size={12} /> Copy
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                padding: '0.85rem 1rem',
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                overflowX: 'auto',
              }}
            >
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Inline code and paragraph rendering
      const inlineParts = part.split(/(`[^`]+`)/g);
      return (
        <span key={index}>
          {inlineParts.map((sub, sIdx) => {
            if (sub.startsWith('`') && sub.endsWith('`')) {
              return (
                <code
                  key={sIdx}
                  style={{
                    padding: '0.15rem 0.35rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85em',
                    color: 'var(--accent)',
                  }}
                >
                  {sub.slice(1, -1)}
                </code>
              );
            }
            return sub;
          })}
        </span>
      );
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 110px)',
        minHeight: '560px',
        maxWidth: '96rem',
        margin: '0 auto',
        width: '100%',
        gap: '0.75rem',
        position: 'relative',
      }}
    >
      {/* ── Mobile Tab Switcher Bar (< 900px) ─────────────────────────── */}
      <div
        className="mobile-only"
        style={{
          display: 'none',
          position: 'absolute',
          top: '-2.75rem',
          left: 0,
          right: 0,
          zIndex: 20,
          gap: '0.5rem',
        }}
      >
        <button
          onClick={() => setMobileTab('history')}
          style={{
            flex: 1,
            padding: '0.45rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: mobileTab === 'history' ? 'var(--accent-light)' : 'var(--bg-surface)',
            color: mobileTab === 'history' ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: '0.8125rem',
            fontWeight: 600,
          }}
        >
          History ({conversations.length})
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          style={{
            flex: 1.5,
            padding: '0.45rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: mobileTab === 'chat' ? 'var(--accent-light)' : 'var(--bg-surface)',
            color: mobileTab === 'chat' ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: '0.8125rem',
            fontWeight: 600,
          }}
        >
          Chat Conversation
        </button>
        <button
          onClick={() => setMobileTab('sources')}
          style={{
            flex: 1,
            padding: '0.45rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: mobileTab === 'sources' ? 'var(--accent-light)' : 'var(--bg-surface)',
            color: mobileTab === 'sources' ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: '0.8125rem',
            fontWeight: 600,
          }}
        >
          Sources ({activeCitations.length})
        </button>
      </div>

      {/* ── (1) LEFT PANEL: Conversation Rail ─────────────────────────── */}
      {showLeftRail && (
        <aside
          className="solid-panel"
          style={{
            width: '260px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            transition: 'width var(--transition-base)',
          }}
        >
          {/* Rail Header & New Chat button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <MessageSquare size={16} color="var(--accent)" />
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Conversations
              </span>
            </div>
            <Tooltip content="Collapse history rail">
              <button
                type="button"
                onClick={() => setShowLeftRail(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={16} />
              </button>
            </Tooltip>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleNewConversation}
            leftIcon={<Plus size={15} />}
            style={{ width: '100%', marginBottom: '1rem' }}
          >
            New Chat
          </Button>

          {/* Conversation List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {conversations.length === 0 ? (
              <div style={{ padding: '1rem 0.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                No saved conversations yet. Conversations persist when signed in.
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                      border: `1px solid ${isActive ? 'rgba(56, 189, 248, 0.3)' : 'transparent'}`,
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', overflow: 'hidden' }}>
                      <span
                        style={{
                          fontWeight: isActive ? 600 : 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '160px',
                        }}
                      >
                        {conv.title || 'Untitled Session'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(conv.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {conv.message_count} msgs
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      aria-label="Delete chat"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--rose)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Retrieval Parameter Controls */}
          <div
            style={{
              paddingTop: '0.85rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              fontSize: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <SlidersHorizontal size={12} color="var(--accent)" /> Retrieval Budget (k):
              </span>
              <select
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value, 10))}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-canvas)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value={1}>1 chunk</option>
                <option value={3}>3 chunks</option>
                <option value={5}>5 chunks</option>
                <option value={8}>8 chunks</option>
              </select>
            </div>

            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              Model: <code style={{ color: 'var(--accent)' }}>llama3.2</code> (Ollama local)
            </div>
          </div>
        </aside>
      )}

      {/* Uncollapse button for Left Rail */}
      {!showLeftRail && (
        <Tooltip content="Show conversations">
          <button
            type="button"
            onClick={() => setShowLeftRail(true)}
            style={{
              position: 'absolute',
              left: 0,
              top: '1rem',
              zIndex: 10,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '0 var(--radius-md) var(--radius-md) 0',
              padding: '0.5rem 0.35rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <ChevronRight size={16} />
          </button>
        </Tooltip>
      )}

      {/* ── (2) CENTRAL PANEL: Chat Timeline & Bottom-Pinned Composer ─── */}
      <main
        className="solid-panel"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* Chat Timeline Header */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(11, 15, 23, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--teal)',
              }}
            />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {activeConvId ? 'Active Session' : 'Workspace RAG Session'}
            </span>
            <Badge variant="cyan" size="sm">
              llama3.2
            </Badge>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link to="/app/search">
              <Button variant="ghost" size="xs" rightIcon={<ExternalLink size={12} />}>
                Semantic Search
              </Button>
            </Link>
            {!showRightRail && (
              <Tooltip content="Show source context panel">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setShowRightRail(true)}
                  leftIcon={<BookOpen size={12} />}
                >
                  Sources ({activeCitations.length})
                </Button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Message Scroll Container */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {isLoadingHistory ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem' }} />
              <div style={{ fontSize: '0.85rem' }}>Loading conversation history...</div>
            </div>
          ) : messages.length === 0 ? (
            /* Starter Prompts & Empty Workspace State */
            <div
              style={{
                margin: 'auto',
                textAlign: 'center',
                maxWidth: '32rem',
                padding: '2rem 1rem',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                }}
              >
                <Bot size={26} />
              </div>

              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  marginBottom: '0.5rem',
                  color: 'var(--text-primary)',
                }}
              >
                Ground Your Questions in Documents
              </h2>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  marginBottom: '1.75rem',
                }}
              >
                VectorMind retrieves exact matching passages from DocumentDB and prompts your local Ollama LLM with grounded citations.
              </p>

              {/* Verified Starter Prompts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', textAlign: 'left' }}>
                <button
                  type="button"
                  onClick={() => handleSendMessage(undefined, 'What is dynamic programming and what are its primary properties?')}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <span>"What is dynamic programming and what are its primary properties?"</span>
                  <Sparkles size={14} color="var(--accent)" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage(undefined, 'Summarize the primary vector algorithms supported by the engine.')}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <span>"Summarize the primary vector algorithms supported by the engine."</span>
                  <Sparkles size={14} color="var(--accent)" />
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '0.85rem',
                  alignItems: 'flex-start',
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: msg.sender === 'user' ? '75%' : '88%',
                }}
              >
                {msg.sender === 'assistant' && (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: msg.isError ? 'rgba(244, 63, 94, 0.15)' : 'var(--accent-light)',
                      color: msg.isError ? 'var(--rose)' : 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '0.2rem',
                      border: `1px solid ${msg.isError ? 'rgba(244, 63, 94, 0.3)' : 'rgba(56, 189, 248, 0.25)'}`,
                    }}
                  >
                    {msg.isError ? <AlertCircle size={17} /> : <Bot size={17} />}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 0 }}>
                  {/* Message Bubble */}
                  <div
                    style={{
                      padding: '0.9rem 1.15rem',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor:
                        msg.sender === 'user'
                          ? 'var(--accent)'
                          : msg.isError
                          ? 'rgba(244, 63, 94, 0.1)'
                          : 'var(--bg-canvas)',
                      color:
                        msg.sender === 'user'
                          ? 'var(--accent-foreground)'
                          : 'var(--text-primary)',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      wordBreak: 'break-word',
                      border:
                        msg.sender === 'assistant'
                          ? `1px solid ${msg.isError ? 'rgba(244, 63, 94, 0.3)' : 'var(--border-subtle)'}`
                          : 'none',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {msg.sender === 'assistant' ? renderMessageContent(msg.content) : msg.content}
                  </div>

                  {/* Inline Citation Chips for Assistant */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <BookOpen size={11} color="var(--accent)" /> Sources:
                      </span>
                      {msg.citations.map((cite, cIdx) => (
                        <button
                          key={cite.id || cIdx}
                          onClick={() => {
                            setInspectCitation(cite);
                            setShowRightRail(true);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-surface-hover)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--accent)',
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'border-color var(--transition-fast)',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                          title={`Click to inspect chunk #${cite.id} from ${cite.title}`}
                        >
                          [{cIdx + 1}] {cite.title}
                          {cite.page_number && <span style={{ color: 'var(--text-muted)' }}>p.{cite.page_number}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Warning if no matching context chunks passed the distance threshold */}
                  {msg.hasNoContext && (
                    <div
                      style={{
                        fontSize: '0.725rem',
                        color: 'var(--amber)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--warning-bg)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                      }}
                    >
                      <AlertCircle size={12} />
                      <span>Zero chunks met the cosine distance threshold (d ≤ 0.70). General knowledge synthesis.</span>
                    </div>
                  )}

                  {/* Message Meta & Action Controls */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      padding: '0 0.25rem',
                    }}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.model && <span>• {msg.model}</span>}

                    <button
                      type="button"
                      onClick={() => handleCopyMessage(msg)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: copiedMsgId === msg.id ? 'var(--teal)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '0.7rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                      }}
                    >
                      {copiedMsgId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                      {copiedMsgId === msg.id ? 'Copied' : 'Copy'}
                    </button>

                    {msg.isError && (
                      <button
                        type="button"
                        onClick={handleRetryLastMessage}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent)',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.7rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                        }}
                      >
                        <RefreshCw size={11} /> Retry
                      </button>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-surface-hover)',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '0.2rem',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <User size={17} />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Typing / Retrieval / Generation Status */}
          {isSubmitting && (
            <div
              style={{
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'center',
                color: 'var(--text-secondary)',
                padding: '0.5rem 0',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                }}
              >
                <Bot size={17} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                <span>Searching DocumentDB vector store & synthesizing answer with Ollama...</span>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={handleStopGeneration}
                leftIcon={<StopCircle size={13} color="var(--rose)" />}
              >
                Stop
              </Button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Bottom-Pinned Message Composer ───────────────────────────── */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(11, 15, 23, 0.6)',
          }}
        >
          <form onSubmit={handleSendMessage} style={{ position: 'relative' }}>
            <textarea
              ref={inputRef}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question against your indexed documents (Enter to send, Shift+Enter for newline)..."
              rows={2}
              style={{
                width: '100%',
                padding: '0.85rem 4rem 0.85rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5,
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.25)',
                transition: 'border-color var(--transition-fast)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
            />

            <button
              type="submit"
              disabled={!inputPrompt.trim() || isSubmitting}
              aria-label="Send query"
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: !inputPrompt.trim() || isSubmitting ? 'var(--bg-surface-hover)' : 'var(--accent)',
                color: !inputPrompt.trim() || isSubmitting ? 'var(--text-muted)' : 'var(--accent-foreground)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem',
                cursor: !inputPrompt.trim() || isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Send size={16} />
            </button>
          </form>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '0.45rem',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>Grounded against DocumentDB index • Ollama local embeddings & generation</span>
            <span>Shift + Enter for new line</span>
          </div>
        </div>
      </main>

      {/* ── (3) RIGHT PANEL: Sources / Retrieval Context Rail ──────────── */}
      {showRightRail && (
        <aside
          className="solid-panel"
          style={{
            width: '300px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            transition: 'width var(--transition-base)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <BookOpen size={16} color="var(--accent)" />
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Retrieved Sources
              </span>
            </div>
            <Tooltip content="Collapse sources panel">
              <button
                type="button"
                onClick={() => setShowRightRail(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={16} />
              </button>
            </Tooltip>
          </div>

          {/* Active Citations List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeCitations.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}
              >
                <Layers size={24} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                No sources cited in the current query. Ask a question to see real document chunks passed to the LLM.
              </div>
            ) : (
              activeCitations.map((cite, idx) => {
                const similarityPercent = Math.max(0, Math.min(100, Math.round((1.0 - cite.distance) * 100)));
                return (
                  <div
                    key={cite.id || idx}
                    onClick={() => setInspectCitation(cite)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'border-color var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: 'var(--accent)',
                        }}
                      >
                        [{idx + 1}] CHUNK #{cite.id}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {similarityPercent}% match
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: '0.35rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cite.title}
                    </div>

                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.45,
                        margin: '0 0 0.5rem 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {cite.text}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>{cite.page_number ? `Page ${cite.page_number}` : `Chunk #${cite.chunk_index}`}</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Inspect &rarr;</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sources Summary Footer */}
          {activeCitations.length > 0 && (
            <div
              style={{
                paddingTop: '0.85rem',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.725rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}
            >
              Exact cosine metric: lower distance corresponds to closer semantic alignment in DocumentDB.
            </div>
          )}
        </aside>
      )}

      {/* ── Slide-Over Citation Inspection Modal ─────────────────────── */}
      {inspectCitation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Citation Details"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
          onClick={() => setInspectCitation(null)}
        >
          <div
            className="solid-panel"
            style={{
              maxWidth: '42rem',
              width: '100%',
              maxHeight: '82vh',
              overflowY: 'auto',
              padding: '1.75rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.15rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>
                  SOURCE CITATION • CHUNK #{inspectCitation.id}
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--text-primary)' }}>
                  {inspectCitation.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectCitation(null)}
                aria-label="Close modal"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.35rem',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Metrics Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.15rem',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Cosine Distance</div>
                <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {inspectCitation.distance.toFixed(4)}
                </div>
              </div>
              <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Page Number</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {inspectCitation.page_number ?? 'Plaintext / N/A'}
                </div>
              </div>
              <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Chunk Index</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  #{inspectCitation.chunk_index}
                </div>
              </div>
            </div>

            {/* Chunk Content */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Retrieved Chunk Content (Passed to LLM)
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopyCitationChunk(inspectCitation, e)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copiedChunkId === inspectCitation.id ? 'var(--teal)' : 'var(--accent)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  {copiedChunkId === inspectCitation.id ? <Check size={12} /> : <Copy size={12} />}
                  {copiedChunkId === inspectCitation.id ? 'Copied' : 'Copy chunk'}
                </button>
              </div>

              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  maxHeight: '260px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {inspectCitation.text}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <Button variant="ghost" size="sm" onClick={() => setInspectCitation(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
