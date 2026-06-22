import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, AlertTriangle, Info, ClipboardList, AlertOctagon, Paperclip, X, FileText, Image as ImageIcon, BookOpen, ExternalLink, Lightbulb, LayoutTemplate } from 'lucide-react'
import { useTicketStore } from '../stores/ticketStore'
import { useUserStore } from '../stores/userStore'
import { useUiStore } from '../stores/uiStore'
import { useAdminStore } from '../stores/adminStore'
import { useKnowledgeStore } from '../stores/knowledgeStore'
import { useFeatureStore } from '../stores/featureStore'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PRIORITIES } from '../utils/ticketUtils'
import TagsInput from '../components/tickets/TagsInput'
import DuplicateWarning from '../components/tickets/DuplicateWarning'

const EMPTY = { company: '', contactName: '', email: '', phone: '', subject: '', category: '', priority: 'medium', description: '', asset: '', group_id: '', type: 'request', assignee: '' }
// priority is overridden by ticketSettings.defaultPriority on mount (see useState below)

const TICKET_TYPE_CONFIG = {
  request:  {
    icon: ClipboardList,
    label: 'Request',
    desc: 'Service request, access, installation, or general help',
    active: 'bg-blue-500/15 border-blue-500/50 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/40',
    inactive: 'bg-black/5 dark:bg-white/3 border-glass t-muted hover:bg-black/10 dark:hover:bg-white/8',
  },
  incident: {
    icon: AlertOctagon,
    label: 'Incident',
    desc: 'Something is broken or causing disruption right now',
    active: 'bg-rose-500/15 border-rose-500/50 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/40',
    inactive: 'bg-black/5 dark:bg-white/3 border-glass t-muted hover:bg-black/10 dark:hover:bg-white/8',
  },
}

const PRIORITY_UI = {
  critical: { border: 'border-rose-500/40',   text: 'text-rose-600 dark:text-rose-400',   bg: 'bg-rose-500/10',   ring: 'ring-rose-500/50' },
  high:     { border: 'border-orange-500/40', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', ring: 'ring-orange-500/50' },
  medium:   { border: 'border-amber-500/40',  text: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-500/10',  ring: 'ring-amber-500/50' },
  low:      { border: 'border-slate-500/40',  text: 't-muted',  bg: 'bg-slate-500/10',  ring: 'ring-slate-500/50' },
}

// ── Smart KB suggestions sidebar ─────────────────────────────────────────────
function KbSuggestions({ subject, description }) {
  const { fetchArticles } = useKnowledgeStore()
  const [hits, setHits]   = useState([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)
  const navigate = useNavigate()

  const query = [subject, description].filter(Boolean).join(' ').trim()

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (query.length < 5) { setHits([]); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        await fetchArticles({ search: query, page: 1, page_size: 4, language: 'en' })
        setHits(useKnowledgeStore.getState().articles.slice(0, 4))
      } finally {
        setLoading(false)
      }
    }, 600)
    return () => clearTimeout(timerRef.current)
  }, [query])

  if (!query || query.length < 5) return null

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={14} className="text-amber-400 flex-shrink-0" />
        <span className="text-xs font-bold t-sub uppercase tracking-wider">Similar Articles</span>
        {loading && <span className="ml-auto text-[10px] t-muted animate-pulse">Searching…</span>}
      </div>

      {!loading && hits.length === 0 && query.length >= 5 && (
        <p className="text-xs t-muted">No matching KB articles found.</p>
      )}

      {hits.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] t-muted mb-2">These articles may already answer your question:</p>
          {hits.map(art => (
            <button
              key={art.id}
              type="button"
              onClick={() => navigate(`/knowledge/article/${art.slug}`)}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-glass bg-black/3 dark:bg-white/3 text-left hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all group"
            >
              <BookOpen size={13} className="text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold t-main group-hover:text-indigo-400 transition-colors truncate">{art.title}</p>
                {art.category && (
                  <p className="text-[10px] t-muted mt-0.5">
                    {art.category?.translations?.[0]?.name || ''}
                  </p>
                )}
              </div>
              <ExternalLink size={11} className="text-indigo-400 opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5 transition-opacity" />
            </button>
          ))}
          <p className="text-[10px] t-muted pt-1">
            If none of these help, continue filling the form below.
          </p>
        </div>
      )}
    </Card>
  )
}

