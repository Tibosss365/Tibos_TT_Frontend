import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, Clock, Edit2, ExternalLink,
  Eye, Globe, History, ThumbsDown, ThumbsUp, Trash2,
} from 'lucide-react'
import { useKnowledgeStore } from '../../stores/knowledgeStore'
import { useUserStore } from '../../stores/userStore'
import { kbArticleApi } from '../../api/knowledge'
import { ArticleEditor } from '../../components/knowledge/ArticleEditor'
import { VersionHistory } from '../../components/knowledge/VersionHistory'
import { ArticleTicketLinks } from '../../components/knowledge/TicketLinkPanel'
import { Modal } from '../../components/ui/Modal'
import { STATUS_META, VISIBILITY_META } from '../../types/knowledge'
import type { Article, ArticleCreate, ArticleTranslation, ArticleUpdate } from '../../types/knowledge'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function ArticleDetail() {
  const { slug }    = useParams<{ slug: string }>()
  const navigate    = useNavigate()
  const { currentUser } = useUserStore() as any
  const isStaff     = currentUser?.role !== 'user'
  const isAdmin     = currentUser?.role === 'admin'

  const { activeArticle, activeLoading, fetchArticleBySlug, updateArticle, deleteArticle, categories } = useKnowledgeStore()

  const [language, setLanguage]           = useState(currentUser?.language ?? 'en')
  const [editorOpen, setEditorOpen]       = useState(false)
  const [historyOpen, setHistoryOpen]     = useState(false)
  const [deleteOpen, setDeleteOpen]       = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [feedbackSent, setFeedbackSent]   = useState(false)

  useEffect(() => {
    if (slug) fetchArticleBySlug(slug)
  }, [slug])

  const article: Article | null = activeArticle?.slug === slug ? activeArticle : null

  const activeTrans: ArticleTranslation | undefined =
    article?.translations.find((t) => t.language === language) ??
    article?.translations.find((t) => t.language === article.default_language) ??
    article?.translations[0]

  const canEdit = isStaff && (
    isAdmin || article?.author_id === currentUser?.id
  )

  const handleSave = async (data: ArticleCreate | ArticleUpdate) => {
    if (article) {
      await updateArticle(article.id, data as ArticleUpdate)
      setEditorOpen(false)
    }
  }

  const handleDelete = async () => {
    if (!article) return
    setDeleting(true)
    try { await deleteArticle(article.id); navigate('/knowledge') }
    finally { setDeleting(false) }
  }

  const sendFeedback = async (helpful: boolean) => {
    if (!article || feedbackSent) return
    await kbArticleApi.feedback(article.id, { is_helpful: helpful })
    setFeedbackSent(true)
  }

  if (activeLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 glass-card rounded-xl animate-pulse" />
        <div className="h-64 glass-card rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!article || !activeTrans) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <BookOpen size={48} className="t-muted opacity-20 mb-4" />
        <p className="text-sm t-main font-semibold">Article not found</p>
        <button onClick={() => navigate('/knowledge')} className="mt-4 text-indigo-400 text-sm hover:underline">
          ← Back to Knowledge Base
        </button>
      </div>
    )
  }

  const statusMeta = STATUS_META[article.status]
  const visMeta    = VISIBILITY_META[article.visibility]

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

      {/* ── Breadcrumb / Back ── */}
      <button
        onClick={() => navigate('/knowledge')}
        className="flex items-center gap-2 text-sm t-muted hover:t-main transition-colors"
      >
        <ArrowLeft size={14} /> Knowledge Base
      </button>

      {/* ── Article header ── */}
      <div className="glass-card rounded-2xl p-6 space-y-4">

        {/* Meta badges + actions row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusMeta.cls}`}>
              {statusMeta.label}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${visMeta.cls}`}>
              {visMeta.label}
            </span>
            {article.category && (
              <span className="px-2.5 py-1 rounded-full text-xs t-muted glass-card">
                {article.category.translations.find((t) => t.language === language)?.name ??
                 article.category.translations[0]?.name}
              </span>
            )}
            {article.tags.map((tag) => (
              <span key={tag.id} className="px-2.5 py-1 rounded-full text-xs t-muted" style={{ background: 'var(--c-hover)', color: tag.color ?? undefined }}>
                {tag.name}
              </span>
            ))}
          </div>

          {/* Language selector */}
          {article.translations.length > 1 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Globe size={12} className="t-muted" />
              <select
                className="glass-input text-xs px-2 py-1 rounded-lg t-main"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {article.translations.map((t) => (
                  <option key={t.language} value={t.language}>{t.language.toUpperCase()}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold t-main leading-snug">{activeTrans.title}</h1>

        {/* Sub-meta */}
        <div className="flex items-center gap-4 flex-wrap text-xs t-muted">
          <span className="flex items-center gap-1">
            <Eye size={12} /> {article.view_count.toLocaleString()} views
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> {fmtDate(article.updated_at)}
          </span>
          {article.author && (
            <span>By <span className="t-main font-medium">{article.author.name}</span></span>
          )}
          {article.reference_url && (
            <a
              href={article.reference_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-indigo-400 hover:underline"
            >
              <ExternalLink size={11} /> Reference
            </a>
          )}
        </div>

        {/* Staff actions */}
        {canEdit && (
          <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--c-border)' }}>
            <button
              onClick={() => setEditorOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold t-muted hover:t-main glass-card transition-all"
            >
              <Edit2 size={13} /> Edit
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold t-muted hover:t-main glass-card transition-all"
            >
              <History size={13} /> {article.version_count} Version{article.version_count !== 1 ? 's' : ''}
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold t-muted hover:text-rose-400 hover:bg-rose-400/10 transition-all ml-auto"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* ── Article content ── */}
      <div className="glass-card rounded-2xl p-6">
        <div className="prose prose-sm dark:prose-invert max-w-none t-main leading-relaxed whitespace-pre-wrap text-sm">
          {activeTrans.content}
        </div>
      </div>

      {/* ── Ticket links (staff) ── */}
      {isStaff && (
        <div className="glass-card rounded-2xl p-5">
          <ArticleTicketLinks article={article} canEdit={canEdit} />
        </div>
      )}

      {/* ── Feedback ── */}
      <div className="glass-card rounded-2xl p-5 text-center space-y-3">
        <p className="text-sm font-semibold t-main">Was this article helpful?</p>
        {feedbackSent ? (
          <p className="text-sm t-muted">Thanks for your feedback!</p>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => sendFeedback(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card t-muted hover:text-emerald-400 hover:bg-emerald-400/10 transition-all text-sm font-medium"
            >
              <ThumbsUp size={16} />
              Yes ({article.helpful_yes})
            </button>
            <button
              onClick={() => sendFeedback(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card t-muted hover:text-rose-400 hover:bg-rose-400/10 transition-all text-sm font-medium"
            >
              <ThumbsDown size={16} />
              No ({article.helpful_no})
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <ArticleEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
        article={article}
        categories={categories}
        availableTags={article.tags}
      />

      <VersionHistory
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        article={article}
        language={language}
      />

      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Article" size="sm">
        <div className="p-5">
          <p className="text-sm t-muted mb-5">
            Permanently delete <span className="font-semibold t-main">"{activeTrans.title}"</span>? This cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <button onClick={() => setDeleteOpen(false)} className="px-4 py-2 rounded-lg text-sm t-muted hover:t-main transition-colors">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold transition-all"
            >
              {deleting ? 'Deleting…' : 'Delete Article'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
