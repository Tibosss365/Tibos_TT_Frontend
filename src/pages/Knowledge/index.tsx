import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Plus, BarChart3, Filter } from 'lucide-react'
import { useKnowledgeStore } from '../../stores/knowledgeStore'
import { useUserStore } from '../../stores/userStore'
import { ArticleCard } from '../../components/knowledge/ArticleCard'
import { ArticleEditor } from '../../components/knowledge/ArticleEditor'
import { CategoryTree } from '../../components/knowledge/CategoryTree'
import { SearchBar } from '../../components/knowledge/SearchBar'
import { Modal } from '../../components/ui/Modal'
import type { Article, ArticleCreate, ArticleFilters, ArticleListItem, ArticleStatus, ArticleUpdate } from '../../types/knowledge'
import { STATUS_META, VISIBILITY_META } from '../../types/knowledge'

const PAGE_SIZE = 20

export default function KnowledgePage() {
  const navigate  = useNavigate()
  const { currentUser } = useUserStore() as any
  const isStaff   = currentUser?.role !== 'user'
  const isAdmin   = currentUser?.role === 'admin'

  const {
    articles, pagination, articlesLoading,
    categories, categoriesLoading,
    fetchArticles, fetchCategories,
    createArticle, updateArticle, deleteArticle,
    error, clearError,
  } = useKnowledgeStore()

  // ── Filters ──────────────────────────────────────────────────────────────
  const [categoryId, setCategoryId]     = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | ''>('')
  const [language, setLanguage]         = useState('en')
  const [page, setPage]                 = useState(1)
  const [showFilters, setShowFilters]   = useState(false)

  // ── Modals ───────────────────────────────────────────────────────────────
  const [editorOpen, setEditorOpen]     = useState(false)
  const [editing, setEditing]           = useState<Article | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ArticleListItem | null>(null)
  const [deleting, setDeleting]         = useState(false)

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => { fetchCategories() }, [])

  useEffect(() => {
    const filters: ArticleFilters = {
      language,
      page,
      page_size: PAGE_SIZE,
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    }
    fetchArticles(filters)
  }, [categoryId, statusFilter, language, page])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Total',     value: pagination.total,                                                     color: 'text-indigo-400' },
    { label: 'Published', value: articles.filter((a) => a.status === 'published').length,              color: 'text-emerald-400' },
    { label: 'In Review', value: articles.filter((a) => a.status === 'review').length,                 color: 'text-amber-400' },
    { label: 'Drafts',    value: articles.filter((a) => a.status === 'draft').length,                  color: 'text-slate-400' },
  ]

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openNew = () => { setEditing(null); setEditorOpen(true) }

  const openEdit = (article: ArticleListItem) => {
    // Load full article then open editor
    useKnowledgeStore.getState().fetchArticle(article.id).then(() => {
      setEditing(useKnowledgeStore.getState().activeArticle)
      setEditorOpen(true)
    })
  }

  const handleSave = async (data: ArticleCreate | ArticleUpdate) => {
    if (editing) await updateArticle(editing.id, data as ArticleUpdate)
    else         await createArticle(data as ArticleCreate)
    setEditorOpen(false)
    setEditing(null)
    fetchArticles({ language, page, page_size: PAGE_SIZE })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteArticle(deleteTarget.id) }
    finally { setDeleting(false); setDeleteTarget(null) }
  }

  const handleSelectHit = (hit: any) => navigate(`/knowledge/article/${hit.slug}`)

  const totalPages = pagination.pages || 1

  return (
    <div className="flex h-full min-h-0">

      {/* ── Sidebar: category tree ── */}
      {isStaff && (
        <aside
          className="hidden lg:flex flex-col w-56 flex-shrink-0 p-4 space-y-3 overflow-y-auto"
          style={{ borderRight: '1px solid var(--c-border)' }}
        >
          <p className="text-[10px] font-semibold t-sub uppercase tracking-widest">Categories</p>
          {categoriesLoading ? (
            <p className="text-xs t-muted">Loading…</p>
          ) : (
            <CategoryTree
              categories={categories}
              selectedId={categoryId}
              onSelect={(id) => { setCategoryId(id); setPage(1) }}
              language={language}
            />
          )}
        </aside>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 p-6 space-y-5 overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold t-main">Knowledge Base</h1>
            <p className="text-sm t-muted mt-0.5">Articles, guides, and FAQs</p>
          </div>
          {isStaff && (
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-glow-indigo flex-shrink-0"
            >
              <Plus size={16} /> New Article
            </button>
          )}
        </div>

        {/* Stats */}
        {isStaff && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map(({ label, value, color }) => (
              <div key={label} className="glass-card rounded-xl p-4">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs t-muted mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search + filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <SearchBar
              language={language}
              categoryId={categoryId ?? undefined}
              onSelectHit={handleSelectHit}
              onViewAll={(q) => navigate(`/knowledge/search?q=${encodeURIComponent(q)}`)}
            />
          </div>
          {isStaff && (
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all glass-card ${showFilters ? 'text-indigo-400' : 't-muted hover:t-main'}`}
            >
              <Filter size={14} /> Filters
            </button>
          )}
        </div>

        {/* Filter row */}
        {showFilters && isStaff && (
          <div className="flex flex-wrap items-center gap-3 glass-card rounded-xl p-3">
            <select
              className="glass-input px-3 py-2 rounded-lg text-sm t-main"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1) }}
            >
              <option value="">All Statuses</option>
              {(Object.keys(STATUS_META) as ArticleStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
            <select
              className="glass-input px-3 py-2 rounded-lg text-sm t-main"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {['en','fr','de','es','pt','it','ar','hi'].map((l) => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass-card rounded-xl px-4 py-3 text-sm text-rose-400 flex items-center justify-between">
            {error}
            <button onClick={clearError} className="t-muted hover:t-main transition-colors text-xs">Dismiss</button>
          </div>
        )}

        {/* Article list */}
        {articlesLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BookOpen size={48} className="t-muted opacity-20 mb-4" />
            <p className="text-sm font-semibold t-main">No articles found</p>
            <p className="text-xs t-muted mt-1">Try adjusting your filters or create a new article.</p>
            {isStaff && (
              <button
                onClick={openNew}
                className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all"
              >
                <Plus size={14} /> Create First Article
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onView={() => navigate(`/knowledge/article/${article.slug}`)}
                onEdit={() => openEdit(article)}
                onDelete={() => setDeleteTarget(article)}
                canEdit={isStaff}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg text-sm t-muted glass-card disabled:opacity-40 hover:t-main transition-all"
            >
              ← Prev
            </button>
            <span className="text-xs t-muted">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg text-sm t-muted glass-card disabled:opacity-40 hover:t-main transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Article editor modal ── */}
      <ArticleEditor
        isOpen={editorOpen}
        onClose={() => { setEditorOpen(false); setEditing(null) }}
        onSave={handleSave}
        article={editing}
        categories={categories}
        availableTags={[]}
      />

      {/* ── Delete confirmation ── */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Article" size="sm">
        <div className="p-5">
          <p className="text-sm t-muted mb-1">
            Delete <span className="font-semibold t-main">"{deleteTarget?.title}"</span>?
          </p>
          <p className="text-xs t-muted mb-5">This will permanently remove the article and all its versions.</p>
          <div className="flex items-center justify-end gap-3">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm t-muted hover:t-main transition-colors">
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold transition-all"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