export default function NewTicket() {
  const { addTicket } = useTicketStore()
  const { currentUser } = useUserStore()
  const { addToast } = useUiStore()
  const { slaSettings, categories, groups, agents, ticketSettings, ticketTemplates, customFields } = useAdminStore()
  const navigate = useNavigate()

  const isEndUser = currentUser?.role === 'user'

  // Pre-select the admin-configured default priority
  const defaultPriority = ticketSettings?.defaultPriority || 'medium'

  // Auto-fill contact info for end users from their profile
  const userEmail = isEndUser && currentUser?.username?.includes('@') ? currentUser.username : ''

  const [form, setForm] = useState({
    ...EMPTY,
    priority:    defaultPriority,
    contactName: currentUser?.name || '',
    email:       userEmail,
    company:     isEndUser ? '' : 'Acme Corp',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [attachments, setAttachments] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef()
  const [customFieldValues, setCustomFieldValues] = useState({})
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [tags, setTags] = useState([])
  const [duplicates, setDuplicates] = useState([])
  const [dupDismissed, setDupDismissed] = useState(false)

  const { checkDuplicate } = useFeatureStore()

  // Debounce duplicate check on subject change
  const dupTimer = useRef(null)
  const checkDuplicates = (subject) => {
    clearTimeout(dupTimer.current)
    setDupDismissed(false)
    if (subject.length < 8) { setDuplicates([]); return }
    dupTimer.current = setTimeout(async () => {
      const results = await checkDuplicate(subject)
      setDuplicates(results || [])
    }, 800)
  }

  const fmtSize = (b) =>
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`

  const addFiles = (files) => {
    const incoming = Array.from(files).filter(f => f.size <= 10 * 1024 * 1024) // 10 MB limit
    setAttachments(prev => {
      const existing = new Set(prev.map(f => f.name + f.size))
      return [...prev, ...incoming.filter(f => !existing.has(f.name + f.size))]
    })
  }

  const removeAttachment = (idx) => setAttachments(prev => prev.filter((_, i) => i !== idx))

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!isEndUser && !form.company.trim()) errs.company = 'Required'
    if (!form.contactName.trim()) errs.contactName = 'Required'
    if (!isEndUser && !form.email.trim())   errs.email   = 'Required'
    if (!form.subject.trim())     errs.subject     = 'Required'
    if (!form.description.trim()) errs.description = 'Required'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    setSubmitError('')
    try {
      await addTicket({ ...form, attachments, tags, customFieldData: customFieldValues })
      addToast('Ticket Submitted', 'success')
      navigate(isEndUser ? '/tickets/my-portal' : '/tickets/mine')
    } catch (err) {
      const msg = err.message || 'Failed to submit ticket'
      setSubmitError(msg)
      addToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = (key) => `glass-input w-full text-sm ${errors[key] ? 'border-rose-500 text-rose-600 dark:text-rose-400 focus:border-rose-500' : ''}`
  const labelCls = 'block text-xs font-bold t-sub uppercase tracking-wider mb-1'

  return (
    <div className="w-full space-y-2 animate-fade-in">
      <div className="pb-0.5">
        <h1 className="text-xl font-bold t-main">Submit New Ticket</h1>
        <p className="text-sm t-muted mt-0.5">Fill in the details below to create a support request</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Main form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-3">

          {/* Template selector */}
          {!isEndUser && ticketTemplates && ticketTemplates.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-2">
                <LayoutTemplate size={14} className="text-indigo-400" />
                <span className="text-xs font-bold t-main uppercase tracking-wider">Use a Template</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="glass-input flex-1 text-sm"
                  value={selectedTemplate}
                  onChange={e => {
                    const tpl = ticketTemplates.find(t => t.id === e.target.value)
                    setSelectedTemplate(e.target.value)
                    if (tpl) {
                      setForm(f => ({
                        ...f,
                        subject:     tpl.subject || f.subject,
                        description: tpl.description || f.description,
                        priority:    tpl.priority || f.priority,
                        type:        tpl.type || f.type,
                        category:    tpl.category || f.category,
                      }))
                    }
                  }}
                >
                  <option value="">— Select a template —</option>
                  {ticketTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {selectedTemplate && (
                  <button type="button" onClick={() => setSelectedTemplate('')} className="text-[11px] t-muted hover:text-rose-400 transition-colors px-2 py-1 rounded-lg border border-glass">
                    Clear
                  </button>
                )}
              </div>
            </Card>
          )}

          {/* Ticket Type */}
          <Card>
            <CardHeader title="Ticket Type" />
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TICKET_TYPE_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon
                const active = form.type === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set('type', key)}
                    className={`flex items-start gap-2.5 px-3 py-2 rounded-xl border text-left transition-all ${active ? cfg.active : cfg.inactive}`}
                  >
                    <Icon size={18} className={`mt-0.5 flex-shrink-0 ${active ? '' : 't-sub'}`} />
                    <div>
                      <div className="text-sm font-bold">{cfg.label}</div>
                      <div className={`text-xs mt-0.5 leading-snug ${active ? 'opacity-80' : 't-muted'}`}>{cfg.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Contact info — simplified for end users */}
          <Card>
            <CardHeader title="Contact Information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {!isEndUser && (
                <div>
                  <label className={labelCls}>Company *</label>
                  <input className={inputCls('company')} value={form.company} onChange={e => set('company', e.target.value)} placeholder="Acme Corp" />
                  {errors.company && <p className="text-xs text-rose-500 mt-1">{errors.company}</p>}
                </div>
              )}
              <div>
                <label className={labelCls}>Your Name *</label>
                <input
                  className={inputCls('contactName')}
                  value={form.contactName}
                  onChange={e => set('contactName', e.target.value)}
                  placeholder="Full name"
                  readOnly={isEndUser}
                />
                {errors.contactName && <p className="text-xs text-rose-500 mt-1">{errors.contactName}</p>}
              </div>
              {!isEndUser && (
                <div>
                  <label className={labelCls}>Email *</label>
                  <input type="email" className={inputCls('email')} value={form.email} onChange={e => set('email', e.target.value)} placeholder="user@company.com" />
                  {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email}</p>}
                </div>
              )}
              <div>
                <label className={labelCls}>Phone</label>
                <input className={inputCls('phone')} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
              </div>
            </div>
          </Card>

          {/* Ticket details */}
          <Card>
            <CardHeader title="Ticket Details" />
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Subject *</label>
                <input
                  className={inputCls('subject')}
                  value={form.subject}
                  onChange={e => { set('subject', e.target.value); checkDuplicates(e.target.value) }}
                  placeholder="Brief description of the issue"
                />
                {errors.subject && <p className="text-xs text-rose-500 mt-1">{errors.subject}</p>}
                {duplicates.length > 0 && !dupDismissed && (
                  <div className="mt-2">
                    <DuplicateWarning
                      duplicates={duplicates}
                      onDismiss={() => setDupDismissed(true)}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Group / Team</label>
                  <select className="glass-input w-full text-sm" value={form.group_id} onChange={e => { set('group_id', e.target.value); set('category', '') }}>
                    <option value="">— Select Group —</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Category</label>
                  <select className="glass-input w-full text-sm" value={form.category} onChange={e => set('category', e.target.value)}>
                    <option value="">— Select Category —</option>
                    {(form.group_id
                      ? [...categories].filter(c => c.groupId === form.group_id)
                      : [...categories]
                    ).sort((a, b) => a.sortOrder - b.sortOrder).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Asset / Device</label>
                  <input className="glass-input w-full text-sm" value={form.asset} onChange={e => set('asset', e.target.value)} placeholder="e.g. LAPTOP-042" />
                </div>
                {!isEndUser && (
                  <div>
                    <label className={labelCls}>Assign To</label>
                    <select className="glass-input w-full text-sm" value={form.assignee} onChange={e => set('assignee', e.target.value)}>
                      <option value="">— Unassigned —</option>
                      {agents.filter(a => a.id !== 'unassigned').map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Custom fields for selected category */}
              {form.category && customFields && (customFields[form.category] || []).length > 0 && (
                <div className="space-y-2.5 pt-1 border-t border-glass">
                  <div className="text-[10px] font-bold t-sub uppercase tracking-wider">Additional Fields</div>
                  {(customFields[form.category] || []).map(field => (
                    <div key={field.id}>
                      <label className={labelCls}>{field.name}{field.required && ' *'}</label>
                      {field.type === 'textarea' ? (
                        <textarea
                          className="glass-input w-full text-sm resize-none"
                          rows={3}
                          value={customFieldValues[field.id] || ''}
                          onChange={e => setCustomFieldValues(v => ({ ...v, [field.id]: e.target.value }))}
                          placeholder={field.placeholder || ''}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          className="glass-input w-full text-sm"
                          value={customFieldValues[field.id] || ''}
                          onChange={e => setCustomFieldValues(v => ({ ...v, [field.id]: e.target.value }))}
                        >
                          <option value="">— Select —</option>
                          {(field.options || '').split('\n').filter(Boolean).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!customFieldValues[field.id]}
                            onChange={e => setCustomFieldValues(v => ({ ...v, [field.id]: e.target.checked }))}
                            className="w-4 h-4 rounded accent-indigo-500"
                          />
                          <span className="text-xs t-muted">{field.placeholder || field.name}</span>
                        </label>
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          className="glass-input w-full text-sm"
                          value={customFieldValues[field.id] || ''}
                          onChange={e => setCustomFieldValues(v => ({ ...v, [field.id]: e.target.value }))}
                          placeholder={field.placeholder || ''}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Priority selector */}
              <div>
                <label className={labelCls}>Priority</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRIORITIES.map(p => {
                    const ui = PRIORITY_UI[p]
                    const active = form.priority === p
                    return (
                      <button key={p} type="button" onClick={() => set('priority', p)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${active ? `${ui.bg} ${ui.border} ${ui.text} ring-1 ${ui.ring}` : 'bg-black/5 dark:bg-white/3 border-glass t-muted hover:bg-black/10 dark:hover:bg-white/8 hover:t-main'}`}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  Description * <span className="t-sub font-normal">({form.description.length}/2000)</span>
                </label>
                <textarea
                  className={`${inputCls('description')} resize-none leading-relaxed`}
                  rows={4}
                  value={form.description}
                  onChange={e => set('description', e.target.value.slice(0, 2000))}
                  placeholder="Please describe the issue in detail. Include error messages, steps to reproduce, and any troubleshooting already attempted."
                />
                {errors.description && <p className="text-xs text-rose-500 mt-1">{errors.description}</p>}
              </div>

              {/* Tags */}
              <div>
                <label className={labelCls}>Tags <span className="t-sub font-normal normal-case tracking-normal">(optional)</span></label>
                <TagsInput tags={tags} onChange={setTags} placeholder="Add tags…" />
              </div>

              {/* Attachments */}
              <div>
                <label className={labelCls}>
                  Attachments <span className="t-sub font-normal normal-case tracking-normal">(optional · max 10 MB each)</span>
                </label>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={e => { addFiles(e.target.files); e.target.value = '' }}
                />

                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
                  className={`flex flex-col items-center justify-center gap-1.5 px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all select-none ${
                    dragOver
                      ? 'border-indigo-400 bg-indigo-400/8 text-indigo-400'
                      : 'border-glass t-muted hover:border-indigo-400/50 hover:bg-black/5 dark:hover:bg-white/3 hover:t-main'
                  }`}
                >
                  <Paperclip size={20} className={dragOver ? 'text-indigo-400' : 'opacity-40'} />
                  <div className="text-center">
                    <p className="text-xs font-semibold">{dragOver ? 'Drop files here' : 'Click to browse or drag & drop'}</p>
                    <p className="text-[11px] opacity-60 mt-0.5">Images, PDFs, documents, logs — up to 10 MB each</p>
                  </div>
                </div>

                {/* File list */}
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {attachments.map((file, idx) => {
                      const isImage = file.type.startsWith('image/')
                      return (
                        <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-xl glass-card">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isImage ? 'bg-indigo-400/15 text-indigo-400' : 'bg-slate-400/15 t-muted'}`}>
                            {isImage ? <ImageIcon size={15} /> : <FileText size={15} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium t-main truncate">{file.name}</p>
                            <p className="text-[10px] t-muted mt-0.5">{fmtSize(file.size)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="p-1 rounded-lg t-muted hover:text-rose-400 hover:bg-rose-400/10 transition-all flex-shrink-0"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )
                    })}
                    <p className="text-[10px] t-muted pl-1">{attachments.length} file{attachments.length !== 1 ? 's' : ''} selected</p>
                  </div>
                )}
              </div>

            </div>
          </Card>

          {submitError && (
            <div className="flex gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 animate-fade-in">
              <AlertTriangle size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">Ticket submission failed</div>
                <pre className="text-xs text-rose-600 dark:text-rose-300/80 whitespace-pre-wrap break-words font-sans">{submitError}</pre>
              </div>
              <button type="button" onClick={() => setSubmitError('')} className="text-rose-400 hover:text-rose-600 transition-colors">✕</button>
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full shadow-glow-indigo">
            {submitting
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
              : <><Send size={15} /> Submit Ticket</>}
          </Button>
        </form>

        {/* Sidebar */}
        <div className="space-y-3">
          <KbSuggestions subject={form.subject} description={form.description} />

          {/* SLA info */}
          <Card>
            <CardHeader title="Response Times" />
            <div className="space-y-1.5">
              {PRIORITIES.map(p => {
                const ui = PRIORITY_UI[p]
                const hours = slaSettings[p]
                return (
                  <div key={p} className={`flex items-center justify-between px-3 py-1.5 rounded-lg border transition-all ${form.priority === p ? `${ui.bg} ${ui.border}` : 'bg-black/5 dark:bg-white/3 border-glass'}`}>
                    <span className={`text-xs font-bold ${form.priority === p ? ui.text : 't-muted'}`}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </span>
                    <span className="text-xs t-muted">{hours < 2 ? `${hours} hr` : `${hours} hrs`}</span>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Tips */}
          <Card>
            <div className="flex gap-2 mb-2">
              <Info size={14} className="text-indigo-500 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs font-bold t-main uppercase tracking-wider">Tips for faster resolution</span>
            </div>
            <ul className="space-y-1.5 text-xs t-muted leading-relaxed">
              <li>• Include asset tags or device names when relevant</li>
              <li>• List any error messages exactly as they appear</li>
              <li>• Describe steps you've already tried</li>
              <li>• Note how many users are affected</li>
              <li>• Include relevant screenshots in comments after submission</li>
            </ul>
          </Card>

          {/* Critical warning */}
          {form.priority === 'critical' && (
            <div className="flex gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 animate-fade-in">
              <AlertTriangle size={16} className="text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-rose-600 dark:text-rose-300/80">
                <div className="font-bold mb-1 uppercase tracking-wider">Critical priority selected</div>
                This will immediately alert the security/infrastructure team. Use only for active outages or security incidents.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
