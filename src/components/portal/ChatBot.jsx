import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, ChevronDown, Loader2, MessageCircle,
  Paperclip, Send, X, ExternalLink,
} from 'lucide-react'
import { useKnowledgeStore } from '../../stores/knowledgeStore'

// ── Bot message factory ────────────────────────────────────────────────────────
function botMsg(text, extras = {}) {
  return { from: 'bot', text, ts: Date.now(), ...extras }
}
function userMsg(text) {
  return { from: 'user', text, ts: Date.now() }
}

const GREET = botMsg(
  "Hi! 👋 I'm your support assistant. Ask me anything — I'll search the Knowledge Base, and if I can't help, I'll get you to the right person.",
  { quick: ['How do I reset my password?', 'Track my ticket', 'Submit a new ticket'] }
)

export function ChatBot() {
  const navigate = useNavigate()
  const { fetchArticles, articles } = useKnowledgeStore()

  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState([GREET])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread]   = useState(0)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mark unread when closed and bot adds a message
  useEffect(() => {
    if (!open) setUnread(n => n + 0) // reset handled in handleOpen
  }, [messages.length]) // eslint-disable-line

  const handleOpen = () => {
    setOpen(true)
    setUnread(0)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const push = (msg) => setMessages(m => [...m, msg])

  const searchKB = async (query) => {
    setLoading(true)
    try {
      await fetchArticles({ search: query, page: 1, page_size: 4, language: 'en' })
      const hits = useKnowledgeStore.getState().articles.slice(0, 4)
      return hits
    } catch {
      return []
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (text) => {
    const q = (text || input).trim()
    if (!q) return
    setInput('')
    push(userMsg(q))

    // Special intents
    const lower = q.toLowerCase()
    if (lower.includes('new ticket') || lower.includes('submit') || lower.includes('create ticket')) {
      setTimeout(() => {
        push(botMsg("I'll open the ticket form for you right now.", {
          action: { label: 'Open Ticket Form', fn: () => navigate('/tickets/new') }
        }))
      }, 400)
      return
    }
    if (lower.includes('track') || lower.includes('my ticket') || lower.includes('status')) {
      setTimeout(() => {
        push(botMsg("You can see all your tickets and their live status here.", {
          action: { label: 'My Tickets', fn: () => navigate('/tickets/my-portal') }
        }))
      }, 400)
      return
    }

    // KB search
    setLoading(true)
    const hits = await searchKB(q)
    setLoading(false)

    if (hits.length > 0) {
      push(botMsg(
        `I found ${hits.length} article${hits.length > 1 ? 's' : ''} that might help:`,
        {
          articles: hits,
          quick: ["That didn't help, I need more assistance", 'Submit a new ticket'],
        }
      ))
    } else {
      push(botMsg(
        "I couldn't find a matching article. Would you like to submit a support ticket?",
        {
          quick: ['Yes, create a ticket', 'Try a different question'],
          action: { label: 'Create Ticket', fn: () => navigate('/tickets/new') }
        }
      ))
    }
  }

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-glow-indigo flex items-center justify-center transition-all"
        aria-label="Open support chat"
      >
        <MessageCircle size={24} className="text-white" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col rounded-2xl shadow-glass-lg animate-fade-in overflow-hidden"
          style={{ height: '520px', border: '1px solid var(--c-border)', background: 'var(--c-card-bg)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 bg-indigo-600">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <MessageCircle size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Support Assistant</p>
              <p className="text-[10px] text-indigo-200">Powered by Knowledge Base</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] space-y-2`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.from === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'glass-card t-main rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>

                  {/* Article results */}
                  {msg.articles?.length > 0 && (
                    <div className="space-y-1.5">
                      {msg.articles.map((art) => (
                        <button
                          key={art.id}
                          onClick={() => navigate(`/knowledge/article/${art.slug}`)}
                          className="w-full flex items-start gap-2 px-3 py-2 glass-card rounded-xl text-left hover:bg-white/5 transition-all"
                        >
                          <BookOpen size={13} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold t-main truncate">{art.title}</p>
                            {art.category && (
                              <p className="text-[10px] t-muted mt-0.5">{art.category?.translations?.[0]?.name || ''}</p>
                            )}
                          </div>
                          <ExternalLink size={11} className="text-indigo-400 flex-shrink-0 mt-0.5 ml-auto" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action button */}
                  {msg.action && (
                    <button
                      onClick={msg.action.fn}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
                    >
                      {msg.action.label}
                    </button>
                  )}

                  {/* Quick replies */}
                  {msg.quick && i === messages.length - 1 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {msg.quick.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleSend(q)}
                          className="px-2.5 py-1 rounded-full text-[11px] border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 transition-all"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="glass-card px-4 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-indigo-400" />
                  <span className="text-xs t-muted">Searching…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-3 py-3" style={{ borderTop: '1px solid var(--c-border)' }}>
            <div className="flex items-center gap-2 glass-input rounded-xl px-3 py-2">
              <input
                ref={inputRef}
                className="flex-1 bg-transparent text-sm t-main outline-none"
                placeholder="Ask a question…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors"
              >
                <Send size={15} />
              </button>
            </div>
            <p className="text-[10px] t-muted text-center mt-2">
              Can't find your answer?{' '}
              <button onClick={() => navigate('/tickets/new')} className="text-indigo-400 hover:underline">
                Submit a ticket
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
