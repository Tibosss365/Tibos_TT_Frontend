import { useEffect, useRef, useState } from 'react'
import {
  ChevronRight, FileText, Globe, Image as ImageIcon, Link2,
  Lock, Paperclip, Plus, UserCheck, Users, X,
} from 'lucide-react'
import { Modal } from '../ui/Modal'
import type { Article, ArticleCreate, ArticleStatus, ArticleUpdate, ArticleVisibility, Category, Tag, TranslationInput } from '../../types/knowledge'
import { STATUS_META } from '../../types/knowledge'

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_STEPS: ArticleStatus[] = ['draft', 'review', 'approved', 'published', 'archived']

const VISIBILITY_OPTIONS: {
  value: ArticleVisibility; label: string; icon: typeof Globe; desc: string
  activeClass: string; iconClass: string; textClass: string
}[] = [
  { value: 'public',            label: 'Public',            icon: Globe,       desc: 'Visible to everyone',         activeClass: 'border-indigo-400/60 bg-indigo-400/10',  iconClass: 'bg-indigo-400/20 text-indigo-400',  textClass: 'text-indigo-400' },
  { value: 'internal',          label: 'Internal',          icon: Lock,        desc: 'Staff members only',          activeClass: 'border-amber-400/60 bg-amber-400/10',    iconClass: 'bg-amber-400/20 text-amber-400',    textClass: 'text-amber-400' },
  { value: 'agent_only',        label: 'Agent Only',        icon: UserCheck,   desc: 'Agents only',                 activeClass: 'border-violet-400/60 bg-violet-400/10',  iconClass: 'bg-violet-400/20 text-violet-400',  textClass: 'text-violet-400' },
  { value: 'customer_specific', label: 'Customer Specific', icon: Users,       desc: 'Specific customers',          activeClass: 'border-teal-400/60 bg-teal-400/10',      iconClass: 'bg-teal-400/20 text-teal-400',      textClass: 'text-teal-400' },
]

// ── Types ─────────────────────────────────────────────────────────────────────
interface EditorForm {
  slug: string
  status: ArticleStatus
  visibility: ArticleVisibility
  default_language: string
  reference_url: string
  category_id: string
  tag_ids: string[]
  change_summary: string
  translations: (TranslationInput & { _key: string })[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ArticleCreate | ArticleUpdate) => Promise<void>
  article?: Article | null
  categories: Category[]
  availableTags: Tag[]
}

