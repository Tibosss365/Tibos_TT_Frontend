import { useEffect, useState } from 'react'
import { FileText, Loader2, Search, X } from 'lucide-react'
import { useEmailStore } from '../../stores/emailStore'
import type { EmailTemplate } from '../../types/email'

interface Props {
  onSelect: (template: EmailTemplate, rendered: { subject: string; body_html: string }) => void
  onClose: () => void
}

export function TemplateSelector({ onSelect, onClose }: Props) {
  const { templates, templatesLoading, fetchTemplates } = useEmailStore()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [applying, setApplying] = useState<string | null>(null)

  useEffect(() => { fetchTemplates() }, [])

  const categories = [...new Set(templates.map((t) => t.category))].sort()

  const filtered = templates.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase())
    const matchCat = !selectedCategory || t.category === selectedCategory
    return matchSearch && matchCat
  })

  const handleApply = async (tmpl: EmailTemplate) => {
    setApplying(tmpl.id)
    try {
      // Simple variable substitution with defaults
      let subject = tmpl.subject
      let bodyHtml = tmpl.body_html
      for (const v of tmpl.variables) {
        const val = v.default || `{{${v.name}}}`
        subject = subject.replace(`{{${v.name}}}`, val)
        bodyHtml = bodyHtml.replace(`{{${v.name}}}`, val)
      }
      onSelect(tmpl, { subject, body_html: bodyHtml })
    } finally {
      setApplying(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--c-border)' }}>
        <p className="text-sm font-semibold t-main">Choose a Template</p>
        <button onClick={onClose} className="t-muted hover:t-main transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Search + filter */}
      <div className="px-4 py-2 space-y-2" style={{ borderBottom: '1px solid var(--c-border)' }}>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 t-muted" />
          <input
            className="glass-input w-full pl-8 pr-3 py-1.5 rounded-lg text-sm t-main"
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        {categories.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-2.5 py-1 rounded-full text-xs transition-all ${!selectedCategory ? 'bg-indigo-600 text-white' : 'glass-card t-muted hover:t-main'}`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-xs transition-all capitalize ${selectedCategory === cat ? 'bg-indigo-600 text-white' : 'glass-card t-muted hover:t-main'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {templatesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin t-muted" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText size={32} className="t-muted opacity-20 mb-3" />
            <p className="text-sm t-muted">No templates found</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--c-border)' }}>
            {filtered.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => handleApply(tmpl)}
                disabled={applying === tmpl.id}
                className="w-full text-left px-4 py-3 hover:bg-white/5 transition-all disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium t-main truncate">{tmpl.name}</p>
                    <p className="text-xs t-muted mt-0.5 truncate">{tmpl.subject}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full glass-card t-muted capitalize">{tmpl.category}</span>
                      {tmpl.use_count > 0 && (
                        <span className="text-[10px] t-muted">Used {tmpl.use_count}×</span>
                      )}
                    </div>
                  </div>
                  {applying === tmpl.id && <Loader2 size={14} className="animate-spin t-muted flex-shrink-0" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
