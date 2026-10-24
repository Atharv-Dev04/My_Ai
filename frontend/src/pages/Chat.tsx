import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  BookOpen,
  AlertCircle,
  Plus,
  RefreshCw,
  X,
  Info,
} from 'lucide-react';
import {
  ragAsk,
  type ContextChunk,
} from '../api/client';
import { Button } from '../components/common/Button';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: ContextChunk[];
  model?: string;
  hasNoContext?: boolean;
}

export const ChatPage: React.FC = () => {
  // Chat message state (local memory conversation session)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [topK, setTopK] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [, setError] = useState<string | null>(null);

  // Selected citation for context inspection drawer
  const [inspectCitation, setInspectCitation] = useState<ContextChunk | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSubmitting]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = inputPrompt.trim();
    if (!prompt || isSubmitting) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await ragAsk(prompt, topK);
      const assistantMessage: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'assistant',
        content: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: response.contexts,
        model: response.model,
        hasNoContext: response.contexts.length === 0,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to generate RAG response';
      setError(msg);
      // Append error message from assistant
      const errorResponse: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'assistant',
        content: `Error: ${msg}. Please ensure Ollama is running and has required models pulled (e.g. nomic-embed-text, llama3.2).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setError(null);
    setInputPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 120px)', minHeight: '520px' }}>
      {/* ── Conversation Sidebar (Honest In-Memory State) ─────────────── */}
      <aside
        className="glass-panel"
        style={{
          width: '260px',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            RAG Chat
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleNewConversation}
            aria-label="Start new conversation"
            style={{ padding: '0.3rem 0.6rem' }}
          >
            <Plus size={14} /> New
          </Button>
        </div>

        {/* Persistence Architecture Notice */}
        <div
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-surface-hover)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            <Info size={12} />
            <strong style={{ fontSize: '0.7rem' }}>Session Scope</strong>
          </div>
          Conversations are active in local React memory. Multi-session chat history will activate upon PostgreSQL conversation persistence.
        </div>

        {/* Retrieval Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Retrieval Budget</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
            <span>Context Chunks (k):</span>
            <select
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
              }}
            >
              <option value={1}>1 chunk</option>
              <option value={3}>3 chunks (default)</option>
              <option value={5}>5 chunks</option>
              <option value={8}>8 chunks</option>
            </select>
          </div>

          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Model: <code>llama3.2</code> (Ollama)
          </div>
        </div>
      </aside>

      {/* ── Main Chat Conversation Pane ──────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        {/* Messages Scroll Area */}
        <div
          className="solid-panel"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            marginBottom: '1rem',
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                margin: 'auto',
                textAlign: 'center',
                maxWidth: '28rem',
                padding: '2rem 1rem',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <Bot size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Grounded Retrieval-Augmented Chat
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Ask questions against your DocumentDB knowledge repository. Answers are synthesized by local Ollama models using retrieved context chunks with full source attribution.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setInputPrompt('What is dynamic programming and when is it used?');
                  }}
                >
                  "What is dynamic programming?"
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setInputPrompt('Summarize the primary algorithms used in the vector engine.');
                  }}
                >
                  "Summarize vector algorithms"
                </Button>
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
                  maxWidth: msg.sender === 'user' ? '80%' : '90%',
                }}
              >
                {msg.sender === 'assistant' && (
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
                      flexShrink: 0,
                      marginTop: '0.15rem',
                    }}
                  >
                    <Bot size={18} />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div
                    style={{
                      padding: '0.85rem 1.15rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor:
                        msg.sender === 'user' ? 'var(--accent)' : 'var(--bg-surface-hover)',
                      color:
                        msg.sender === 'user' ? 'var(--accent-foreground)' : 'var(--text-primary)',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      border: msg.sender === 'assistant' ? '1px solid var(--border-subtle)' : 'none',
                    }}
                  >
                    {msg.content}
                  </div>

                  {/* Retrieved Evidence Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        marginTop: '0.25rem',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          marginBottom: '0.4rem',
                        }}
                      >
                        <BookOpen size={13} />
                        <span>Retrieved Evidence ({msg.citations.length} sources)</span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {msg.citations.map((cite) => (
                          <button
                            key={cite.id}
                            onClick={() => setInspectCitation(cite)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.25rem 0.55rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--bg-surface-hover)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-secondary)',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{cite.title}</span>
                            {cite.page_number && <span style={{ color: 'var(--text-muted)' }}>p.{cite.page_number}</span>}
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              (d={cite.distance.toFixed(3)})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Honest No Evidence Warning */}
                  {msg.hasNoContext && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--warning)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.3rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--warning-bg)',
                      }}
                    >
                      <AlertCircle size={13} />
                      <span>No matching document chunks met the cosine distance threshold (≤ 0.7).</span>
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      padding: '0 0.25rem',
                    }}
                  >
                    {msg.timestamp} {msg.model && `• ${msg.model}`}
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
                      marginTop: '0.15rem',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <User size={18} />
                  </div>
                )}
              </div>
            ))
          )}

          {isSubmitting && (
            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', color: 'var(--text-secondary)' }}>
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
                }}
              >
                <Bot size={18} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Retrieving context & generating answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Message Composer ─────────────────────────────────────────── */}
        <form onSubmit={handleSendMessage} style={{ position: 'relative' }}>
          <textarea
            ref={inputRef}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question against indexed documents (Press Enter to send, Shift+Enter for newline)..."
            rows={2}
            style={{
              width: '100%',
              padding: '0.75rem 3.5rem 0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
            }}
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isSubmitting}
            aria-label="Send message"
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'var(--accent)',
              color: 'var(--accent-foreground)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '0.45rem',
              cursor: !inputPrompt.trim() || isSubmitting ? 'not-allowed' : 'pointer',
              opacity: !inputPrompt.trim() || isSubmitting ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* ── Slide-Over Citation Inspection Modal ─────────────────────── */}
      {inspectCitation && (
        <div
          role="dialog"
          aria-label="Citation Details"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
              maxWidth: '38rem',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>
                  SOURCE CITATION • CHUNK #{inspectCitation.id}
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--text-primary)' }}>
                  {inspectCitation.title}
                </h3>
              </div>
              <button
                onClick={() => setInspectCitation(null)}
                aria-label="Close modal"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
              <div style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)' }}>
                <strong>Distance: </strong> {inspectCitation.distance.toFixed(4)}
              </div>
              {inspectCitation.page_number && (
                <div style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)' }}>
                  <strong>Page: </strong> {inspectCitation.page_number}
                </div>
              )}
              <div style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)' }}>
                <strong>Position: </strong> #{inspectCitation.chunk_index}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
                Retrieved Chunk Content (Used by LLM Context)
              </div>
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  maxHeight: '250px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {inspectCitation.text}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
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