const EMPTY_FORM: EditorForm = {
  slug: '', status: 'draft', visibility: 'public', default_language: 'en',
  reference_url: '', category_id: '', tag_ids: [], change_summary: '',
  translations: [{ _key: 'en', language: 'en', title: '', content: '', excerpt: '' }],
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[-\s]+/g, '-')
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ArticleEditor({ isOpen, onClose, onSave, article, categories, availableTags }: Props) {
  const [form, setForm]           = useState<EditorForm>({ ...EMPTY_FORM })
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [saving, setSaving]       = useState(false)
  const [activeLang, setActiveLang] = useState('en')
  const [imgDrag, setImgDrag]     = useState(false)
  const fileRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    if (article) {
      setForm({
        slug: article.slug,
        status: article.status,
        visibility: article.visibility,
        default_language: article.default_language,
        reference_url: article.reference_url ?? '',
        category_id: article.category_id ?? '',
        tag_ids: article.tags.map((t) => t.id),
        change_summary: '',
        translations: article.translations.map((t) => ({
          _key: t.language, language: t.language, title: t.title, content: t.content, excerpt: t.excerpt ?? '',
        })),
      })
      setActiveLang(article.default_language)
    } else {
      setForm({ ...EMPTY_FORM })
      setActiveLang('en')
    }
    setErrors({})
  }, [isOpen, article])

  const setF = <K extends keyof EditorForm>(key: K, val: EditorForm[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const activeTrans = form.translations.find((t) => t.language === activeLang) ?? form.translations[0]

  const setTransField = (field: keyof Omit<TranslationInput, 'language'>, val: string) => {
    setForm((f) => ({
      ...f,
      translations: f.translations.map((t) =>
        t.language === activeLang ? { ...t, [field]: val } : t
      ),
    }))
    if (field === 'title' && !article) setF('slug', slugify(val))
  }

  const addLanguage = (lang: string) => {
    if (!form.translations.find((t) => t.language === lang)) {
      setF('translations', [...form.translations, { _key: lang, language: lang, title: '', content: '', excerpt: '' }])
    }
    setActiveLang(lang)
  }

  const removeLang = (lang: string) => {
    if (form.translations.length <= 1) return
    setF('translations', form.translations.filter((t) => t.language !== lang))
    if (activeLang === lang) setActiveLang(form.translations[0].language)
  }

  const toggleTag = (id: string) =>
    setF('tag_ids', form.tag_ids.includes(id) ? form.tag_ids.filter((t) => t !== id) : [...form.tag_ids, id])

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.slug.trim()) e.slug = 'Slug is required'
    if (!activeTrans?.title.trim()) e.title = 'Title is required'
    if (!activeTrans?.content.trim()) e.content = 'Content is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload: ArticleCreate = {
        slug: form.slug,
        status: form.status,
        visibility: form.visibility,
        default_language: form.default_language,
        reference_url: form.reference_url || undefined,
        category_id: form.category_id || undefined,
        tag_ids: form.tag_ids,
        change_summary: form.change_summary || undefined,
        translations: form.translations.map(({ language, title, content, excerpt }) => ({
          language, title, content, excerpt: excerpt || undefined,
        })),
      }
      await onSave(payload)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const LANG_OPTIONS = ['en', 'fr', 'de', 'es', 'pt', 'it', 'ar', 'hi', 'zh', 'ja']
  const usedLangs = new Set(form.translations.map((t) => t.language))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={article ? 'Edit Article' : 'New Article'} size="xl" fillHeight>
      <div className="flex flex-col h-full">

        {/* ── Status pipeline ── */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setF('status', s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    form.status === s ? STATUS_META[s].cls : 'border border-transparent t-muted hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {STATUS_META[s].label}
                </button>
                {i < STATUS_STEPS.length - 1 && <ChevronRight size={11} className="t-muted opacity-30 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Language tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {form.translations.map((t) => (
              <div key={t._key} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setActiveLang(t.language)}
                  className={`px-3 py-1 rounded-l-lg text-xs font-medium transition-all border-r-0 ${
                    activeLang === t.language
                      ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-400/40'
                      : 't-muted glass-card hover:t-main'
                  }`}
                >
                  {t.language.toUpperCase()}
                </button>
                {form.translations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLang(t.language)}
                    className="p-1 rounded-r-lg glass-card t-muted hover:text-rose-400 transition-colors"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
            <select
              className="glass-input text-xs px-2 py-1 rounded-lg t-muted"
              value=""
              onChange={(e) => { if (e.target.value) addLanguage(e.target.value) }}
            >
              <option value="">+ Add language</option>
              {LANG_OPTIONS.filter((l) => !usedLangs.has(l)).map((l) => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-1.5">
              Title ({activeLang.toUpperCase()}) <span className="text-rose-400">*</span>
            </label>
            <input
              className={`glass-input w-full px-3 py-2 rounded-lg text-sm t-main ${errors.title ? 'border-rose-400' : ''}`}
              placeholder="Article title…"
              value={activeTrans?.title ?? ''}
              onChange={(e) => setTransField('title', e.target.value)}
            />
            {errors.title && <p className="text-xs text-rose-400 mt-1">{errors.title}</p>}
          </div>

          {/* Slug + Category row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-1.5">
                Slug <span className="text-rose-400">*</span>
              </label>
              <input
                className={`glass-input w-full px-3 py-2 rounded-lg text-sm t-main font-mono ${errors.slug ? 'border-rose-400' : ''}`}
                placeholder="url-friendly-slug"
                value={form.slug}
                onChange={(e) => setF('slug', slugify(e.target.value))}
              />
              {errors.slug && <p className="text-xs text-rose-400 mt-1">{errors.slug}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-1.5">Category</label>
              <select
                className="glass-input w-full px-3 py-2 rounded-lg text-sm t-main"
                value={form.category_id}
                onChange={(e) => setF('category_id', e.target.value)}
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.translations[0]?.name ?? c.slug}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-1.5">Excerpt / Summary</label>
            <textarea
              className="glass-input w-full px-3 py-2 rounded-lg text-sm t-main resize-none"
              rows={2}
              placeholder="Short summary shown in search results and listings…"
              value={activeTrans?.excerpt ?? ''}
              onChange={(e) => setTransField('excerpt', e.target.value)}
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-1.5">
              Content ({activeLang.toUpperCase()}) <span className="text-rose-400">*</span>
            </label>
            <textarea
              className={`glass-input w-full px-3 py-2 rounded-lg text-sm t-main resize-none font-mono leading-relaxed ${errors.content ? 'border-rose-400' : ''}`}
              rows={10}
              placeholder="Write your article content here…"
              value={activeTrans?.content ?? ''}
              onChange={(e) => setTransField('content', e.target.value)}
            />
            {errors.content && <p className="text-xs text-rose-400 mt-1">{errors.content}</p>}
          </div>

          {/* Reference URL */}
          <div>
            <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-1.5">Reference URL</label>
            <div className="relative">
              <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 t-muted" />
              <input
                className="glass-input w-full pl-9 pr-3 py-2 rounded-lg text-sm t-main"
                placeholder="https://docs.example.com/…"
                value={form.reference_url}
                onChange={(e) => setF('reference_url', e.target.value)}
              />
            </div>
          </div>

          {/* Tags */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const active = form.tag_ids.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                        active ? 'bg-indigo-500/15 text-indigo-400 border-indigo-400/40' : 'glass-card t-muted border-transparent'
                      }`}
                    >
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Visibility */}
          <div>
            <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-2">Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon, desc, activeClass, iconClass, textClass }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setF('visibility', value)}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    form.visibility === value ? activeClass : 'glass-card'
                  }`}
                  style={form.visibility !== value ? { borderColor: 'var(--c-border)' } : {}}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    form.visibility === value ? iconClass : 'bg-black/5 dark:bg-white/5 t-muted'
                  }`}>
                    <Icon size={14} />
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${form.visibility === value ? textClass : 't-main'}`}>{label}</div>
                    <div className="text-[10px] t-muted mt-0.5 leading-tight">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Change summary */}
          <div>
            <label className="block text-xs font-semibold t-sub uppercase tracking-wider mb-1.5">Change Summary</label>
            <input
              className="glass-input w-full px-3 py-2 rounded-lg text-sm t-main"
              placeholder="What changed? (e.g. Fixed broken steps, Added screenshots)"
              value={form.change_summary}
              onChange={(e) => setF('change_summary', e.target.value)}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderTop: '1px solid var(--c-border)' }}
        >
          <p className="text-[10px] t-muted">* Required fields</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm t-muted hover:t-main transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-glow-indigo"
            >
              {saving ? 'Saving…' : article ? 'Save Changes' : 'Create Article'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
