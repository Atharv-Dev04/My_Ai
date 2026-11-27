import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  RefreshCw,
  Copy,
  Check,
  Paperclip,
  FileText,
  Square,
} from 'lucide-react';
import {
  ragAsk,
  getConversation,
  appendMessage,
  getDocuments,
  getSystemStatus,
  type ContextChunk,
  type DocListItem,
} from '../api/client';
import { DocumentSidebar } from '../components/documents/DocumentSidebar';

interface UIConversationMessage {
  id: string | number;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: ContextChunk[];
  model?: string;
  isError?: boolean;
}

export const ChatPage: React.FC = () => {
  // Right custom documents sidebar
  const [showDocSidebar, setShowDocSidebar] = useState<boolean>(false);

  // Model selection
  const [selectedModel, setSelectedModel] = useState<string>('llama3.2');
  const [availableModels, setAvailableModels] = useState<string[]>([
    'llama3.2',
    'llama3',
    'mistral',
    'nomic-embed-text',
    'phi3',
  ]);

  // Retrieval hyperparameters
  const [topK] = useState<number>(3);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active conversation state
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<UIConversationMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Document count & inspection
  const [docCount, setDocCount] = useState<number>(0);
  const [copiedMsgId, setCopiedMsgId] = useState<string | number | null>(null);
  const [expandedCitationId, setExpandedCitationId] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Refresh model info & document count
  const refreshStatusAndDocs = async () => {
    try {
      const [status, docs] = await Promise.all([
        getSystemStatus().catch(() => null),
        getDocuments().catch(() => [] as DocListItem[]),
      ]);

      if (status?.gen_model) {
        setSelectedModel(status.gen_model);
        setAvailableModels((prev) => Array.from(new Set([status.gen_model, ...prev])));
      }
      setDocCount(docs.length);
    } catch {
      // Quiet fallback
    }
  };

  useEffect(() => {
    refreshStatusAndDocs();
  }, []);

  // Listen to Layout events for new chat or selected chat
  useEffect(() => {
    const handleNewChatEvent = () => {
      setActiveConvId(null);
      setMessages([]);
      setInputPrompt('');
      inputRef.current?.focus();
    };

    const handleSelectChatEvent = async (e: Event) => {
      const customEvent = e as CustomEvent<{ id: number }>;
      const convId = customEvent.detail?.id;
      if (!convId) return;

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
          model: selectedModel,
        }));
        setMessages(mapped);
      } catch {
        // Quiet fallback
      } finally {
        setIsLoadingHistory(false);
      }
    };

    window.addEventListener('vectormind:new-chat', handleNewChatEvent);
    window.addEventListener('vectormind:select-chat', handleSelectChatEvent);

    return () => {
      window.removeEventListener('vectormind:new-chat', handleNewChatEvent);
      window.removeEventListener('vectormind:select-chat', handleSelectChatEvent);
    };
  }, [selectedModel]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSubmitting]);

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
      if (activeConvId) {
        appendMessage(activeConvId, 'user', promptToSend).catch(() => {});
      }

      const response = await ragAsk(promptToSend, topK);

      const assistantMsgId = `ast-${Date.now()}`;
      const assistantMsg: UIConversationMessage = {
        id: assistantMsgId,
        sender: 'assistant',
        content: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: response.contexts,
        model: response.model || selectedModel,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (activeConvId) {
        appendMessage(activeConvId, 'assistant', response.answer, response.contexts).catch(() => {});
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to synthesize response';
      let errorText = `Response failed: ${msg}. Please ensure Ollama is running with model "${selectedModel}".`;
      if (msg.toLowerCase().includes('no documents indexed')) {
        errorText = `No documents are currently indexed. Please click the "Documents" button on the right to upload or paste your custom knowledge documents first.`;
      }

      const errorMsg: UIConversationMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        content: errorText,
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

  const handleCopyMessage = (msg: UIConversationMessage) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedMsgId(msg.id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Markdown rendering
  const renderMessageContent = (content: string, isLightBox: boolean = false) => {
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
              margin: '0.75rem 0',
              borderRadius: '8px',
              backgroundColor: '#0d1117',
              border: '1px solid #21262d',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.4rem 0.85rem',
                backgroundColor: '#161b22',
                borderBottom: '1px solid #21262d',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                color: '#8b949e',
              }}
            >
              <span>{language || 'code'}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(code)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8b949e',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
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
                fontFamily: 'monospace',
                color: '#f0f6fc',
                overflowX: 'auto',
              }}
            >
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      const inlineParts = part.split(/(`[^`]+`)/g);
      return (
        <span key={index} style={{ color: isLightBox ? '#09090b' : '#ffffff' }}>
          {inlineParts.map((sub, sIdx) => {
            if (sub.startsWith('`') && sub.endsWith('`')) {
              return (
                <code
                  key={sIdx}
                  style={{
                    padding: '0.15rem 0.35rem',
                    borderRadius: '4px',
                    backgroundColor: isLightBox ? '#e4e4e7' : '#1f1f1f',
                    color: isLightBox ? '#18181b' : '#ffffff',
                    border: isLightBox ? '1px solid #d4d4d8' : '1px solid #333333',
                    fontFamily: 'monospace',
                    fontSize: '0.85em',
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
        height: '100vh',
        width: '100%',
        backgroundColor: '#000000',
        color: '#ffffff',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── Main Chat Stream Area ───────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#000000',
          position: 'relative',
          minWidth: 0,
          height: '100%',
        }}
      >
        {/* Top Header: Model Selector & Right Documents Button */}
        <div
          style={{
            height: '56px',
            padding: '0 1.5rem',
            borderBottom: '1px solid #1f1f1f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#070707',
            flexShrink: 0,
          }}
        >
          {/* Model Selector Dropdown (ChatGPT style) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ fontSize: '0.8125rem', color: '#737373', fontWeight: 500 }}>
              Model:
            </div>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                backgroundColor: '#141414',
                border: '1px solid #2b2b2b',
                borderRadius: '6px',
                color: '#ffffff',
                padding: '0.35rem 0.75rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Custom Documents Sidebar Toggle */}
          <button
            onClick={() => setShowDocSidebar(!showDocSidebar)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: showDocSidebar ? '#ffffff' : '#141414',
              color: showDocSidebar ? '#000000' : '#ffffff',
              border: '1px solid #333333',
              borderRadius: '6px',
              padding: '0.4rem 0.85rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <FileText size={15} />
            <span>Documents</span>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '9999px',
                backgroundColor: showDocSidebar ? '#000000' : '#262626',
                color: showDocSidebar ? '#ffffff' : '#a3a3a3',
              }}
            >
              {docCount}
            </span>
          </button>
        </div>

        {/* Message Stream */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            maxWidth: '48rem',
            margin: '0 auto',
            width: '100%',
          }}
        >
          {isLoadingHistory ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: '#737373' }}>
              <RefreshCw size={22} className="spinner" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontSize: '0.85rem' }}>Loading conversation...</div>
            </div>
          ) : messages.length === 0 ? (
            /* Empty State / Welcome Screen */
            <div
              style={{
                margin: 'auto',
                textAlign: 'center',
                padding: '2rem 1rem',
                maxWidth: '36rem',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#141414',
                  border: '1px solid #262626',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}
              >
                <Bot size={26} />
              </div>

              <h1
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  marginBottom: '0.5rem',
                  color: '#ffffff',
                }}
              >
                How can I help you today?
              </h1>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#a3a3a3',
                  lineHeight: 1.5,
                  marginBottom: '2rem',
                }}
              >
                Ask questions or explore knowledge. VectorMind retrieves relevant information from your custom documents in the right sidebar.
              </p>

              {/* Starter Prompt Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', textAlign: 'left' }}>
                <button
                  type="button"
                  onClick={() => handleSendMessage(undefined, 'Summarize the primary topics covered across the custom documents.')}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#0d0d0d',
                    border: '1px solid #262626',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#404040')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#262626')}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Summarize custom documents</div>
                  <div style={{ fontSize: '0.75rem', color: '#737373' }}>Extract key takeaways and themes</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage(undefined, 'What is dynamic programming and what are its core principles?')}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#0d0d0d',
                    border: '1px solid #262626',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#404040')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#262626')}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Explain algorithms & concepts</div>
                  <div style={{ fontSize: '0.75rem', color: '#737373' }}>Detailed algorithmic breakdowns</div>
                </button>
              </div>
            </div>
          ) : (
            /* Message List */
            messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    gap: '0.4rem',
                    width: '100%',
                  }}
                >
                  {/* Sender & Timestamp */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.725rem',
                      color: '#737373',
                      padding: '0 0.25rem',
                    }}
                  >
                    <span>{isUser ? 'You' : 'VectorMind AI'}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Bubble Box */}
                  {isUser ? (
                    /* User Message: Small Box in Black */
                    <div
                      style={{
                        maxWidth: '75%',
                        padding: '0.85rem 1.15rem',
                        borderRadius: '14px',
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #2b2b2b',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.45)',
                        color: '#ffffff',
                        fontSize: '0.9375rem',
                        lineHeight: 1.55,
                        wordBreak: 'break-word',
                      }}
                    >
                      {renderMessageContent(msg.content)}
                    </div>
                  ) : (
                    /* Assistant Message: Box in Pure White (#ffffff) */
                    <div
                      style={{
                        maxWidth: '82%',
                        padding: '1.15rem 1.4rem',
                        borderRadius: '14px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e4e4e7',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                        color: '#09090b',
                        fontSize: '0.9375rem',
                        lineHeight: 1.6,
                        wordBreak: 'break-word',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      {/* Box Header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingBottom: '0.5rem',
                          borderBottom: '1px solid #e4e4e7',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              backgroundColor: '#09090b',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Bot size={14} />
                          </div>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#09090b' }}>
                            VectorMind AI
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#71717a', fontFamily: 'monospace' }}>
                            {msg.model || selectedModel}
                          </span>
                        </div>

                        <button
                          onClick={() => handleCopyMessage(msg)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#71717a',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.4rem',
                            borderRadius: '4px',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#09090b')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
                          title="Copy response"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <Check size={13} style={{ color: '#16a34a' }} /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={13} /> Copy
                            </>
                          )}
                        </button>
                      </div>

                      {/* Message Text / Markdown Content */}
                      <div style={{ color: '#09090b' }}>{renderMessageContent(msg.content, true)}</div>

                      {/* Grounded Custom Document Citations in Light Theme */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div
                          style={{
                            marginTop: '0.25rem',
                            paddingTop: '0.65rem',
                            borderTop: '1px solid #e4e4e7',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                          }}
                        >
                          <div style={{ fontSize: '0.725rem', color: '#52525b', fontWeight: 600 }}>
                            Grounded in {msg.citations.length} document chunk{msg.citations.length > 1 ? 's' : ''}:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {msg.citations.map((c) => {
                              const isExpanded = expandedCitationId === c.id;
                              return (
                                <div
                                  key={c.id}
                                  onClick={() => setExpandedCitationId(isExpanded ? null : c.id)}
                                  style={{
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: '6px',
                                    backgroundColor: isExpanded ? '#e4e4e7' : '#f4f4f5',
                                    border: '1px solid #d4d4d8',
                                    fontSize: '0.725rem',
                                    color: '#09090b',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.2rem',
                                  }}
                                >
                                  <span style={{ fontWeight: 600 }}>📄 {c.title}</span>
                                  {isExpanded && (
                                    <div style={{ fontSize: '0.7rem', color: '#3f3f46', marginTop: '0.25rem', maxWidth: '340px', lineHeight: 1.4 }}>
                                      "{c.text}"
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isSubmitting && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a3a3a3', fontSize: '0.85rem' }}>
              <RefreshCw size={16} className="spinner" />
              <span>VectorMind is searching documents and generating response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Bottom: Pinned Prompt Composer Capsule ──────────────────── */}
        <div
          style={{
            padding: '1rem 1.5rem 1.5rem',
            backgroundColor: '#000000',
            maxWidth: '48rem',
            margin: '0 auto',
            width: '100%',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '0.65rem',
              backgroundColor: '#121212',
              border: '1px solid #2b2b2b',
              borderRadius: '24px',
              padding: '0.55rem 0.75rem 0.55rem 1rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
            }}
          >
            {/* Attachment Button -> Toggles Documents Sidebar */}
            <button
              type="button"
              onClick={() => setShowDocSidebar(true)}
              title="Add or inspect custom documents"
              style={{
                background: 'none',
                border: 'none',
                color: '#737373',
                cursor: 'pointer',
                padding: '0.4rem',
                display: 'flex',
                borderRadius: '50%',
                marginBottom: '0.2rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#737373')}
            >
              <Paperclip size={18} />
            </button>

            {/* Input Textarea */}
            <textarea
              ref={inputRef}
              rows={1}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or query your custom documents..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.9375rem',
                lineHeight: 1.5,
                outline: 'none',
                resize: 'none',
                maxHeight: '160px',
                padding: '0.35rem 0',
              }}
            />

            {/* Send or Stop Button */}
            {isSubmitting ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                title="Stop generation"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Square size={14} fill="#000000" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputPrompt.trim()}
                title="Send message (Enter)"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: inputPrompt.trim() ? 'var(--accent)' : 'var(--bg-surface-elevated)',
                  color: inputPrompt.trim() ? 'var(--accent-foreground)' : 'var(--text-muted)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: inputPrompt.trim() ? 'pointer' : 'not-allowed',
                  flexShrink: 0,
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                }}
              >
                <Send size={15} />
              </button>
            )}
          </div>

          <div
            style={{
              textAlign: 'center',
              fontSize: '0.7rem',
              color: '#525252',
              marginTop: '0.5rem',
            }}
          >
            VectorMind retrieves information from your custom documents to ground answers.
          </div>
        </div>
      </main>

      {/* ── Right Rail: Custom Documents & Knowledge Base ───────────── */}
      <DocumentSidebar
        isOpen={showDocSidebar}
        onClose={() => setShowDocSidebar(false)}
        onDocumentsChanged={refreshStatusAndDocs}
      />
    </div>
  );
};
