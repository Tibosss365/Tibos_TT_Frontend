import { useEffect, useState } from 'react'
import {
  Archive, Inbox, Loader2, Mail, Plus, RefreshCw,
  Search, Sparkles, Star, Trash2,
} from 'lucide-react'
import { useEmailStore } from '../../stores/emailStore'
import { ThreadList } from '../../components/email/ThreadList'
import { ThreadView } from '../../components/email/ThreadView'
import { EmailComposer } from '../../components/email/EmailComposer'
import { AIPanel } from '../../components/email/AIPanel'
import { AccountSetupModal } from '../../components/email/AccountSetupModal'
import type { EmailMessage, EmailThread, ThreadFilters } from '../../types/email'

type Mailbox = 'inbox' | 'starred' | 'archived' | 'spam'

const MAILBOX_FILTERS: Record<Mailbox, Partial<ThreadFilters>> = {
  inbox:    { is_archived: false, is_spam: false },
  starred:  { is_starred: true },
  archived: { is_archived: true },
  spam:     { is_spam: true },
}

const MAILBOX_META: Record<Mailbox, { label: string; icon: React.ReactNode }> = {
  inbox:    { label: 'Inbox',    icon: <Inbox size={15} /> },
  starred:  { label: 'Starred',  icon: <Star size={15} /> },
  archived: { label: 'Archived', icon: <Archive size={15} /> },
  spam:     { label: 'Spam',     icon: <Trash2 size={15} /> },
}

