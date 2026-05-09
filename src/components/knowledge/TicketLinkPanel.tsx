import { useEffect, useState } from 'react'
import { Link2, Plus, Trash2, ExternalLink } from 'lucide-react'
import { kbTicketApi } from '../../api/knowledge'
import type { Article, LinkType, TicketArticleLink, TicketLink } from '../../types/knowledge'

// ── Article → Ticket links ────────────────────────────────────────────────────
interface ArticleTicketLinksProps {
  article: Article
  canEdit?: boolean
}

const LINK_TYPE_META: Record<LinkType, { label: string; cls: string }> = {
  related:      { label: 'Related',      cls: 'bg-blue-400/15 text-blue-400 border border-blue-400/30' },
  resolved_by:  { label: 'Resolved By',  cls: 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30' },
  referenced:   { label: 'Referenced',   cls: 'bg-slate-400/15 text-slate-400 border border-slate-400/30' },
}

export function ArticleTicketLinks({ article, canEdit = false }: ArticleTicketLinksProps) {
  const [links, setLinks]     = useState<TicketLink[]>([])
  const [loading, setLoading] = useState(false)
  const [ticketId, setTicketId] = useState('')
  const [linkType, setLinkType] = useState<LinkType>('related')
  const [adding, setAdding]   = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    setLoading(true)
    kbTicketApi.getLinksForArticle(article.id)
      .then(setLinks)
      .finally(() => setLoading(false))
  }, [article.id])

  const handleAdd = async () => {
    if (!ticketId.trim()) return
    setAdding(true)
    try {
      const link = await kbTicketApi.linkTicket(article.id, { ticket_id: ticketId.trim(), link_type: linkType })
      setLinks((l) => [...l, link])
      setTicketId('')
      setShowForm(false)
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (link: TicketLink) => {
    await kbTicketApi.unlinkTicket(article.id, link.ticket_id)
    setLinks((l) => l.filter((x) => x.id !== link.id))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold t-sub uppercase tracking-wider flex items-center gap-1.5">
          <Link2 size={12} /> Linked Tickets
          {links.length > 0 && <span className="px-1.5 py-0.5 rounded-full bg-indigo-400/15 text-indigo-400 text-[10px]">{links.length}</span>}
        </h4>
        {canEdit && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-semibold t-muted hover:text-indigo-400 transition-colors"
          >
            <Plus size={11} /> Link ticket
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <div className="glass-card rounded-xl p-3 space-y-2">
          <input
            className="glass-input w-full px-3 py-1.5 rounded-lg text-xs t-main"
            placeholder="Ticket UUID…"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <select
              className="glass-input flex-1 px-3 py-1.5 rounded-lg text-xs t-main"
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as LinkType)}
            >
              {(Object.keys(LINK_TYPE_META) as LinkType[]).map((t) => (
                <option key={t} value={t}>{LINK_TYPE_META[t].label}</option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={adding || !ticketId.trim()}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all"
            >
              {adding ? '…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs t-muted">Loading…</p>
      ) : links.length === 0 ? (
        <p className="text-xs t-muted">No linked tickets.</p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => {
            const meta = LINK_TYPE_META[link.link_type as LinkType]
            return (
              <div key={link.id} className="flex items-center justify-between glass-card rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${meta?.cls}`}>{meta?.label}</span>
                  <span className="text-xs font-mono t-muted truncate">{link.ticket_id}</span>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleRemove(link)}
                    className="p-1 t-muted hover:text-rose-400 transition-colors flex-shrink-0 ml-2"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Ticket → Article links (shown in ticket detail) ───────────────────────────
interface TicketArticleLinksProps {
  ticketId: string
  canEdit?: boolean
}

export function TicketArticleLinks({ ticketId, canEdit = false }: TicketArticleLinksProps) {
  const [links, setLinks]     = useState<TicketArticleLink[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    kbTicketApi.getArticlesForTicket(ticketId)
      .then(setLinks)
      .finally(() => setLoading(false))
  }, [ticketId])

  if (loading) return <p className="text-xs t-muted">Loading KB articles…</p>
  if (!links.length) return null

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold t-sub uppercase tracking-wider flex items-center gap-1.5">
        <Link2 size={12} /> Knowledge Base
      </h4>
      {links.map((link) => {
        const meta = LINK_TYPE_META[link.link_type as LinkType]
        return (
          <div key={link.link_id} className="flex items-center gap-2 glass-card rounded-lg px-3 py-2">
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold flex-shrink-0 ${meta?.cls}`}>{meta?.label}</span>
            <span className="text-xs t-main flex-1 truncate">{link.title}</span>
            <a
              href={`/knowledge/article/${link.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 flex-shrink-0"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        )
      })}
    </div>
  )
}
