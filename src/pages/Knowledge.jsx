import { useState, useRef, useEffect } from 'react'
import {
  BookOpen, Plus, Search, Globe, Lock, Users, UserCheck,
  Paperclip, Image as ImageIcon, Link2, X,
  Edit2, Trash2, ExternalLink, FileText,
} from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { useKnowledgeStore } from '../stores/knowledgeStore'
import { useUserStore } from '../stores/userStore'

// ── Constants ──────────────────────────────────────────────────────────────────

const VISIBILITY_OPTIONS = [
  {
    value: 'public',
    label: 'Public',
    icon: Globe,
    desc: 'Visible to everyone including end users',
    activeClass: 'border-indigo-400/60 bg-indigo-400/10',
    iconClass: 'bg-indigo-400/20 text-indigo-400',
    textClass: 'text-indigo-400',
  },
  {
    value: 'internal',
    label: 'Internal',
    icon: Lock,
    desc: 'Visible to staff members only',
    activeClass: 'border-amber-400/60 bg-amber-400/10',
    iconClass: 'bg-amber-400/20 text-amber-400',
    textClass: 'text-amber-400',
  },
  {
    value: 'agent_only',
    label: 'Agent Only',
    icon: UserCheck,
    desc: 'Visible to agents only',
    activeClass: 'border-violet-400/60 bg-violet-400/10',
    iconClass: 'bg-violet-400/20 text-violet-400',
    textClass: 'text-violet-400',
  },
  {
    value: 'customer_specific',
    label: 'Customer Specific',
    icon: Users,
    desc: 'Visible to specific customers',
    activeClass: 'border-teal-400/60 bg-teal-400/10',
    iconClass: 'bg-teal-400/20 text-teal-400',
    textClass: 'text-teal-400',
  },
]