export default function EmailPage() {
  const {
    accounts, accountsLoading,
    threads, threadsLoading,
    activeThread, activeMessages, messagesLoading,
    composerOpen, replyToMessage,
    fetchAccounts, fetchThreads,
    selectThread, updateThread,
    openComposer, closeComposer,
    triggerFetch, error, clearError,
  } = useEmailStore()

  const [mailbox, setMailbox] = useState<Mailbox>('inbox')
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAI, setShowAI] = useState(false)
  const [aiTargetMsg, setAiTargetMsg] = useState<EmailMessage | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showAccountSetup, setShowAccountSetup] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    if (accounts.length && !selectedAccountId) {
      const def = accounts.find((a) => a.is_default) || accounts[0]
      setSelectedAccountId(def.id)
    }
  }, [accounts])

  useEffect(() => {
    loadThreads()
  }, [mailbox, selectedAccountId, searchQuery])

  const loadThreads = () => {
    fetchThreads({
      ...MAILBOX_FILTERS[mailbox],
      account_id: selectedAccountId,
      search: searchQuery || undefined,
    })
  }

  const handleRefresh = async () => {
    if (!selectedAccountId) return
    setRefreshing(true)
    try {
      await triggerFetch(selectedAccountId)
      await loadThreads()
    } finally {
      setRefreshing(false)
    }
  }

  const handleSelectThread = (thread: EmailThread) => {
    selectThread(thread)
    setShowAI(false)
    setAiTargetMsg(null)
  }

  const handleReply = (msg: EmailMessage) => {
    openComposer(msg)
  }

  const handleForward = (msg: EmailMessage) => {
    openComposer(msg)
  }

  const handleArchive = () => {
    if (!activeThread) return
    updateThread(activeThread.id, { is_archived: !activeThread.is_archived })
  }

  const handleStar = () => {
    if (!activeThread) return
    updateThread(activeThread.id, { is_starred: !activeThread.is_starred })
  }

  const handleOpenAI = (msg: EmailMessage) => {
    setAiTargetMsg(msg)
    setShowAI(true)
  }

  const handleInsertSuggestion = (text: string) => {
    openComposer(aiTargetMsg || undefined)
    // The composer will open; user pastes — could be enhanced further
  }

  return (
    <div className="flex h-full min-h-0">

      {/* ── Left: Accounts + Mailbox nav ── */}
      <aside
        className="hidden lg:flex flex-col w-52 flex-shrink-0 p-3 space-y-4"
        style={{ borderRight: '1px solid var(--c-border)' }}
      >
        {/* Account selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold t-sub uppercase tracking-widest">Accounts</p>
            <button onClick={() => setShowAccountSetup(true)} title="Add email account" className="text-indigo-500 hover:text-indigo-400 transition-colors">
              <Plus size={14} />
            </button>
          </div>
          {accounts.map((acct) => (
            <button
              key={acct.id}
              onClick={() => setSelectedAccountId(acct.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs transition-all ${
                selectedAccountId === acct.id
                  ? 'bg-indigo-500/15 text-indigo-400 font-semibold'
                  : 't-muted hover:t-main hover:bg-white/5'
              }`}
            >
              <Mail size={13} />
              <span className="truncate">{acct.name}</span>
            </button>
          ))}
          {accounts.length === 0 && !accountsLoading && (
            <button onClick={() => setShowAccountSetup(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs border border-dashed border-indigo-500/40 text-indigo-500 hover:bg-indigo-500/5 transition-all">
              <Plus size={13} /> Connect inbox
            </button>
          )}
        </div>

        {/* Mailbox nav */}
        <div className="space-y-0.5">
          {(Object.keys(MAILBOX_META) as Mailbox[]).map((mb) => (
            <button
              key={mb}
              onClick={() => setMailbox(mb)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-all ${
                mailbox === mb
                  ? 'bg-indigo-500/15 text-indigo-400 font-semibold'
                  : 't-muted hover:t-main hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                {MAILBOX_META[mb].icon}
                {MAILBOX_META[mb].label}
              </div>
              {mb === 'inbox' && threads.total > 0 && (
                <span className="text-[10px] bg-indigo-600 text-white rounded-full px-1.5 py-0.5 font-bold">
                  {threads.total > 99 ? '99+' : threads.total}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Compose button */}
        <button
          onClick={() => openComposer()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-glow-indigo"
        >
          <Plus size={14} /> Compose
        </button>
      </aside>

      {/* ── Thread list ── */}
      <div
        className="w-72 flex-shrink-0 flex flex-col min-h-0"
        style={{ borderRight: '1px solid var(--c-border)' }}
      >
        {/* Search + refresh */}
        <div className="p-3 space-y-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 t-muted" />
            <input
              className="glass-input w-full pl-8 pr-3 py-2 rounded-xl text-sm t-main"
              placeholder="Search emails…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs t-muted capitalize">{mailbox} · {threads.total} thread{threads.total !== 1 ? 's' : ''}</span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 rounded-lg t-muted hover:t-main transition-all disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          <ThreadList
            threads={threads.items}
            activeId={activeThread?.id}
            onSelect={handleSelectThread}
            loading={threadsLoading}
          />
        </div>

        {/* Pagination */}
        {threads.pages > 1 && (
          <div className="p-2 flex items-center justify-center gap-2" style={{ borderTop: '1px solid var(--c-border)' }}>
            <span className="text-xs t-muted">Page {threads.page} of {threads.pages}</span>
          </div>
        )}
      </div>

      {/* ── Thread view ── */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {activeThread ? (
          <ThreadView
            thread={activeThread}
            messages={activeMessages}
            loading={messagesLoading}
            onReply={handleReply}
            onForward={handleForward}
            onArchive={handleArchive}
            onStar={handleStar}
            onOpenAIPanel={handleOpenAI}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Mail size={48} className="t-muted opacity-15 mb-4" />
            <p className="text-sm font-semibold t-main">Select a conversation</p>
            <p className="text-xs t-muted mt-1">Choose an email thread to view messages.</p>
            {accounts.length === 0 && !accountsLoading && (
              <button onClick={() => setShowAccountSetup(true)} className="mt-3 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5">
                <Plus size={13} /> Connect an inbox
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── AI Panel ── */}
      {showAI && activeThread && (
        <aside
          className="hidden xl:flex flex-col w-72 flex-shrink-0"
          style={{ borderLeft: '1px solid var(--c-border)' }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--c-border)' }}>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-400" />
              <p className="text-sm font-semibold t-main">AI Assist</p>
            </div>
            <button onClick={() => setShowAI(false)} className="t-muted hover:t-main transition-colors text-xs">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AIPanel
              thread={activeThread}
              activeMessage={aiTargetMsg}
              onInsertSuggestion={handleInsertSuggestion}
            />
          </div>
        </aside>
      )}

      {/* ── Add Email Account ── */}
      {showAccountSetup && (
        <AccountSetupModal
          onClose={() => setShowAccountSetup(false)}
          onSaved={() => { fetchAccounts() }}
        />
      )}

      {/* ── Email Composer (floating) ── */}
      {composerOpen && (
        <EmailComposer
          thread={activeThread || undefined}
          replyTo={replyToMessage || undefined}
          onClose={closeComposer}
          defaultAccountId={selectedAccountId}
        />
      )}

      {/* ── Error toast ── */}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 glass-card rounded-xl px-4 py-3 text-sm text-rose-400 flex items-center gap-3 shadow-glass-lg">
          {error}
          <button onClick={clearError} className="t-muted hover:t-main text-xs">Dismiss</button>
        </div>
      )}
    </div>
  )
}