const STATUS_STEPS = [
  { value: 'draft',     label: 'Draft',     cls: 'bg-slate-400/15 text-slate-400 border border-slate-400/30' },
  { value: 'review',    label: 'Review',    cls: 'bg-amber-400/15 text-amber-400 border border-amber-400/30' },
  { value: 'approved',  label: 'Approved',  cls: 'bg-blue-400/15 text-blue-400 border border-blue-400/30' },
  { value: 'published', label: 'Published', cls: 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30' },
  { value: 'archived',  label: 'Archived',  cls: 'bg-rose-400/15 text-rose-400 border border-rose-400/30' },
]

const VISIBILITY_BADGE = {
  public:            'bg-indigo-400/15 text-indigo-400 border border-indigo-400/30',
  internal:          'bg-amber-400/15 text-amber-400 border border-amber-400/30',
  agent_only:        'bg-violet-400/15 text-violet-400 border border-violet-400/30',
  customer_specific: 'bg-teal-400/15 text-teal-400 border border-teal-400/30',
}

const VISIBILITY_LABEL = {
  public: 'Public', internal: 'Internal', agent_only: 'Agent Only', customer_specific: 'Customer Specific',
}

const EMPTY = {
  title: '', topic: '', content: '', referenceUrl: '',
  attachments: [], images: [], visibility: 'public', status: 'draft',
}

// ── Article Modal ──────────────────────────────────────────────────────────────

function ArticleModal({ isOpen, onClose, onSave, article }) {
  const currentUser = useUserStore(s => s.currentUser)
  const [form, setForm] = useState({ ...EMPTY })
  const [errors, setErrors] = useState({})
  const [imgDrag, setImgDrag] = useState(false)
  const fileRef  = useRef()
  const imageRef = useRef()

  useEffect(() => {
    if (isOpen) {
      setForm(article ? { ...EMPTY, ...article } : { ...EMPTY })
      setErrors({})
    }
  }, [isOpen, article])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const readDataUrl = (file) =>
    new Promise(res => {
      const r = new FileReader()
      r.onload = e => res(e.target.result)
      r.readAsDataURL(file)
    })

  const handleAttachments = (files) => {
    const added = Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type }))
    set('attachments', [...form.attachments, ...added])
  }

  const handleImages = async (files) => {
    const added = []
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue
      const dataUrl = await readDataUrl(f)
      added.push({ name: f.name, dataUrl })
    }
    set('images', [...form.images, ...added])
  }

  const fmtSize = (b) =>
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    return e
  }

  const handleSave = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({ ...form, author: currentUser?.name || 'Unknown' })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={article ? 'Edit Article' : 'New Knowledge Article'}
      size="lg"
    >
      <div className="p-5 space-y-5">

        {/* ── Title ── */}
        <div>
          <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-1.5">
            Title <span className="text-rose-400">*</span>
          </label>
          <input
            className={`glass-input w-full px-3 py-2 rounded-lg text-sm t-main ${errors.title ? 'border-rose-400' : ''}`}
            placeholder="e.g. How to reset your password"
            value={form.title}
            onChange={e => { set('title', e.target.value); setErrors(x => ({ ...x, title: '' })) }}
          />
          {errors.title && <p className="text-xs text-rose-400 mt-1">{errors.title}</p>}
        </div>

        {/* ── Topic ── */}
        <div>
          <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-1.5">
            Topic / Category
          </label>
          <input
            className="glass-input w-full px-3 py-2 rounded-lg text-sm t-main"
            placeholder="e.g. Authentication, Networking, Hardware…"
            value={form.topic}
            onChange={e => set('topic', e.target.value)}
          />
        </div>

        {/* ── Content ── */}
        <div>
          <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-1.5">
            Content
          </label>
          <textarea
            className="glass-input w-full px-3 py-2 rounded-lg text-sm t-main resize-none"
            rows={6}
            placeholder="Write the article content, steps, or instructions here…"
            value={form.content}
            onChange={e => set('content', e.target.value)}
          />
        </div>

        {/* ── Reference URL ── */}
        <div>
          <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-1.5">
            Reference Article URL
          </label>
          <div className="relative">
            <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 t-muted" />
            <input
              className="glass-input w-full pl-9 pr-3 py-2 rounded-lg text-sm t-main"
              placeholder="https://docs.example.com/article"
              value={form.referenceUrl}
              onChange={e => set('referenceUrl', e.target.value)}
            />
          </div>
        </div>

        {/* ── Attachments + Images (two-col) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Attachments */}
          <div>
            <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-1.5">
              Attachments
            </label>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => handleAttachments(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-dashed t-muted hover:t-main hover:border-indigo-400 transition-all text-xs"
              style={{ borderColor: 'var(--c-border)' }}
            >
              <Paperclip size={14} />
              <span>Click to attach files</span>
            </button>
            {form.attachments.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {form.attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg glass-card">
                    <FileText size={12} className="t-muted flex-shrink-0" />
                    <span className="text-xs t-main flex-1 truncate">{a.name}</span>
                    <span className="text-[10px] t-muted flex-shrink-0">{fmtSize(a.size)}</span>
                    <button
                      type="button"
                      onClick={() => set('attachments', form.attachments.filter((_, j) => j !== i))}
                      className="t-muted hover:text-rose-400 transition-colors flex-shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Images */}
          <div>
            <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-1.5">
              Images
            </label>
            <input
              ref={imageRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={e => handleImages(e.target.files)}
            />
            <button
              type="button"
              onClick={() => imageRef.current.click()}
              onDragOver={e => { e.preventDefault(); setImgDrag(true) }}
              onDragLeave={() => setImgDrag(false)}
              onDrop={e => { e.preventDefault(); setImgDrag(false); handleImages(e.dataTransfer.files) }}
              className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-dashed transition-all text-xs ${
                imgDrag
                  ? 'border-indigo-400 bg-indigo-400/5 text-indigo-400'
                  : 't-muted hover:t-main hover:border-indigo-400'
              }`}
              style={imgDrag ? {} : { borderColor: 'var(--c-border)' }}
            >
              <ImageIcon size={14} />
              <span>{imgDrag ? 'Drop images here' : 'Click or drag images'}</span>
            </button>
            {form.images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-14 h-14 rounded-lg object-cover border"
                      style={{ borderColor: 'var(--c-border)' }}
                    />
                    <button
                      type="button"
                      onClick={() => set('images', form.images.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={8} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Visibility ── */}
        <div>
          <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-2">
            Visibility
          </label>
          <div className="grid grid-cols-2 gap-2">
            {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon, desc, activeClass, iconClass, textClass }) => (
              <button
                key={value}
                type="button"
                onClick={() => set('visibility', value)}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  form.visibility === value
                    ? activeClass
                    : 'glass-card hover:border-current/20'
                }`}
                style={form.visibility !== value ? { borderColor: 'var(--c-border)' } : {}}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  form.visibility === value ? iconClass : 'bg-black/5 dark:bg-white/5 t-muted'
                }`}>
                  <Icon size={14} />
                </div>
                <div>
                  <div className={`text-xs font-semibold ${form.visibility === value ? textClass : 't-main'}`}>
                    {label}
                  </div>
                  <div className="text-[10px] t-muted mt-0.5 leading-tight">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Actions ── */}
        <div
          className="flex items-center justify-end gap-3 pt-3"
          style={{ borderTop: '1px solid var(--c-border)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm t-muted hover:t-main transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-glow-indigo"
          >
            {article ? 'Save Changes' : 'Create Article'}
          </button>
        </div>

      </div>
    </Modal>
  )
}

// ── Article Card ───────────────────────────────────────────────────────────────

function ArticleCard({ article, onEdit, onDelete }) {
  const statusStep = STATUS_STEPS.find(s => s.value === article.status) || STATUS_STEPS[0]

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="glass-card rounded-xl p-4 hover:shadow-glass-lg transition-all">
      <div className="flex items-start gap-3">

        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <BookOpen size={16} className="text-indigo-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">

              {/* Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusStep.cls}`}>
                  {statusStep.label}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${VISIBILITY_BADGE[article.visibility]}`}>
                  {VISIBILITY_LABEL[article.visibility]}
                </span>
                {article.topic && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full t-muted"
                    style={{ background: 'var(--c-hover)' }}>
                    {article.topic}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold t-main mt-1.5 leading-snug">{article.title}</h3>

              {/* Content preview */}
              {article.content && (
                <p className="text-xs t-muted mt-1 line-clamp-2 leading-relaxed">{article.content}</p>
              )}

              {/* Meta row */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {article.referenceUrl && (
                  <a
                    href={article.referenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-indigo-400 hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink size={10} />
                    Reference link
                  </a>
                )}
                {article.attachments?.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] t-muted">
                    <Paperclip size={10} />
                    {article.attachments.length} file{article.attachments.length !== 1 ? 's' : ''}
                  </span>
                )}
                {article.images?.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] t-muted">
                    <ImageIcon size={10} />
                    {article.images.length} image{article.images.length !== 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-[10px] t-muted">
                  By {article.author} · {fmtDate(article.createdAt)}
                </span>
              </div>

              {/* Image thumbnails */}
              {article.images?.length > 0 && (
                <div className="flex gap-2 mt-2.5 flex-wrap">
                  {article.images.slice(0, 5).map((img, i) => (
                    <img
                      key={i}
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-12 h-12 rounded-lg object-cover"
                      style={{ border: '1px solid var(--c-border)' }}
                    />
                  ))}
                  {article.images.length > 5 && (
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-xs t-muted font-medium glass-card"
                    >
                      +{article.images.length - 5}
                    </div>
                  )}
                </div>
              )}

              {/* Attachment list */}
              {article.attachments?.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {article.attachments.map((att, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 text-[10px] t-muted px-2 py-1 rounded-lg glass-card"
                    >
                      <FileText size={10} />
                      {att.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={onEdit}
                className="p-2 rounded-lg t-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                title="Edit article"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={onDelete}
                className="p-2 rounded-lg t-muted hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                title="Delete article"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Knowledge Page ─────────────────────────────────────────────────────────────

export default function Knowledge() {
  const { articles, addArticle, updateArticle, deleteArticle } = useKnowledgeStore()
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState('')
  const [visFilter, setVisFilter]         = useState('')
  const [showModal, setShowModal]         = useState(false)
  const [editing, setEditing]             = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const filtered = articles.filter(a => {
    if (statusFilter && a.status !== statusFilter) return false
    if (visFilter    && a.visibility !== visFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        a.title.toLowerCase().includes(q) ||
        (a.topic  || '').toLowerCase().includes(q) ||
        (a.content || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const stats = {
    total:     articles.length,
    published: articles.filter(a => a.status === 'published').length,
    review:    articles.filter(a => a.status === 'review').length,
    draft:     articles.filter(a => a.status === 'draft').length,
  }

  const handleSave = (data) => {
    if (editing) updateArticle(editing.id, data)
    else         addArticle(data)
    setEditing(null)
  }

  const openEdit = (article) => { setEditing(article); setShowModal(true) }
  const openNew  = () => { setEditing(null); setShowModal(true) }

  const confirmDelete = (id) => setDeleteConfirm(id)
  const doDelete = () => { deleteArticle(deleteConfirm); setDeleteConfirm(null) }

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold t-main">Knowledge Base</h1>
          <p className="text-sm t-muted mt-0.5">Articles, guides, and FAQs</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-glow-indigo flex-shrink-0"
        >
          <Plus size={16} />
          New Article
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Articles', value: stats.total,     color: 'text-indigo-400' },
          { label: 'Published',      value: stats.published, color: 'text-emerald-400' },
          { label: 'In Review',      value: stats.review,    color: 'text-amber-400' },
          { label: 'Drafts',         value: stats.draft,     color: 'text-slate-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card rounded-xl p-4">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs t-muted mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 t-muted" />
          <input
            className="glass-input w-full pl-9 pr-3 py-2 rounded-lg text-sm t-main"
            placeholder="Search articles…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="glass-input px-3 py-2 rounded-lg text-sm t-main"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUS_STEPS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          className="glass-input px-3 py-2 rounded-lg text-sm t-main"
          value={visFilter}
          onChange={e => setVisFilter(e.target.value)}
        >
          <option value="">All Visibility</option>
          {VISIBILITY_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
      </div>

      {/* ── Article list ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BookOpen size={48} className="t-muted opacity-20 mb-4" />
          <p className="text-sm font-semibold t-main">
            {articles.length === 0 ? 'No articles yet' : 'No articles match your filters'}
          </p>
          <p className="text-xs t-muted mt-1">
            {articles.length === 0
              ? 'Click "New Article" to create your first knowledge base article.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {articles.length === 0 && (
            <button
              onClick={openNew}
              className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-glow-indigo"
            >
              <Plus size={14} />
              Create First Article
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(article => (
            <ArticleCard
              key={article.id}
              article={article}
              onEdit={() => openEdit(article)}
              onDelete={() => confirmDelete(article.id)}
            />
          ))}
        </div>
      )}

      {/* ── Article modal ── */}
      <ArticleModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSave={handleSave}
        article={editing}
      />

      {/* ── Delete confirmation modal ── */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Article"
        size="sm"
      >
        <div className="p-5">
          <p className="text-sm t-muted mb-5">
            Are you sure you want to delete this article? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-4 py-2 rounded-lg text-sm t-muted hover:t-main transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={doDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-all"
            >
              Delete Article
            </button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
