import { useState, useRef, useEffect } from 'react'
import { Users, SlidersHorizontal, Mail, LayoutGrid, Trash2, Plus, Save, RefreshCw, ShieldCheck, Link2, Link2Off, KeyRound, Globe, CheckCircle2, AlertCircle, Inbox, ToggleLeft, ToggleRight, Zap, Clock, Hash, ArrowRight, XCircle, Loader2, Eye, EyeOff, Tag, Pencil, Lock, Palette, Building2, Phone, MapPin, ImagePlus, X, Ticket, FileText, ToggleLeft as TogOff, ToggleRight as TogOn, ChevronDown, Users2, Settings2, Timer, Bell, BellRing, UserX, AtSign, Send, CalendarDays, PauseCircle } from 'lucide-react'
import { LANGUAGES, TIMEZONES, SESSION_TIMEOUTS } from '../locales/translations'
import { useAdminStore } from '../stores/adminStore'
import { useTicketStore } from '../stores/ticketStore'
import { useUiStore } from '../stores/uiStore'
import { useUserStore } from '../stores/userStore'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PriorityBadge } from '../components/ui/Badge'
import { TicketDetailModal } from '../components/tickets/TicketDetailModal'
import { PRIORITIES } from '../utils/ticketUtils'
import { api } from '../api/client'
import { DEFAULT_EMAIL_TEMPLATES, DEFAULT_ALERT_SETTINGS } from '../data/seedData'

const TABS = [
  { id: 'general',   icon: Settings2,         label: 'General' },
  { id: 'overview',  icon: LayoutGrid,        label: 'Overview' },
  { id: 'company',   icon: Building2,         label: 'Company' },
  { id: 'tickets',   icon: Ticket,            label: 'Tickets' },
  { id: 'groups',    icon: Users2,            label: 'Groups' },
  { id: 'agents',    icon: Users,             label: 'Agents' },
  { id: 'sla',       icon: SlidersHorizontal, label: 'SLA' },
  { id: 'email',     icon: Mail,              label: 'Email' },
  { id: 'alerts',    icon: Bell,              label: 'Alerts' },
]

const GROUP_COLORS = [
  '#EF4444','#F97316','#F59E0B','#84CC16','#10B981',
  '#06B6D4','#3B82F6','#8B5CF6','#EC4899','#6B7280',
]

const TEMPLATE_VARS = [
  { tag: '{ticket_id}',       desc: 'Ticket number' },
  { tag: '{ticket_subject}',  desc: 'Ticket subject' },
  { tag: '{ticket_priority}', desc: 'Priority level' },
  { tag: '{ticket_status}',   desc: 'Current status' },
  { tag: '{contact_name}',    desc: 'Requester name' },
  { tag: '{agent_name}',      desc: 'Assigned agent' },
  { tag: '{closed_date}',     desc: 'Date closed' },
  { tag: '{company_name}',    desc: 'Your company name' },
]

// ─── OAuth Provider presets ──────────────────────────────────────────────────
const OAUTH_PROVIDERS = {
  google: {
    label: 'Google / Gmail',
    icon: '🔵',
    authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    scopes: 'https://mail.google.com/',
    hint: 'Use Google Cloud Console → OAuth 2.0 credentials',
  },
  microsoft: {
    label: 'Microsoft / Outlook',
    icon: '🟦',
    authEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: 'https://outlook.office.com/SMTP.Send offline_access',
    hint: 'Use Azure Portal → App registrations',
  },
  custom: {
    label: 'Custom / Generic',
    icon: '⚙️',
    authEndpoint: '',
    tokenEndpoint: '',
    scopes: '',
    hint: 'Enter your own OAuth 2.0 authorization server endpoints',
  },
}

// ─── Categories Tab ───────────────────────────────────────────────────────────
const PRESET_COLORS = [
  '#EF4444','#F97316','#F59E0B','#84CC16','#10B981',
  '#06B6D4','#3B82F6','#8B5CF6','#EC4899','#6B7280',
]

function CategoriesTab({ categories, onAdd, onUpdate, onDelete, inputCls }) {
  const [form, setForm] = useState({ name: '', color: '#3B82F6', description: '' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [error, setError] = useState('')

  const handleAdd = (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Category name is required'); return }
    const slug = form.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (categories.some(c => c.id === slug)) { setError('Category already exists'); return }
    onAdd(form)
    setForm({ name: '', color: '#3B82F6', description: '' })
    setError('')
  }

  const startEdit = (cat) => {
    setEditingId(cat.id)
    setEditForm({ name: cat.name, color: cat.color, description: cat.description || '' })
  }

  const saveEdit = (id) => {
    if (!editForm.name.trim()) return
    onUpdate(id, editForm)
    setEditingId(null)
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Left — Add new category */}
      <Card>
        <CardHeader title="Add Category" subtitle="Create a custom ticket category" />
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Category Name</label>
            <input className={inputCls} value={form.name} placeholder="e.g. Microsoft 365"
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError('') }} />
            {error && <p className="text-[11px] text-rose-500 mt-1">{error}</p>}
          </div>
          <div>
            <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Description <span className="font-normal t-muted">(optional)</span></label>
            <input className={inputCls} value={form.description} placeholder="Short description of this category"
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-2">Color</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-all border-2 ${form.color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex-shrink-0 border border-glass" style={{ backgroundColor: form.color }} />
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-8 h-7 cursor-pointer rounded border border-glass bg-transparent" />
              <input className="glass-input text-xs flex-1 font-mono" value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="#3B82F6" />
            </div>
          </div>
          <Button type="submit" variant="primary" size="sm" className="w-full"><Plus size={13}/> Add Category</Button>
        </form>

        {/* Preview badge */}
        {form.name && (
          <div className="mt-3 pt-3 border-t border-glass">
            <div className="text-[10px] t-muted mb-1.5">Preview</div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
              style={{ backgroundColor: form.color + '20', color: form.color, borderColor: form.color + '40' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: form.color }} />
              {form.name}
            </span>
          </div>
        )}
      </Card>

      {/* Right — Category list */}
      <Card>
        <CardHeader title="All Categories" subtitle={`${categories.length} total · ${categories.filter(c => !c.isBuiltin).length} custom`} />
        <div className="space-y-1.5 max-h-[440px] overflow-y-auto">
          {categories
            .slice().sort((a, b) => a.sortOrder - b.sortOrder)
            .map(cat => (
            <div key={cat.id}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/3 group transition-all border border-transparent hover:border-glass">

              {/* Color swatch — updates live during edit */}
              <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm"
                style={{
                  backgroundColor: (editingId === cat.id ? editForm.color : cat.color) + '25',
                  border: `1.5px solid ${(editingId === cat.id ? editForm.color : cat.color)}55`
                }}>
                <span className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: editingId === cat.id ? editForm.color : cat.color }} />
              </div>

              {editingId === cat.id ? (
                /* ── Inline edit mode ── */
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <input autoFocus className="glass-input text-sm flex-1"
                      placeholder="Category name"
                      value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                    <input type="color" value={editForm.color}
                      onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))}
                      className="w-7 h-7 cursor-pointer rounded border border-glass bg-transparent flex-shrink-0" />
                    <button onClick={() => saveEdit(cat.id)}
                      className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-indigo-600/20 border border-indigo-500/30 text-indigo-500 hover:bg-indigo-600/30 transition-all flex-shrink-0">Save</button>
                    <button onClick={() => setEditingId(null)}
                      className="p-1 rounded-lg t-muted hover:t-main transition-colors flex-shrink-0"><XCircle size={13}/></button>
                  </div>
                  <input className="glass-input text-xs"
                    placeholder="Description (optional)"
                    value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              ) : (
                /* ── Display mode ── */
                <>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium t-main">{cat.name}</span>
                      {cat.isBuiltin && (
                        <span className="flex items-center gap-0.5 text-[9px] font-semibold t-muted bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-full border border-glass">
                          <Lock size={8}/> Built-in
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] t-muted font-mono">{cat.id}</div>
                    {cat.description && <div className="text-[11px] t-muted mt-0.5 truncate">{cat.description}</div>}
                  </div>

                  {/* Actions — always visible */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(cat)}
                      className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-indigo-400 hover:text-indigo-500 hover:border-indigo-500/20 border border-transparent transition-all">
                      <Pencil size={12}/>
                    </button>
                    <button onClick={() => onDelete(cat.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-500 hover:border-rose-500/20 border border-transparent transition-all">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Inbound Email Section ────────────────────────────────────────────────────
const PRIORITIES_LIST = ['critical','high','medium','low']

const STATUS_META = {
  processed: { label: 'Converted', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  duplicate:  { label: 'Duplicate', cls: 'bg-amber-500/10  text-amber-600  dark:text-amber-400  border-amber-500/20'  },
  error:      { label: 'Error',     cls: 'bg-rose-500/10   text-rose-600   dark:text-rose-400   border-rose-500/20'   },
  filtered:   { label: 'Filtered',  cls: 'bg-slate-500/10  text-slate-500  dark:text-slate-400  border-slate-500/20'  },
}

// ── Filter rule helpers ────────────────────────────────────────────────────────
const RULE_FIELDS = [
  { value: 'subject',     label: 'Subject' },
  { value: 'from_email',  label: 'From Email' },
  { value: 'from_domain', label: 'From Domain' },
]
const RULE_OPERATORS = [
  { value: 'contains',     label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
  { value: 'starts_with',  label: 'starts with' },
  { value: 'ends_with',    label: 'ends with' },
  { value: 'equals',       label: 'equals' },
]
const RULE_FIELD_LABEL    = Object.fromEntries(RULE_FIELDS.map(f => [f.value, f.label]))
const RULE_OPERATOR_LABEL = Object.fromEntries(RULE_OPERATORS.map(o => [o.value, o.label]))
const FILTER_PRESETS = [
  { label: '🚫 No-Reply',    field: 'from_email',  operator: 'contains',    value: 'noreply' },
  { label: '📢 Promotions',  field: 'subject',     operator: 'contains',    value: 'unsubscribe' },
  { label: '🛒 Advertising', field: 'subject',     operator: 'contains',    value: 'promotion' },
  { label: '📨 Newsletter',  field: 'subject',     operator: 'contains',    value: 'newsletter' },
]

function InboundEmailSection({ inboundEdits, setInboundEdits, agents, emailLog, categories = [], onSaveInbound, onPollNow, onClearLog, addToast, inputCls }) {
  const [showPass, setShowPass] = useState(false)
  const [polling, setPolling] = useState(false)
  const [newRule, setNewRule] = useState({ field: 'subject', operator: 'contains', value: '' })
  const set = (k, v) => setInboundEdits(p => ({ ...p, [k]: v }))

  // ── Filter rule handlers ─────────────────────────────────────────────────
  const addRule = () => {
    const val = newRule.value.trim()
    if (!val) return
    set('filterRules', [...(inboundEdits.filterRules || []), { ...newRule, value: val }])
    setNewRule(r => ({ ...r, value: '' }))
  }
  const removeRule = (index) => {
    const rules = [...(inboundEdits.filterRules || [])]
    rules.splice(index, 1)
    set('filterRules', rules)
  }
  const addPreset = (preset) => {
    const exists = (inboundEdits.filterRules || []).some(
      r => r.field === preset.field && r.operator === preset.operator &&
           r.value.toLowerCase() === preset.value.toLowerCase()
    )
    if (!exists) set('filterRules', [...(inboundEdits.filterRules || []), { field: preset.field, operator: preset.operator, value: preset.value }])
  }

  const authType = inboundEdits.authType || 'basic'

  const AUTH_TYPES = [
    { id: 'basic',  label: 'IMAP + Password', icon: Mail },
    { id: 'oauth',  label: 'IMAP + OAuth',    icon: ShieldCheck },
    { id: 'graph',  label: 'Graph API (M365)', icon: Globe },
  ]

  const handlePollNow = async () => {
    setPolling(true)
    try {
      await onPollNow()
    } finally {
      setPolling(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header + master toggle */}
      <div className="flex items-center justify-between p-4 glass-card border border-glass rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Inbox size={16} className="text-violet-500" />
          </div>
          <div>
            <div className="text-sm font-bold t-main">Email → Ticket</div>
            <div className="text-xs t-muted">Auto-create tickets from incoming emails</div>
          </div>
        </div>
        <button onClick={() => set('enabled', !inboundEdits.enabled)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
            inboundEdits.enabled
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'border-glass t-muted'
          }`}>
          {inboundEdits.enabled
            ? <><ToggleRight size={16} className="text-emerald-500" /> Enabled</>
            : <><ToggleLeft  size={16} /> Disabled</>}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Left — Connection config */}
        <Card>
          <CardHeader title="Inbound Mailbox" subtitle="Where to fetch incoming emails from" />

          {/* Auth type selector */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-2">Auth Method</label>
            <div className="grid grid-cols-3 gap-1.5">
              {AUTH_TYPES.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => set('authType', id)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] font-semibold transition-all leading-tight text-center
                    ${authType === id
                      ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400'
                      : 'border-glass t-muted hover:bg-black/5 dark:hover:bg-white/5'}`}>
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {/* IMAP fields (basic + oauth) */}
            {authType !== 'graph' && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">IMAP Host</label>
                    <input className={inputCls} value={inboundEdits.imapHost || ''} placeholder="imap.gmail.com"
                      onChange={e => set('imapHost', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Port</label>
                    <input className={inputCls} value={inboundEdits.imapPort || '993'} placeholder="993"
                      onChange={e => set('imapPort', e.target.value)} />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={inboundEdits.imapSsl ?? true}
                    onChange={e => set('imapSsl', e.target.checked)} className="accent-indigo-500" />
                  <span className="text-xs t-main">Use SSL/TLS</span>
                </label>

                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Email / Username</label>
                  <input className={inputCls} value={inboundEdits.imapUser || ''} placeholder="helpdesk@company.com"
                    onChange={e => set('imapUser', e.target.value)} />
                </div>

                {authType === 'basic' && (
                  <div>
                    <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Password / App Password</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} className={inputCls} value={inboundEdits.imapPass || ''} placeholder="••••••••"
                        onChange={e => set('imapPass', e.target.value)} />
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 t-muted hover:t-main transition-colors">
                        {showPass ? <EyeOff size={13}/> : <Eye size={13}/>}
                      </button>
                    </div>
                  </div>
                )}
                {authType === 'oauth' && (
                  <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-[11px] t-muted">
                    <span className="text-indigo-500 font-semibold">XOAUTH2</span> — Uses the access token from the OAuth 2.0 outbound config above. Authorize outbound OAuth first.
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Folder to Monitor</label>
                  <input className={inputCls} value={inboundEdits.imapFolder || 'INBOX'} placeholder="INBOX"
                    onChange={e => set('imapFolder', e.target.value)} />
                </div>
              </>
            )}

            {/* Graph API (M365) fields */}
            {authType === 'graph' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Shared Mailbox Address</label>
                  <input className={inputCls} value={inboundEdits.graphMailbox || ''} placeholder="helpdesk@yourorg.onmicrosoft.com"
                    onChange={e => set('graphMailbox', e.target.value)} />
                </div>
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] t-muted">
                  <span className="text-blue-500 font-semibold">Microsoft Graph</span> — Requires <code className="font-mono">Mail.Read</code> (Application) permission in Azure. Uses OAuth tokens from the outbound M365 config.
                </div>
              </>
            )}

            {/* After processing */}
            <div className="pt-1 border-t border-glass space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={inboundEdits.markSeen ?? true}
                  onChange={e => set('markSeen', e.target.checked)} className="accent-indigo-500" />
                <span className="text-xs t-main">Mark emails as read after processing</span>
              </label>
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Move to folder after processing <span className="font-normal t-muted">(optional)</span></label>
                <input className={inputCls} value={inboundEdits.moveToFolder || ''} placeholder="Processed"
                  onChange={e => set('moveToFolder', e.target.value)} />
              </div>
            </div>
          </div>
        </Card>

        {/* Right — Defaults + Schedule */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Auto-Ticket Defaults" subtitle="Applied to every email-created ticket" />
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Default Category</label>
                <select className={inputCls} value={inboundEdits.defaultCategory || 'email'} onChange={e => set('defaultCategory', e.target.value)}>
                  {[...categories].sort((a, b) => a.sortOrder - b.sortOrder).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Default Priority</label>
                <select className={inputCls} value={inboundEdits.defaultPriority || 'medium'} onChange={e => set('defaultPriority', e.target.value)}>
                  {PRIORITIES_LIST.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Auto-Assign To</label>
                <select className={inputCls} value={inboundEdits.defaultAssignee || 'unassigned'} onChange={e => set('defaultAssignee', e.target.value)}>
                  <option value="unassigned">— Unassigned —</option>
                  {agents.filter(a => a.id !== 'unassigned').map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.group})</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Polling Schedule" />
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Poll Interval</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={1440} className="glass-input w-24 text-sm text-center"
                    value={inboundEdits.pollIntervalMinutes || 5}
                    onChange={e => set('pollIntervalMinutes', Number(e.target.value))} />
                  <span className="text-xs t-muted">minutes</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/3 border border-glass">
                  <div className="text-[10px] t-muted mb-0.5 flex items-center gap-1"><Clock size={9}/> Last polled</div>
                  <div className="text-xs font-semibold t-main">
                    {inboundEdits.lastPolledAt
                      ? new Date(inboundEdits.lastPolledAt).toLocaleTimeString()
                      : '—'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/3 border border-glass">
                  <div className="text-[10px] t-muted mb-0.5 flex items-center gap-1"><Hash size={9}/> Converted</div>
                  <div className="text-xs font-semibold t-main">{inboundEdits.processedCount || 0}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={onSaveInbound}><Save size={13}/> Save</Button>
              <button onClick={handlePollNow} disabled={polling || !inboundEdits.enabled}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                  ${!inboundEdits.enabled ? 'opacity-40 cursor-not-allowed border-glass t-muted'
                    : polling ? 'border-violet-500/30 text-violet-500 opacity-80 cursor-wait'
                    : 'border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10'}`}>
                {polling ? <><Loader2 size={12} className="animate-spin"/> Polling…</> : <><Zap size={12}/> Poll Now</>}
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Filter Rules ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Filter Rules" subtitle="Block matching emails before they become tickets" />

        {/* Quick-add presets */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[10px] font-bold t-sub uppercase tracking-wider">Quick add:</span>
          {FILTER_PRESETS.map(p => (
            <button key={p.label} onClick={() => addPreset(p)}
              className="px-2.5 py-1 rounded-lg border border-glass text-[10px] font-semibold t-muted hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-500 transition-all">
              {p.label}
            </button>
          ))}
        </div>

        {/* Existing rules list */}
        {(inboundEdits.filterRules || []).length === 0 ? (
          <div className="py-4 text-center text-xs t-muted border border-dashed border-glass rounded-lg mb-3">
            No filter rules — all incoming emails will create tickets.
          </div>
        ) : (
          <div className="space-y-1.5 mb-3">
            {(inboundEdits.filterRules || []).map((rule, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/5 dark:bg-white/3 border border-glass">
                <span className="flex-shrink-0 text-[10px] font-bold t-sub uppercase tracking-wide">
                  {RULE_FIELD_LABEL[rule.field] || rule.field}
                </span>
                <span className="flex-shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  {RULE_OPERATOR_LABEL[rule.operator] || rule.operator}
                </span>
                <span className="flex-1 text-xs font-mono t-main truncate">"{rule.value}"</span>
                <button onClick={() => removeRule(i)}
                  className="flex-shrink-0 p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-all">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new rule form */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-glass">
          <select value={newRule.field} onChange={e => setNewRule(r => ({ ...r, field: e.target.value }))}
            className="h-8 px-2.5 text-xs rounded-lg border border-glass bg-white/60 dark:bg-white/5 t-main focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer">
            {RULE_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select value={newRule.operator} onChange={e => setNewRule(r => ({ ...r, operator: e.target.value }))}
            className="h-8 px-2.5 text-xs rounded-lg border border-glass bg-white/60 dark:bg-white/5 t-main focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer">
            {RULE_OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            className="flex-1 min-w-[140px] h-8 px-2.5 text-xs rounded-lg border border-glass bg-white/60 dark:bg-white/5 t-main placeholder:t-muted focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            placeholder="e.g. unsubscribe, noreply@"
            value={newRule.value}
            onChange={e => setNewRule(r => ({ ...r, value: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addRule()}
          />
          <button onClick={addRule} disabled={!newRule.value.trim()}
            className="h-8 px-4 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all flex items-center gap-1.5">
            <Plus size={12} /> Add Rule
          </button>
        </div>
        <p className="text-[10px] t-muted mt-2">
          Rules are checked against every incoming email before a ticket is created. Matched emails are logged as <span className="font-semibold text-slate-400">Filtered</span> and skipped.
        </p>
      </Card>

      {/* Email Log */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardHeader title="Email Conversion Log" subtitle={`${emailLog.length} recent entries`} />
          {emailLog.length > 0 && (
            <button onClick={onClearLog} className="flex items-center gap-1 text-[10px] t-muted hover:text-rose-500 transition-colors">
              <XCircle size={11}/> Clear
            </button>
          )}
        </div>

        {emailLog.length === 0 ? (
          <div className="py-8 text-center">
            <Inbox size={28} className="mx-auto t-muted mb-2 opacity-40" />
            <p className="text-xs t-muted">No emails processed yet.</p>
            <p className="text-[11px] t-muted mt-1">Enable inbound email and click Poll Now to test.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-glass">
                  <th className="text-left pb-2 text-[10px] font-bold t-sub uppercase tracking-wider">From</th>
                  <th className="text-left pb-2 text-[10px] font-bold t-sub uppercase tracking-wider">Subject → Ticket</th>
                  <th className="text-left pb-2 text-[10px] font-bold t-sub uppercase tracking-wider">Status</th>
                  <th className="text-left pb-2 text-[10px] font-bold t-sub uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass">
                {emailLog.map(entry => (
                  <tr key={entry.id} className="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                    <td className="py-2 pr-3">
                      <div className="font-medium t-main truncate max-w-[130px]">{entry.fromName || entry.fromEmail}</div>
                      <div className="text-[10px] t-muted truncate max-w-[130px]">{entry.fromEmail}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="t-main truncate max-w-[200px]">{entry.subject}</div>
                      {entry.ticketId && (
                        <div className="flex items-center gap-1 text-[10px] text-indigo-500 mt-0.5">
                          <ArrowRight size={9}/> {entry.ticketId}
                        </div>
                      )}
                      {entry.errorMessage && (
                        <div className="text-[10px] text-rose-500 mt-0.5 truncate max-w-[200px]">{entry.errorMessage}</div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${STATUS_META[entry.status]?.cls || ''}`}>
                        {STATUS_META[entry.status]?.label || entry.status}
                      </span>
                    </td>
                    <td className="py-2 t-muted whitespace-nowrap">
                      {new Date(entry.processedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Test Email Panel ─────────────────────────────────────────────────────────
const THRESHOLD_LONG_MSG = 120

function TestEmailErrorDetail({ message }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = message && message.length > THRESHOLD_LONG_MSG
  // Detect Azure/M365 hint messages — they mention "Azure Portal" or "AADSTS"
  const isAzureHint = message && (message.includes('Azure Portal') || message.includes('AADSTS') || message.includes('Client Secret'))
  const displayed = isLong && !expanded ? message.slice(0, THRESHOLD_LONG_MSG) + '…' : message
  return (
    <div className="mt-0.5 space-y-1.5">
      {isAzureHint && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 w-fit">
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Azure / M365</span>
        </div>
      )}
      <p className="text-[11px] t-muted leading-relaxed">{displayed}</p>
      {isLong && (
        <button onClick={() => setExpanded(p => !p)}
          className="text-[10px] font-semibold text-rose-500 hover:text-rose-400 transition-colors">
          {expanded ? 'Show less ▲' : 'Show full error ▼'}
        </button>
      )}
    </div>
  )
}

function TestEmailPanel({ open, testTo, setTestTo, status, message, onSend, onClose, inputCls }) {
  if (!open) return null
  return (
    <div className="mt-4 p-4 rounded-xl border border-indigo-500/25 bg-indigo-500/5 space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
            <Mail size={13} className="text-indigo-500" />
          </div>
          <div>
            <div className="text-xs font-bold t-main">Send Test Email</div>
            <div className="text-[10px] t-muted">Verify your email configuration is working</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 t-muted transition-colors">
          <X size={13} />
        </button>
      </div>

      {/* Recipient input */}
      <div>
        <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
          Send Test To (Recipient Email)
        </label>
        <div className="flex gap-2">
          <input
            className={inputCls + ' flex-1'}
            type="email"
            placeholder="you@example.com"
            value={testTo}
            onChange={e => setTestTo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSend()}
            disabled={status === 'loading'}
          />
          <button
            onClick={onSend}
            disabled={status === 'loading'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
              ${status === 'loading'
                ? 'opacity-60 cursor-not-allowed border-indigo-500/30 text-indigo-400'
                : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700 shadow-sm'}`}
          >
            {status === 'loading'
              ? <><Loader2 size={12} className="animate-spin" /> Sending…</>
              : <><ArrowRight size={12} /> Send</>}
          </button>
        </div>
      </div>

      {/* Result */}
      {status === 'success' && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Email Sent Successfully</div>
            <div className="text-[11px] t-muted mt-0.5">{message}</div>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25">
          <XCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">Test Failed</div>
            <TestEmailErrorDetail message={message} />
          </div>
        </div>
      )}
      {status === 'loading' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
          <Loader2 size={13} className="text-indigo-500 animate-spin flex-shrink-0" />
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400">Connecting and sending test email…</div>
        </div>
      )}
    </div>
  )
}

// ─── Email Tab Component ──────────────────────────────────────────────────────
function EmailTab({ emailEdits, setEmailEdits, triggersEdits, setTriggersEdits, inboundEdits, setInboundEdits, agents, emailLog, categories, inputCls, onSave, onTest, saving, onSaveInbound, onPollNow, onClearLog, addToast, tplEdits, setTplEdits, onSaveTemplate, insertVar }) {
  const [emailSubTab, setEmailSubTab] = useState('outbound')
  const emailType = emailEdits.type || 'smtp'
  const [oauthShowSecret, setOauthShowSecret] = useState(false)
  const [smtpShowPass, setSmtpShowPass] = useState(false)
  const [isAuthorizing, setIsAuthorizing] = useState(false)

  // ── Test Email state ─────────────────────────────────────────────────────
  const [testPanel, setTestPanel] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [testStatus, setTestStatus] = useState(null) // null | 'loading' | 'success' | 'error'
  const [testMsg,  setTestMsg]  = useState('')

  const validateConfig = () => {
    if (emailType === 'smtp') {
      if (!smtp.host)  return 'SMTP Host is required'
      if (!smtp.port)  return 'SMTP Port is required'
      if (!smtp.from)  return 'From Address is required'
      if (!smtp.user)  return 'Username is required'
      if (!smtp.pass)  return 'Password is required'
    } else if (emailType === 'm365') {
      if (!m365.tenantId)     return 'Tenant ID is required'
      if (!m365.clientId)     return 'Client (Application) ID is required'
      if (!m365.clientSecret) return 'Client Secret is required'
      if (!m365.from)         return 'From Address is required'
    } else if (emailType === 'oauth') {
      if (!oauth.from)         return 'From Address is required'
      if (!oauth.clientId)     return 'Client ID is required'
      if (!oauth.clientSecret) return 'Client Secret is required'
      if (!oauth.connected)    return 'OAuth is not authorized yet — click Authorize first'
    }
    return null
  }

  const handleSendTest = async () => {
    if (!testTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo)) {
      setTestStatus('error')
      setTestMsg('Enter a valid recipient email address')
      return
    }

    setTestStatus('loading')
    setTestMsg('')

    // Build payload with ALL current form credentials
    // so the backend can use them directly without reading the DB
    const payload = {
      to_email: testTo,
      type: emailType,
    }

    if (emailType === 'smtp') {
      payload.smtp_host     = smtp.host     || ''
      payload.smtp_port     = smtp.port     || '587'
      payload.smtp_security = smtp.security || 'tls'
      payload.smtp_from     = smtp.from     || ''
      payload.smtp_user     = smtp.user     || ''
      payload.smtp_pass     = smtp.pass     || ''
    } else if (emailType === 'm365') {
      payload.m365_tenant_id     = m365.tenantId     || ''
      payload.m365_client_id     = m365.clientId     || ''
      payload.m365_client_secret = m365.clientSecret || ''
      payload.m365_from          = m365.from         || ''
    } else if (emailType === 'oauth') {
      payload.oauth_provider     = oauth.provider     || 'google'
      payload.oauth_from         = oauth.from         || ''
      payload.oauth_access_token = oauth.accessToken  || oauth.connectedEmail || ''
    }

    try {
      const result = await api.post('/admin/email/test', payload)
      setTestStatus('success')
      setTestMsg(result?.message || `Test email sent successfully to ${testTo}`)
      addToast('Test email sent!', 'success')
    } catch (e) {
      setTestStatus('error')
      setTestMsg(e.message || 'Failed to send test email. Check your configuration.')
    }
  }

  const openTestPanel = () => {
    setTestPanel(true)
    setTestStatus(null)
    setTestMsg('')
    setTestTo('')
  }

  const setType = (t) => setEmailEdits(c => ({ ...c, type: t }))
  const setOauth = (key, val) => setEmailEdits(c => ({ ...c, oauth: { ...c.oauth, [key]: val } }))
  const setSmtp  = (key, val) => setEmailEdits(c => ({ ...c, smtp:  { ...c.smtp,  [key]: val } }))
  const setM365  = (key, val) => setEmailEdits(c => ({ ...c, m365:  { ...c.m365,  [key]: val } }))

  const oauth = emailEdits.oauth || {}
  const smtp  = emailEdits.smtp  || {}
  const m365  = emailEdits.m365  || {}

  // When provider changes, auto-fill endpoints + scopes
  const handleProviderChange = (provider) => {
    const preset = OAUTH_PROVIDERS[provider]
    setEmailEdits(c => ({
      ...c,
      oauth: {
        ...c.oauth,
        provider,
        authEndpoint:  preset.authEndpoint,
        tokenEndpoint: preset.tokenEndpoint,
        scopes:        preset.scopes,
      }
    }))
  }

  // Simulate OAuth authorization flow
  const handleAuthorize = () => {
    if (!oauth.clientId || !oauth.clientSecret) {
      addToast('Enter Client ID and Client Secret first', 'error'); return
    }
    setIsAuthorizing(true)
    // In a real app: window.open(buildAuthUrl(), '_blank') and handle callback
    setTimeout(() => {
      setIsAuthorizing(false)
      const expiry = new Date(Date.now() + 3600_000).toISOString()
      setEmailEdits(c => ({
        ...c,
        oauth: { ...c.oauth, connected: true, connectedEmail: oauth.from || 'helpdesk@company.com', tokenExpiry: expiry }
      }))
      addToast('OAuth authorization successful', 'success')
    }, 2000)
  }

  const handleRevoke = () => {
    setEmailEdits(c => ({ ...c, oauth: { ...c.oauth, connected: false, connectedEmail: '', tokenExpiry: null } }))
    addToast('OAuth access revoked', 'info')
  }

  const TYPE_TABS = [
    { id: 'smtp',  label: 'SMTP',       icon: Mail },
    { id: 'oauth', label: 'OAuth 2.0',  icon: ShieldCheck },
    { id: 'm365',  label: 'M365',       icon: Globe },
  ]

  const provider = oauth.provider || 'google'
  const providerPreset = OAUTH_PROVIDERS[provider]

  return (
    <div className="space-y-4">
      {/* Sub-tab switcher: Outbound | Inbound | Templates */}
      <div className="flex gap-1 p-1 glass-card w-fit border border-glass rounded-xl">
        {[
          { id: 'outbound',   icon: Mail,     label: 'Outbound Mail' },
          { id: 'inbound',    icon: Inbox,    label: 'Inbound → Ticket' },
          { id: 'templates',  icon: FileText, label: 'Templates' },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setEmailSubTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              emailSubTab === id
                ? 'bg-indigo-600/30 t-main border border-indigo-500/30'
                : 't-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5'}`}>
            <Icon size={13}/>{label}
          </button>
        ))}
      </div>

      {/* Inbound sub-tab */}
      {emailSubTab === 'inbound' && (
        <InboundEmailSection
          inboundEdits={inboundEdits} setInboundEdits={setInboundEdits}
          agents={agents} emailLog={emailLog} categories={categories}
          onSaveInbound={onSaveInbound} onPollNow={onPollNow} onClearLog={onClearLog}
          addToast={addToast} inputCls={inputCls}
        />
      )}

      {/* Templates sub-tab */}
      {emailSubTab === 'templates' && tplEdits && (
        <div className="space-y-4">
          {/* Variable reference */}
          <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-bold t-sub uppercase tracking-wider mr-1">Available Variables:</span>
            {TEMPLATE_VARS.map(v => (
              <span key={v.tag} title={v.desc}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                {v.tag}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[
              { key: 'ticketOpen',       label: 'New Ticket Created',    color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25', dot: 'bg-emerald-500', desc: 'Sent when a new ticket is submitted' },
              { key: 'ticketInProgress', label: 'Ticket In Progress',    color: 'text-violet-600 dark:text-violet-400',   bg: 'bg-violet-500/10 border-violet-500/25',   dot: 'bg-violet-500',  desc: 'Sent when work starts on the ticket' },
              { key: 'ticketOnHold',     label: 'Ticket On Hold',        color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-500/10 border-amber-500/25',     dot: 'bg-amber-500',   desc: 'Sent when ticket is placed on hold' },
              { key: 'ticketResolved',   label: 'Ticket Resolved',       color: 'text-sky-600 dark:text-sky-400',         bg: 'bg-sky-500/10 border-sky-500/25',         dot: 'bg-sky-500',     desc: 'Sent when ticket is marked resolved' },
              { key: 'ticketClosed',     label: 'Ticket Closed',         color: 'text-slate-600 dark:text-slate-400',     bg: 'bg-slate-500/10 border-slate-500/25',     dot: 'bg-slate-400',   desc: 'Sent when ticket is closed' },
              { key: 'agentReply',       label: 'Agent Reply to Customer', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/25',   dot: 'bg-indigo-500',  desc: 'Sent when agent posts a comment to customer' },
            ].map(({ key, label, color, bg, dot, desc }) => {
              const tpl = tplEdits?.[key]
              if (!tpl) return null
              return (
                <div key={key} className="glass-card rounded-2xl border border-glass p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${dot}`} />
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${bg} ${color}`}>{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] t-muted">{desc}</span>
                      <button
                        onClick={() => setTplEdits(p => ({ ...p, [key]: { ...p[key], enabled: !p[key].enabled } }))}
                        className={`flex items-center gap-1 text-xs font-medium transition-colors ${tpl.enabled ? 'text-emerald-600 dark:text-emerald-400' : 't-muted'}`}
                      >
                        {tpl.enabled
                          ? <TogOn  size={20} className="text-emerald-500" />
                          : <TogOff size={20} className="t-muted" />}
                      </button>
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Subject Line</label>
                    <input
                      className={inputCls}
                      value={tpl.subject || ''}
                      onChange={e => setTplEdits(p => ({ ...p, [key]: { ...p[key], subject: e.target.value } }))}
                      placeholder="Email subject..."
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Email Body</label>
                    <textarea
                      rows={8}
                      className={inputCls + ' resize-y font-mono text-[11px] leading-relaxed'}
                      value={tpl.body || ''}
                      onChange={e => setTplEdits(p => ({ ...p, [key]: { ...p[key], body: e.target.value } }))}
                    />
                  </div>

                  {/* Insert variable chips */}
                  <div>
                    <p className="text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">Insert Variable</p>
                    <div className="flex flex-wrap gap-1.5">
                      {TEMPLATE_VARS.map(v => (
                        <button
                          key={v.tag}
                          title={v.desc}
                          onClick={() => insertVar && insertVar(key, 'body', v.tag)}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition-all"
                        >
                          {v.tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button variant="primary" size="sm" onClick={() => onSaveTemplate && onSaveTemplate(key)}>
                    <Save size={13} /> Save Template
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Outbound sub-tab */}
      {emailSubTab === 'outbound' && <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Left — Triggers */}
      <div className="space-y-4">
        <Card>
          <CardHeader title="Email Triggers" subtitle="Automated notifications" />
          <div className="space-y-3">
            {[
              { key: 'new',     label: 'New ticket submitted', desc: 'Notify team on new ticket creation' },
              { key: 'assign',  label: 'Ticket assigned',      desc: 'Notify agent when ticket assigned' },
              { key: 'resolve', label: 'Ticket resolved',      desc: 'Notify submitter on resolution' },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 p-3 rounded-lg bg-black/5 dark:bg-white/3 border border-glass cursor-pointer hover:bg-black/10 dark:hover:bg-white/5 transition-all">
                <input type="checkbox" checked={triggersEdits[key]} onChange={e => setTriggersEdits(t => ({ ...t, [key]: e.target.checked }))}
                  className="mt-0.5 accent-indigo-500" />
                <div>
                  <div className="text-sm t-main font-medium">{label}</div>
                  <div className="text-xs t-muted mt-0.5">{desc}</div>
                </div>
              </label>
            ))}
            
            <div className="pt-3 border-t border-glass">
              <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
                <Clock size={11} className="inline mr-1" /> Trigger Timezone
              </label>
              <select
                className={inputCls}
                value={triggersEdits.timezone || 'Asia/Kolkata'}
                onChange={e => setTriggersEdits(t => ({ ...t, timezone: e.target.value }))}
              >
                {(() => {
                  const tzGroups = [...new Set(TIMEZONES.map(z => z.group))]
                  return tzGroups.map(grp => (
                    <optgroup key={grp} label={grp}>
                      {TIMEZONES.filter(z => z.group === grp).map(z => (
                        <option key={z.value} value={z.value}>{z.label}</option>
                      ))}
                    </optgroup>
                  ))
                })()}
              </select>
              <p className="text-[10px] t-sub mt-1">
                Timezone used for formatting dates/times in trigger emails.
              </p>
            </div>
          </div>
        </Card>

        {/* Connection method type selector */}
        <Card>
          <CardHeader title="Connection Method" subtitle="Choose how to send emails" />
          <div className="grid grid-cols-3 gap-2">
            {TYPE_TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setType(id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all
                  ${emailType === id
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/10'
                    : 'border-glass t-muted hover:bg-black/5 dark:hover:bg-white/5 hover:t-main'}`}>
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Right — Config panel */}
      <div>
        {/* ── SMTP ── */}
        {emailType === 'smtp' && (
          <Card>
            <CardHeader title="SMTP Configuration" />
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">SMTP Host</label>
                  <input className={inputCls} value={smtp.host || ''} placeholder="smtp.office365.com"
                    onChange={e => setSmtp('host', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Port</label>
                  <input className={inputCls} value={smtp.port || '587'} placeholder="587"
                    onChange={e => setSmtp('port', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Security</label>
                <select className={inputCls} value={smtp.security || 'tls'} onChange={e => setSmtp('security', e.target.value)}>
                  <option value="tls">STARTTLS</option>
                  <option value="ssl">SSL / TLS</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">From Address</label>
                <input className={inputCls} value={smtp.from || ''} placeholder="helpdesk@company.com"
                  onChange={e => setSmtp('from', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Username</label>
                <input className={inputCls} value={smtp.user || ''} placeholder="username"
                  onChange={e => setSmtp('user', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Password</label>
                <div className="relative">
                  <input type={smtpShowPass ? 'text' : 'password'} className={inputCls} value={smtp.pass || ''} placeholder="••••••••"
                    onChange={e => setSmtp('pass', e.target.value)} />
                  <button type="button" onClick={() => setSmtpShowPass(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs t-muted hover:t-main transition-colors">
                    {smtpShowPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>{saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save</>}</Button>
              <Button variant="ghost" size="sm" onClick={openTestPanel}>
                <Mail size={13} /> Send Test Email
              </Button>
            </div>
            <TestEmailPanel
              open={testPanel} testTo={testTo} setTestTo={setTestTo}
              status={testStatus} message={testMsg}
              onSend={handleSendTest} onClose={() => { setTestPanel(false); setTestStatus(null) }}
              inputCls={inputCls}
            />
          </Card>
        )}

        {/* ── OAuth 2.0 ── */}
        {emailType === 'oauth' && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <ShieldCheck size={16} className="text-indigo-500" />
              </div>
              <div>
                <div className="text-sm font-bold t-main">OAuth 2.0 Configuration</div>
                <div className="text-xs t-muted">Secure token-based mail authentication</div>
              </div>
            </div>

            {/* Connection Status Banner */}
            {oauth.connected ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 mb-4">
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Connected</div>
                  <div className="text-[11px] t-muted truncate">{oauth.connectedEmail}</div>
                  {oauth.tokenExpiry && (
                    <div className="text-[10px] t-muted mt-0.5">
                      Token expires: {new Date(oauth.tokenExpiry).toLocaleString()}
                    </div>
                  )}
                </div>
                <button onClick={handleRevoke}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all">
                  <Link2Off size={11} /> Revoke
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 mb-4">
                <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">Not Connected</div>
                  <div className="text-[11px] t-muted">Fill credentials below and click Authorize</div>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-4">
              {/* Provider selector */}
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">OAuth Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(OAUTH_PROVIDERS).map(([key, val]) => (
                    <button key={key} type="button" onClick={() => handleProviderChange(key)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-medium transition-all
                        ${provider === key
                          ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400'
                          : 'border-glass t-muted hover:bg-black/5 dark:hover:bg-white/5'}`}>
                      <span>{val.icon}</span>
                      <span className="truncate">{key === 'custom' ? 'Custom' : key === 'google' ? 'Google' : 'Microsoft'}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] t-muted mt-1.5">{providerPreset.hint}</p>
              </div>

              {/* From Address */}
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">From Address</label>
                <input className={inputCls} value={oauth.from || ''} placeholder="helpdesk@company.com"
                  onChange={e => setOauth('from', e.target.value)} />
              </div>

              {/* Client ID */}
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">
                  <span className="flex items-center gap-1"><KeyRound size={10} /> Client ID</span>
                </label>
                <input className={inputCls} value={oauth.clientId || ''} placeholder="your-client-id.apps.googleusercontent.com"
                  onChange={e => setOauth('clientId', e.target.value)} />
              </div>

              {/* Client Secret */}
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Client Secret</label>
                <div className="relative">
                  <input type={oauthShowSecret ? 'text' : 'password'} className={inputCls} value={oauth.clientSecret || ''}
                    placeholder="GOCSPX-••••••••••••••••••••"
                    onChange={e => setOauth('clientSecret', e.target.value)} />
                  <button type="button" onClick={() => setOauthShowSecret(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs t-muted hover:t-main transition-colors">
                    {oauthShowSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Redirect URI */}
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Redirect URI
                  <span className="ml-1 text-[9px] font-normal text-indigo-500">(register this in your provider console)</span>
                </label>
                <div className="relative">
                  <input className={`${inputCls} pr-16 font-mono text-[11px]`} value={oauth.redirectUri || ''}
                    onChange={e => setOauth('redirectUri', e.target.value)} />
                  <button type="button"
                    onClick={() => { navigator.clipboard.writeText(oauth.redirectUri || ''); addToast('Redirect URI copied', 'success') }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-indigo-500 hover:text-indigo-400 transition-colors">
                    Copy
                  </button>
                </div>
              </div>

              {/* Scopes */}
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Scopes</label>
                <textarea rows={2} className={`${inputCls} resize-none font-mono text-[11px]`}
                  value={oauth.scopes || ''}
                  placeholder="https://mail.google.com/"
                  onChange={e => setOauth('scopes', e.target.value)} />
              </div>

              {/* Custom endpoints (only for custom provider) */}
              {provider === 'custom' && (
                <div className="space-y-3 p-3 rounded-xl bg-black/5 dark:bg-white/3 border border-glass">
                  <div className="text-[10px] font-bold t-sub uppercase tracking-wider">Custom Endpoints</div>
                  <div>
                    <label className="block text-[10px] t-muted mb-1">Authorization Endpoint</label>
                    <input className={`${inputCls} font-mono text-[11px]`} value={oauth.authEndpoint || ''}
                      placeholder="https://provider.com/oauth2/authorize"
                      onChange={e => setOauth('authEndpoint', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] t-muted mb-1">Token Endpoint</label>
                    <input className={`${inputCls} font-mono text-[11px]`} value={oauth.tokenEndpoint || ''}
                      placeholder="https://provider.com/oauth2/token"
                      onChange={e => setOauth('tokenEndpoint', e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>{saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save Config</>}</Button>
              {!oauth.connected ? (
                <button onClick={handleAuthorize} disabled={isAuthorizing}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${isAuthorizing
                      ? 'opacity-60 cursor-not-allowed border-emerald-500/30 text-emerald-500'
                      : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/60'}`}>
                  {isAuthorizing
                    ? <><RefreshCw size={12} className="animate-spin" /> Authorizing…</>
                    : <><Link2 size={12} /> Authorize</>}
                </button>
              ) : (
                <Button variant="ghost" size="sm" onClick={openTestPanel}>
                  <Mail size={13} /> Send Test Email
                </Button>
              )}
            </div>
            <TestEmailPanel
              open={testPanel} testTo={testTo} setTestTo={setTestTo}
              status={testStatus} message={testMsg}
              onSend={handleSendTest} onClose={() => { setTestPanel(false); setTestStatus(null) }}
              inputCls={inputCls}
            />
          </Card>
        )}

        {/* ── M365 ── */}
        {emailType === 'm365' && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Globe size={16} className="text-blue-500" />
              </div>
              <div>
                <div className="text-sm font-bold t-main">Microsoft 365 / Azure</div>
                <div className="text-xs t-muted">App-only auth via client credentials flow</div>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Tenant ID</label>
                <input className={`${inputCls} font-mono text-[11px]`} value={m365.tenantId || ''} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  onChange={e => setM365('tenantId', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Client (Application) ID</label>
                <input className={`${inputCls} font-mono text-[11px]`} value={m365.clientId || ''} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  onChange={e => setM365('clientId', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Client Secret</label>
                <input type="password" className={inputCls} value={m365.clientSecret || ''} placeholder="••••••••••••"
                  onChange={e => setM365('clientSecret', e.target.value)} />
                <p className="text-[10px] t-sub mt-1">
                  ⚠️ Use the secret <strong>Value</strong> from Azure Portal → App registrations → Certificates &amp; secrets — not the ID (GUID).
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">From Address</label>
                <input className={inputCls} value={m365.from || ''} placeholder="helpdesk@yourorg.onmicrosoft.com"
                  onChange={e => setM365('from', e.target.value)} />
              </div>
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] t-muted leading-relaxed">
                <strong className="text-blue-500 dark:text-blue-400">Required Azure permissions:</strong> Mail.Send (Application)
                <br />Register your app in Azure Portal → App registrations → API permissions
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>{saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save</>}</Button>
              <Button variant="ghost" size="sm" onClick={openTestPanel}>
                <Mail size={13} /> Send Test Email
              </Button>
            </div>
            <TestEmailPanel
              open={testPanel} testTo={testTo} setTestTo={setTestTo}
              status={testStatus} message={testMsg}
              onSend={handleSendTest} onClose={() => { setTestPanel(false); setTestStatus(null) }}
              inputCls={inputCls}
            />
          </Card>
        )}
      </div>
      </div>} {/* end outbound grid */}
    </div>
  )
}

// ─── Alert Settings Section ────────────────────────────────────────────────────
const ALERT_CONDITIONS = [
  {
    key: 'unassigned',
    icon: UserX,
    color: 'text-amber-500',
    iconBg: 'bg-amber-500/12 border-amber-500/25',
    activeBorder: 'border-amber-500/30 bg-amber-500/[0.03]',
    label: 'Unassigned Tickets',
    desc: 'Tickets sitting in the queue with no agent assigned',
    threshold: { key: 'thresholdMins', label: 'Alert after', unit: 'min unassigned', min: 5, max: 1440 },
  },
  {
    key: 'slaBreach',
    icon: AlertCircle,
    color: 'text-rose-500',
    iconBg: 'bg-rose-500/12 border-rose-500/25',
    activeBorder: 'border-rose-500/30 bg-rose-500/[0.03]',
    label: 'SLA Breach',
    desc: 'Tickets that have exceeded their response-time target',
    warning: true,
  },
  {
    key: 'openToday',
    icon: Inbox,
    color: 'text-blue-500',
    iconBg: 'bg-blue-500/12 border-blue-500/25',
    activeBorder: 'border-blue-500/30 bg-blue-500/[0.03]',
    label: 'Open Tickets Today',
    desc: 'New tickets created since midnight — included in reports',
  },
  {
    key: 'onHold',
    icon: PauseCircle,
    color: 'text-violet-500',
    iconBg: 'bg-violet-500/12 border-violet-500/25',
    activeBorder: 'border-violet-500/30 bg-violet-500/[0.03]',
    label: 'On-Hold Tickets',
    desc: 'Tickets stuck in on-hold status beyond a set period',
    threshold: { key: 'thresholdHours', label: 'Alert after', unit: 'hrs on hold', min: 1, max: 168 },
  },
  {
    key: 'inProgress',
    icon: Timer,
    color: 'text-emerald-500',
    iconBg: 'bg-emerald-500/12 border-emerald-500/25',
    activeBorder: 'border-emerald-500/30 bg-emerald-500/[0.03]',
    label: 'Long-Running In Progress',
    desc: 'Active tickets still unresolved after a long time',
    threshold: { key: 'thresholdHours', label: 'Alert after', unit: 'hrs in progress', min: 1, max: 720 },
  },
]

const WEEK_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

function Toggle({ on, onChange, size = 'md' }) {
  const w = size === 'sm' ? 32 : 40
  const h = size === 'sm' ? 18 : 22
  const dot = size === 'sm' ? 14 : 18
  const tx = size === 'sm' ? 'translate-x-[14px]' : 'translate-x-[18px]'
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex-shrink-0 relative focus:outline-none transition-all"
      style={{ width: w, height: h }}
    >
      <div className={`w-full h-full rounded-full transition-colors duration-200 ${on ? 'bg-indigo-500' : 'bg-black/15 dark:bg-white/20'}`} />
      <div className={`absolute top-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? tx : 'translate-x-0.5'}`}
        style={{ width: dot, height: dot }} />
    </button>
  )
}

// ─── Alert Email Config Card ───────────────────────────────────────────────────
const ALERT_EMAIL_TYPES = [
  { id: 'smtp', label: 'SMTP',           icon: '📧' },
  { id: 'm365', label: 'Microsoft 365',  icon: '🔷' },
]

function AlertEmailConfigCard({ alertEdits, setAlertEdits, inputCls }) {
  const [showPass, setShowPass] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const cfg = alertEdits.alertEmailConfig || DEFAULT_ALERT_SETTINGS.alertEmailConfig

  const setEmail  = p => setAlertEdits(s => ({ ...s, alertEmailConfig: { ...(s.alertEmailConfig || DEFAULT_ALERT_SETTINGS.alertEmailConfig), ...p } }))
  const setSmtp   = p => setAlertEdits(s => ({ ...s, alertEmailConfig: { ...(s.alertEmailConfig || DEFAULT_ALERT_SETTINGS.alertEmailConfig), smtp: { ...(s.alertEmailConfig?.smtp || {}), ...p } } }))
  const setM365   = p => setAlertEdits(s => ({ ...s, alertEmailConfig: { ...(s.alertEmailConfig || DEFAULT_ALERT_SETTINGS.alertEmailConfig), m365: { ...(s.alertEmailConfig?.m365 || {}), ...p } } }))

  return (
    <Card>
      <CardHeader
        title="Alert Email Account"
        subtitle="Send alert notifications and reports from a dedicated email address"
      />

      {/* Use same toggle */}
      <div className="flex items-center justify-between p-3.5 rounded-xl border border-glass bg-black/3 dark:bg-white/[0.03] mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/12 border border-indigo-500/25 flex items-center justify-center">
            <Link2 size={15} className="text-indigo-500" />
          </div>
          <div>
            <div className="text-sm font-semibold t-main">Use main Email configuration</div>
            <div className="text-xs t-muted">Reuse the account configured in the Email tab</div>
          </div>
        </div>
        <Toggle on={cfg.useSameAsEmail} onChange={() => setEmail({ useSameAsEmail: !cfg.useSameAsEmail })} />
      </div>

      {/* Dedicated config — shown only when useSameAsEmail is false */}
      {!cfg.useSameAsEmail && (
        <div className="space-y-4">
          {/* Type selector */}
          <div className="flex gap-1.5">
            {ALERT_EMAIL_TYPES.map(({ id, label, icon }) => (
              <button key={id} onClick={() => setEmail({ type: id })}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all
                  ${cfg.type === id
                    ? 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30'
                    : 'border-glass t-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5'}`}>
                <span>{icon}</span>{label}
              </button>
            ))}
          </div>

          {/* SMTP fields */}
          {cfg.type === 'smtp' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-glass bg-black/[0.02] dark:bg-white/[0.02]">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">From Address</label>
                <input className={inputCls} type="email" placeholder="alerts@company.com"
                  value={cfg.smtp?.from || ''}
                  onChange={e => setSmtp({ from: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">SMTP Host</label>
                <input className={inputCls} placeholder="smtp.office365.com"
                  value={cfg.smtp?.host || ''}
                  onChange={e => setSmtp({ host: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Port</label>
                  <input className={inputCls} placeholder="587"
                    value={cfg.smtp?.port || ''}
                    onChange={e => setSmtp({ port: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Security</label>
                  <select className={inputCls} value={cfg.smtp?.security || 'tls'} onChange={e => setSmtp({ security: e.target.value })}>
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Username</label>
                <input className={inputCls} placeholder="alerts@company.com"
                  value={cfg.smtp?.user || ''}
                  onChange={e => setSmtp({ user: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className={`${inputCls} pr-9`} placeholder="••••••••"
                    value={cfg.smtp?.pass || ''}
                    onChange={e => setSmtp({ pass: e.target.value })} />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 t-sub hover:t-main transition-colors">
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Microsoft 365 / Graph fields */}
          {cfg.type === 'm365' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-glass bg-black/[0.02] dark:bg-white/[0.02]">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">From Address</label>
                <input className={inputCls} type="email" placeholder="alerts@company.com"
                  value={cfg.m365?.from || ''}
                  onChange={e => setM365({ from: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Tenant ID</label>
                <input className={inputCls} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={cfg.m365?.tenantId || ''}
                  onChange={e => setM365({ tenantId: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Application (Client) ID</label>
                <input className={inputCls} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={cfg.m365?.clientId || ''}
                  onChange={e => setM365({ clientId: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Client Secret</label>
                <div className="relative">
                  <input type={showSecret ? 'text' : 'password'} className={`${inputCls} pr-9`} placeholder="••••••••"
                    value={cfg.m365?.clientSecret || ''}
                    onChange={e => setM365({ clientSecret: e.target.value })} />
                  <button type="button" onClick={() => setShowSecret(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 t-sub hover:t-main transition-colors">
                    {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <p className="text-[10px] t-sub mt-1">
                  ⚠️ Use the secret <strong>Value</strong> from Azure Portal → App registrations → Certificates &amp; secrets — not the ID (GUID).
                </p>
              </div>
              <div className="sm:col-span-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <p className="text-xs text-blue-500 leading-relaxed">
                  <strong>Required permissions:</strong> Microsoft Graph → <code>Mail.Send</code> (Application permission).
                  Grant admin consent in Azure → App registrations → API permissions.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Report Email Templates Card ──────────────────────────────────────────────
const TEMPLATE_VARS_HINT = [
  { tag: '{date}',        desc: 'Formatted date' },
  { tag: '{month}',       desc: 'Month name' },
  { tag: '{year}',        desc: 'Year number' },
  { tag: '{system_name}', desc: 'Your company/system name' },
]

const _PERIOD_LABEL = { daily: 'today', weekly: 'this week', monthly: 'this month' }

const getReportStatItems = (reportType = 'daily') => {
  const p = _PERIOD_LABEL[reportType] || 'today'
  return [
    { key: 'includeUnassigned',    label: 'Unassigned tickets',   emoji: '👤', color: 'amber' },
    { key: 'includeSla',           label: 'SLA breaches',         emoji: '⚠️',  color: 'rose' },
    { key: 'includeOnHold',        label: 'On-hold tickets',      emoji: '⏸',  color: 'violet' },
    { key: 'includeOpenToday',     label: 'Currently open',       emoji: '📬', color: 'blue' },
    { key: 'includeCreatedToday',  label: `Created ${p}`,         emoji: '📥', color: 'emerald' },
    { key: 'includeResolvedToday', label: `Resolved ${p}`,        emoji: '✅', color: 'teal' },
    { key: 'includeAgentStats',    label: 'Agent status table',   emoji: '👥', color: 'indigo' },
  ]
}

function ReportTemplatesCard({ alertEdits, setAlertEdits, inputCls }) {
  const [activeReport, setActiveReport] = useState('daily')

  const REPORT_TABS = [
    { key: 'daily',   label: 'Daily',   emoji: '📅' },
    { key: 'weekly',  label: 'Weekly',  emoji: '📆' },
    { key: 'monthly', label: 'Monthly', emoji: '🗓️' },
  ]

  const defaults = DEFAULT_ALERT_SETTINGS.reports[activeReport].template
  const tmpl = alertEdits.reports?.[activeReport]?.template || defaults
  const statItems = getReportStatItems(activeReport)

  const setTmpl = patch =>
    setAlertEdits(s => ({
      ...s,
      reports: {
        ...s.reports,
        [activeReport]: {
          ...(s.reports?.[activeReport] || DEFAULT_ALERT_SETTINGS.reports[activeReport]),
          template: { ...(s.reports?.[activeReport]?.template || defaults), ...patch },
        },
      },
    }))

  return (
    <Card>
      <CardHeader
        title="Report Email Templates"
        subtitle="Customise the subject, intro, content and signature for each report type"
      />

      {/* Report type selector */}
      <div className="flex gap-1.5 mb-5">
        {REPORT_TABS.map(({ key, label, emoji }) => (
          <button key={key} onClick={() => setActiveReport(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all
              ${activeReport === key
                ? 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30'
                : 'border-glass t-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5'}`}>
            <span>{emoji}</span>{label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {/* Subject */}
        <div>
          <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">Email Subject</label>
          <input className={inputCls}
            value={tmpl.subject || ''}
            onChange={e => setTmpl({ subject: e.target.value })}
            placeholder={defaults.subject} />
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {TEMPLATE_VARS_HINT.map(({ tag, desc }) => (
              <button key={tag} type="button"
                onClick={() => setTmpl({ subject: (tmpl.subject || '') + tag })}
                title={`Insert ${desc}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/5 dark:bg-white/8 text-[10px] font-mono t-sub hover:t-main hover:bg-indigo-500/10 transition-all">
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Intro text */}
        <div>
          <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">Intro / Preface</label>
          <textarea className={`${inputCls} resize-none`} rows={2}
            value={tmpl.intro || ''}
            onChange={e => setTmpl({ intro: e.target.value })}
            placeholder={defaults.intro} />
        </div>

        {/* What to include */}
        <div>
          <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-2">Include in Report</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {statItems.map(({ key, label, emoji, color }) => {
              const active = tmpl[key] !== false
              const activeCls = {
                amber:   'border-amber-400/40   bg-amber-500/5   text-amber-700   dark:text-amber-400',
                rose:    'border-rose-400/40    bg-rose-500/5    text-rose-700    dark:text-rose-400',
                violet:  'border-violet-400/40  bg-violet-500/5  text-violet-700  dark:text-violet-400',
                blue:    'border-blue-400/40    bg-blue-500/5    text-blue-700    dark:text-blue-400',
                emerald: 'border-emerald-400/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
                teal:    'border-teal-400/40    bg-teal-500/5    text-teal-700    dark:text-teal-400',
                indigo:  'border-indigo-400/40  bg-indigo-500/5  text-indigo-700  dark:text-indigo-400',
              }[color]
              return (
                <label key={key}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all
                    ${active ? activeCls : 'border-glass t-muted hover:border-glass'}`}>
                  <input type="checkbox" checked={active}
                    onChange={e => setTmpl({ [key]: e.target.checked })}
                    className="rounded accent-indigo-500 flex-shrink-0" />
                  <span className="text-xs font-semibold">{emoji} {label}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Footer / Signature */}
        <div>
          <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
            Footer / Signature <span className="normal-case font-normal t-muted">(optional)</span>
          </label>
          <input className={inputCls}
            value={tmpl.footer || ''}
            onChange={e => setTmpl({ footer: e.target.value })}
            placeholder="Powered by Tibos Helpdesk" />
        </div>

        {/* Live preview strip */}
        <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.03]">
          <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Eye size={10} /> Preview
          </div>
          <div className="text-xs t-sub mb-1">
            <span className="font-semibold t-main">Subject: </span>
            {(tmpl.subject || defaults.subject)
              .replace('{date}', new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))
              .replace('{month}', new Date().toLocaleString('default', { month: 'long' }))
              .replace('{year}', new Date().getFullYear())
              .replace('{system_name}', 'Tibos Helpdesk')}
          </div>
          <div className="text-xs t-muted italic">{tmpl.intro || defaults.intro}</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {statItems.filter(({ key }) => tmpl[key] !== false).map(({ emoji, label }) => (
              <span key={label} className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/8 t-sub">
                {emoji} {label}
              </span>
            ))}
          </div>
          {tmpl.footer && <div className="text-[10px] t-muted mt-2 pt-2 border-t border-glass">{tmpl.footer}</div>}
        </div>
      </div>
    </Card>
  )
}

function AlertsSection({ alertEdits, setAlertEdits, inputCls, onSave, onTest, saving }) {
  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState('')

  const setCond = (key, patch) =>
    setAlertEdits(s => ({ ...s, conditions: { ...s.conditions, [key]: { ...s.conditions[key], ...patch } } }))

  const setRep = (key, patch) =>
    setAlertEdits(s => ({ ...s, reports: { ...s.reports, [key]: { ...s.reports[key], ...patch } } }))

  const setReportTimezone = (tz) =>
    setAlertEdits(s => ({ ...s, reports: { ...s.reports, timezone: tz } }))

  const setRecip = (patch) =>
    setAlertEdits(s => ({ ...s, recipients: { ...s.recipients, ...patch } }))

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase()
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Invalid email address'); return }
    if (alertEdits.recipients.emails.includes(email)) { setEmailError('Already added'); return }
    setRecip({ emails: [...alertEdits.recipients.emails, email] })
    setNewEmail(''); setEmailError('')
  }

  const activeCount  = Object.values(alertEdits.conditions).filter(c => c.enabled).length
  const reportCount  = ['daily', 'weekly', 'monthly'].filter(k => alertEdits.reports[k]?.enabled).length
  const recipCount   = (alertEdits.recipients.includeAdmin ? 1 : 0) + alertEdits.recipients.emails.length
  const emailCfg     = alertEdits.alertEmailConfig || DEFAULT_ALERT_SETTINGS.alertEmailConfig
  const emailLabel   = emailCfg.useSameAsEmail ? 'main email' : (emailCfg.type === 'm365' ? 'M365' : 'SMTP')

  return (
    <div className="space-y-5 max-w-3xl">

      {/* ── Summary pills ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {[
          { count: activeCount, label: 'condition',  icon: BellRing,     active: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/25' },
          { count: reportCount, label: 'report',     icon: CalendarDays, active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' },
          { count: recipCount,  label: 'recipient',  icon: Users,        active: 'bg-sky-500/10 text-sky-500 border-sky-500/25' },
        ].map(({ count, label, icon: Icon, active }) => (
          <span key={label}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
              ${count > 0 ? active : 'bg-black/5 dark:bg-white/5 t-muted border-glass'}`}>
            <Icon size={11} />
            {count} {label}{count !== 1 ? 's' : ''} {count > 0 ? 'active' : ''}
          </span>
        ))}
        {/* Email account pill */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-black/5 dark:bg-white/5 t-muted border-glass">
          <Mail size={11} />
          via {emailLabel}
        </span>
      </div>

      {/* ── 1. Alert Conditions ──────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Alert Conditions"
          subtitle="Select which events send email notifications to recipients"
        />
        <div className="space-y-2.5">
          {ALERT_CONDITIONS.map(cfg => {
            const cond = alertEdits.conditions[cfg.key]
            const Icon = cfg.icon
            return (
              <div key={cfg.key}
                className={`rounded-xl border transition-all ${cond.enabled ? cfg.activeBorder : 'border-glass'}`}>
                {/* Row */}
                <div className="flex items-center gap-3 p-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.iconBg}`}>
                    <Icon size={15} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold t-main">{cfg.label}</div>
                    <div className="text-xs t-muted leading-snug mt-0.5">{cfg.desc}</div>
                  </div>
                  <Toggle on={cond.enabled} onChange={() => setCond(cfg.key, { enabled: !cond.enabled })} />
                </div>

                {/* Options row (shown only when enabled) */}
                {cond.enabled && (cfg.threshold || cfg.warning) && (
                  <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 border-t border-black/5 dark:border-white/5 bg-black/[0.015] dark:bg-white/[0.015] rounded-b-xl">
                    {cfg.threshold && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs t-sub whitespace-nowrap">{cfg.threshold.label}</span>
                        <input
                          type="number"
                          min={cfg.threshold.min}
                          max={cfg.threshold.max}
                          value={cond[cfg.threshold.key] ?? cfg.threshold.min}
                          onChange={e => setCond(cfg.key, { [cfg.threshold.key]: Number(e.target.value) })}
                          className="w-16 glass-input text-xs py-1 text-center font-mono"
                        />
                        <span className="text-xs t-sub whitespace-nowrap">{cfg.threshold.unit}</span>
                      </div>
                    )}
                    {cfg.warning && (
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <Toggle
                          size="sm"
                          on={cond.includeWarning ?? false}
                          onChange={() => setCond(cfg.key, { includeWarning: !cond.includeWarning })}
                        />
                        <span className="text-xs t-sub">Also alert at 80% SLA elapsed</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── 2. Scheduled Reports ─────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Scheduled Reports"
          subtitle="Automated digest emails summarising ticket health on a regular schedule"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: 'daily',   emoji: '📅', label: 'Daily',   hint: 'Every day at a set time' },
            { key: 'weekly',  emoji: '📆', label: 'Weekly',  hint: 'Once a week on your chosen day' },
            { key: 'monthly', emoji: '🗓️', label: 'Monthly', hint: 'Once a month on your chosen date' },
          ].map(({ key, emoji, label, hint }) => {
            const rep = alertEdits.reports[key]
            return (
              <div key={key}
                className={`rounded-xl border p-4 transition-all ${rep.enabled ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-glass bg-black/3 dark:bg-white/[0.03]'}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-lg leading-none">{emoji}</span>
                      <span className="text-sm font-bold t-main">{label}</span>
                    </div>
                    <div className="text-[10px] t-muted leading-snug">{hint}</div>
                  </div>
                  <Toggle on={rep.enabled} onChange={() => setRep(key, { enabled: !rep.enabled })} />
                </div>

                {rep.enabled && (
                  <div className="space-y-2.5 pt-3 border-t border-black/8 dark:border-white/8">
                    {key === 'weekly' && (
                      <div>
                        <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Day of week</div>
                        <select value={rep.day ?? 'monday'}
                          onChange={e => setRep(key, { day: e.target.value })}
                          className="glass-input text-xs w-full">
                          {WEEK_DAYS.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
                        </select>
                      </div>
                    )}
                    {key === 'monthly' && (
                      <div>
                        <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Day of month</div>
                        <div className="flex items-center gap-2">
                          <input type="number" min={1} max={28} value={rep.dayOfMonth ?? 1}
                            onChange={e => setRep(key, { dayOfMonth: Number(e.target.value) })}
                            className="glass-input text-xs w-16 text-center font-mono" />
                          <span className="text-xs t-muted">of each month</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Send at</div>
                      <input type="time" value={rep.time ?? '08:00'}
                        onChange={e => setRep(key, { time: e.target.value })}
                        className="glass-input text-xs w-full" />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Report timezone */}
        <div className="mt-4 flex items-center gap-3">
          <Clock size={13} className="t-sub flex-shrink-0" />
          <label className="text-[10px] font-bold t-sub uppercase tracking-wider whitespace-nowrap">Report Timezone</label>
          <select
            className="glass-input text-xs flex-1"
            value={alertEdits.reports?.timezone || 'Asia/Kolkata'}
            onChange={e => setReportTimezone(e.target.value)}
          >
            {(() => {
              const tzGroups = [...new Set(TIMEZONES.map(z => z.group))]
              return tzGroups.map(grp => (
                <optgroup key={grp} label={grp}>
                  {TIMEZONES.filter(z => z.group === grp).map(z => (
                    <option key={z.value} value={z.value}>{z.label}</option>
                  ))}
                </optgroup>
              ))
            })()}
          </select>
        </div>

        {/* What's in every report */}
        <div className="mt-4 p-3 rounded-xl bg-black/3 dark:bg-white/[0.03] border border-glass">
          <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-2">Every report includes</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-1.5 gap-x-3">
            {[
              { emoji: '📬', text: 'Open tickets today' },
              { emoji: '👤', text: 'Unassigned tickets' },
              { emoji: '⚠️',  text: 'SLA breaches' },
              { emoji: '⏸',  text: 'On-hold tickets' },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-xs t-muted">
                <span>{emoji}</span><span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── 3. Report Email Templates ────────────────────────────────────── */}
      <ReportTemplatesCard alertEdits={alertEdits} setAlertEdits={setAlertEdits} inputCls={inputCls} />

      {/* ── 4. Alert Email Account ───────────────────────────────────────── */}
      <AlertEmailConfigCard alertEdits={alertEdits} setAlertEdits={setAlertEdits} inputCls={inputCls} />

      {/* ── 5. Recipients ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Alert Recipients"
          subtitle="Who receives alert emails and scheduled reports"
        />
        <div className="space-y-4">

          {/* Admin toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-glass bg-black/3 dark:bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/12 border border-indigo-500/25 flex items-center justify-center">
                <ShieldCheck size={15} className="text-indigo-500" />
              </div>
              <div>
                <div className="text-sm font-semibold t-main">Admin Account</div>
                <div className="text-xs t-muted">System administrator — recommended to keep enabled</div>
              </div>
            </div>
            <Toggle on={alertEdits.recipients.includeAdmin}
              onChange={() => setRecip({ includeAdmin: !alertEdits.recipients.includeAdmin })} />
          </div>

          {/* Custom email list */}
          <div>
            <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-2">
              Additional Recipients
            </div>

            {/* Add email */}
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <AtSign size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 t-sub pointer-events-none" />
                <input
                  type="email"
                  placeholder="manager@company.com"
                  value={newEmail}
                  onChange={e => { setNewEmail(e.target.value); setEmailError('') }}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                  className={`${inputCls} pl-8 ${emailError ? 'border-rose-500/60 focus:border-rose-500' : ''}`}
                />
              </div>
              <Button variant="primary" size="sm" onClick={addEmail}><Plus size={13} /> Add</Button>
            </div>
            {emailError && <p className="text-xs text-rose-500 mb-2">{emailError}</p>}

            {/* Email list */}
            {alertEdits.recipients.emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-5 rounded-xl border border-dashed border-glass t-muted gap-1.5">
                <Mail size={18} className="opacity-30" />
                <span className="text-xs">No custom recipients added yet</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {alertEdits.recipients.emails.map(email => (
                  <div key={email}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-glass bg-black/3 dark:bg-white/[0.03] group hover:border-rose-500/20 transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-bold text-indigo-500">{email[0].toUpperCase()}</span>
                      </div>
                      <span className="text-xs t-main font-mono">{email}</span>
                    </div>
                    <button
                      onClick={() => setRecip({ emails: alertEdits.recipients.emails.filter(e => e !== email) })}
                      className="p-1 rounded-md t-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Save / Test ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="md" onClick={onSave} disabled={saving}
          className="flex-1 sm:flex-none shadow-glow-indigo">
          {saving
            ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
            : <><Save size={13} /> Save Alert Settings</>}
        </Button>
        <Button variant="ghost" size="md" onClick={onTest}>
          <Send size={13} /> Send Test Alert
        </Button>
        <div className="text-xs t-muted hidden sm:block">
          Test sends an immediate summary to all configured recipients
        </div>
      </div>
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('overview')
  const {
    systemSettings, updateSystemSettings,
    companyProfile, updateCompanyProfile,
    ticketSettings, updateTicketSettings,
    emailTemplates, updateEmailTemplate,
    groups, addGroup, updateGroup, deleteGroup,
    agents, slaSettings, emailConfig, emailTriggers,
    inboundEmail, emailLog,
    categories,
    addAgent, updateAgent, deleteAgent, updateSla,
    updateEmailConfig, updateEmailTriggers,
    updateInboundEmail, addEmailLogEntry, clearEmailLog,
    addCategory, updateCategory, deleteCategory,
    resetAgents,
    fetchAgents, fetchSla, fetchEmailConfig, fetchCategories, fetchGroups,
    fetchInboundConfig, saveInboundConfig, pollInbound,
    fetchInboundLogs, clearInboundLogs,
    alertSettings, fetchAlertSettings, saveAlertSettings, sendTestAlert,
  } = useAdminStore()

  // ── General / System settings state ───────────────────────────────────────
  const [sysEdits, setSysEdits] = useState({
    language:              systemSettings?.language              || 'en',
    timezone:              systemSettings?.timezone              || 'Asia/Kolkata',
    sessionTimeoutMinutes: systemSettings?.sessionTimeoutMinutes ?? 480,
  })

  const handleSaveSystem = () => {
    updateSystemSettings(sysEdits)
    addToast('General settings saved', 'success')
  }

  const [companyEdits, setCompanyEdits] = useState({ ...companyProfile })
  const logoInputRef = useRef(null)

  // ── Ticket Settings local state ──────────────────────────────────────────
  const [tktEdits, setTktEdits] = useState({ ...ticketSettings })
  const [tplEdits, setTplEdits] = useState({
    ticketOpen:       { ...(emailTemplates.ticketOpen       || DEFAULT_EMAIL_TEMPLATES.ticketOpen) },
    ticketInProgress: { ...(emailTemplates.ticketInProgress || DEFAULT_EMAIL_TEMPLATES.ticketInProgress) },
    ticketOnHold:     { ...(emailTemplates.ticketOnHold     || DEFAULT_EMAIL_TEMPLATES.ticketOnHold) },
    ticketResolved:   { ...(emailTemplates.ticketResolved   || DEFAULT_EMAIL_TEMPLATES.ticketResolved) },
    ticketClosed:     { ...(emailTemplates.ticketClosed     || DEFAULT_EMAIL_TEMPLATES.ticketClosed) },
    agentReply:       { ...(emailTemplates.agentReply       || DEFAULT_EMAIL_TEMPLATES.agentReply) },
  })

  const formatPreview = `${tktEdits.numberPrefix}-${'0'.repeat(Math.max(1, Number(tktEdits.numberDigits) - 1))}1`

  // Fetch fresh categories + groups whenever the Groups tab is opened
  useEffect(() => {
    if (tab === 'groups') {
      fetchCategories()
      fetchGroups()
    }
  }, [tab])

  const handleSaveTicketSettings = async () => {
    try {
      await updateTicketSettings(tktEdits)
      addToast('Ticket settings saved — new tickets will use this format', 'success')
    } catch {
      addToast('Failed to save ticket settings', 'error')
    }
  }

  const handleSaveTemplate = (key) => {
    updateEmailTemplate(key, tplEdits[key])
    addToast('Email template saved', 'success')
  }

  const insertVar = (key, field, tag) => {
    setTplEdits(p => ({ ...p, [key]: { ...p[key], [field]: p[key][field] + tag } }))
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { addToast('Logo must be under 2 MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setCompanyEdits(p => ({ ...p, logo: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const handleSaveCompany = () => {
    updateCompanyProfile(companyEdits)
    addToast('Company profile saved', 'success')
  }

  // ── Groups local state ────────────────────────────────────────────────────
  const [newGroup, setNewGroup] = useState({ name: '', description: '', color: '#3B82F6' })
  const [editingGroupId, setEditingGroupId] = useState(null)
  const [editingGroupData, setEditingGroupData] = useState({})

  const handleAddGroup = (e) => {
    e.preventDefault()
    if (!newGroup.name.trim()) { addToast('Group name is required', 'error'); return }
    addGroup(newGroup)
    setNewGroup({ name: '', description: '', color: '#3B82F6' })
    addToast(`Group "${newGroup.name}" added`, 'success')
  }

  const startEditGroup  = (g) => { setEditingGroupId(g.id); setEditingGroupData({ name: g.name, description: g.description, color: g.color }) }
  const saveEditGroup   = (id) => { updateGroup(id, editingGroupData); setEditingGroupId(null); addToast('Group updated', 'success') }
  const cancelEditGroup = ()   => setEditingGroupId(null)

  // ── Nested category state (within Groups tab) ─────────────────────────────
  const [expandedGroups, setExpandedGroups] = useState(() => new Set(groups.map(g => g.id)))
  const [addCatGroupId,  setAddCatGroupId]  = useState(null)
  const [newCatForm,     setNewCatForm]     = useState({ name: '', color: '#3B82F6', description: '' })
  const [editCatId,      setEditCatId]      = useState(null)
  const [editCatForm,    setEditCatForm]    = useState({})

  const toggleGroupExpand = (id) => setExpandedGroups(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleAddCatToGroup = (e, groupId) => {
    e.preventDefault()
    if (!newCatForm.name.trim()) { addToast('Category name is required', 'error'); return }
    addCategory({ ...newCatForm, groupId })
    setNewCatForm({ name: '', color: '#3B82F6', description: '' })
    setAddCatGroupId(null)
    addToast(`Category "${newCatForm.name}" added`, 'success')
  }
  const { tickets, fetchTickets } = useTicketStore()
  const { addToast } = useUiStore()
  const { currentUser } = useUserStore()

  const handleRefresh = () => {
    fetchAgents()
    fetchSla()
    fetchEmailConfig()
    fetchInboundConfig()
    fetchInboundLogs()
    fetchCategories()
    fetchGroups()
    addToast('Data refreshed', 'success')
  }
  const [selectedTicket, setSelectedTicket] = useState(null)

  const unassigned = tickets.filter(t => !t.assignee && !['resolved', 'closed'].includes(t.status))

  const [newAgent, setNewAgent] = useState({ name: '', group: '', username: '', password: '', role: 'technician' })
  const [editAgent, setEditAgent] = useState(null)   // agent being edited
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)

  const openEditAgent = (agent) => {
    setEditAgent(agent)
    setEditForm({ name: agent.name, group: agent.group || '', username: agent.username || '', role: agent.role || 'technician', password: '' })
  }
  const closeEditAgent = () => { setEditAgent(null); setEditForm({}) }

  const handleSaveAgent = async (e) => {
    e.preventDefault()
    if (!editForm.name || !editForm.username) { addToast('Name and username are required', 'error'); return }
    setEditSaving(true)
    try {
      const changes = { name: editForm.name, group: editForm.group, username: editForm.username, role: editForm.role }
      if (editForm.password) changes.password = editForm.password
      await updateAgent(String(editAgent.id), changes)
      addToast('Agent updated', 'success')
      closeEditAgent()
    } catch (err) {
      addToast(err.message || 'Failed to update agent', 'error')
    } finally {
      setEditSaving(false)
    }
  }
  const [slaEdits, setSlaEdits] = useState({
    critical: slaSettings.critical ?? 1,
    high:     slaSettings.high     ?? 4,
    medium:   slaSettings.medium   ?? 8,
    low:      slaSettings.low      ?? 24,
    timerStart:    slaSettings.timerStart    || 'on_creation',
    countdownMode: slaSettings.countdownMode || '24_7',
    workDays:      slaSettings.workDays      || [0,1,2,3,4],
    workStart:     slaSettings.workStart     || '09:00',
    workEnd:       slaSettings.workEnd       || '20:00',
    pauseOn:       slaSettings.pauseOn       || ['on-hold'],
  })
  const [emailEdits, setEmailEdits] = useState({ ...emailConfig })
  const [emailSaving, setEmailSaving] = useState(false)
  const [triggersEdits, setTriggersEdits] = useState({ ...emailTriggers })
  const [inboundEdits, setInboundEdits] = useState({ ...inboundEmail })

  // Sync local edits when store values change (e.g. after fetchEmailConfig).
  // Preserve the user's active type selection and any unsaved secrets.
  useEffect(() => { setEmailEdits(prev => ({ ...emailConfig, type: prev.type || emailConfig.type, smtp: { ...emailConfig.smtp, pass: prev.smtp?.pass || emailConfig.smtp?.pass || '' }, m365: { ...emailConfig.m365, clientSecret: prev.m365?.clientSecret || emailConfig.m365?.clientSecret || '' } })) }, [emailConfig])
  useEffect(() => { setTriggersEdits(prev => ({ ...emailTriggers, ...prev })) }, [emailTriggers])
  useEffect(() => { setInboundEdits(prev => ({ ...inboundEmail, imapPass: prev.imapPass || '' })) }, [inboundEmail])

  const handleAddAgent = async (e) => {
    e.preventDefault()
    if (!newAgent.name || !newAgent.group || !newAgent.username || !newAgent.password) {
      addToast('All fields required', 'error'); return
    }
    try {
      await addAgent(newAgent)
      setNewAgent({ name: '', group: '', username: '', password: '', role: 'technician' })
      addToast('Agent added', 'success')
    } catch (err) {
      addToast(err.message || 'Failed to add agent', 'error')
    }
  }

  const handleSaveSla = async () => {
    try {
      await updateSla(slaEdits)
      await fetchTickets()   // refresh all tickets so new sla_due_at values appear immediately
      addToast('SLA settings saved — all active tickets updated', 'success')
    } catch (err) {
      addToast(err.message || 'Failed to save SLA', 'error')
    }
  }

  const handleSaveEmail = async () => {
    setEmailSaving(true)
    try {
      const type = emailEdits.type || 'smtp'
      const payload = {
        type,
        triggers: {
          trigger_new:      triggersEdits.new     ?? false,
          trigger_assign:   triggersEdits.assign  ?? false,
          trigger_resolve:  triggersEdits.resolve ?? false,
          trigger_timezone: triggersEdits.timezone || 'Asia/Kolkata',
        },
      }
      if (type === 'smtp') {
        payload.smtp = {
          host:         emailEdits.smtp?.host     || '',
          port:         emailEdits.smtp?.port     || '587',
          security:     emailEdits.smtp?.security || 'tls',
          from_address: emailEdits.smtp?.from     || '',
          user:         emailEdits.smtp?.user     || '',
          password:     emailEdits.smtp?.pass     || '',
        }
      } else if (type === 'm365') {
        payload.m365 = {
          tenant_id:     emailEdits.m365?.tenantId     || '',
          client_id:     emailEdits.m365?.clientId     || '',
          client_secret: emailEdits.m365?.clientSecret || '',
          from_address:  emailEdits.m365?.from         || '',
        }
      } else if (type === 'oauth') {
        payload.oauth = {
          provider:       emailEdits.oauth?.provider      || 'google',
          client_id:      emailEdits.oauth?.clientId      || '',
          client_secret:  emailEdits.oauth?.clientSecret  || '',
          redirect_uri:   emailEdits.oauth?.redirectUri   || '',
          scopes:         emailEdits.oauth?.scopes        || '',
          auth_endpoint:  emailEdits.oauth?.authEndpoint  || '',
          token_endpoint: emailEdits.oauth?.tokenEndpoint || '',
          from_address:   emailEdits.oauth?.from          || '',
        }
      }
      await updateEmailConfig(payload)
      addToast('Email settings saved', 'success')
    } catch (err) {
      const msg = err?.message || ''
      const display = msg === 'Failed to fetch'
        ? 'Could not reach the server — check your network connection and try again.'
        : msg || 'Failed to save email config'
      addToast(display, 'error')
    } finally {
      setEmailSaving(false)
    }
  }

  const handleTestEmail = () => addToast('Test email sent successfully', 'success')

  const handleSaveInbound = async () => {
    try {
      await saveInboundConfig(inboundEdits)
      addToast('Inbound email settings saved', 'success')
    } catch (err) {
      addToast(err.message || 'Failed to save inbound email config', 'error')
    }
  }

  const handlePollNow = async () => {
    try {
      const result = await pollInbound()
      await fetchInboundLogs()   // reload the log table with real DB entries
      if (result.error) {
        addToast(`Poll completed with error: ${result.error}`, 'error')
      } else {
        addToast(
          result.processed > 0
            ? `${result.processed} email${result.processed > 1 ? 's' : ''} converted to ticket${result.processed > 1 ? 's' : ''}`
            : 'Poll complete — no new emails',
          result.processed > 0 ? 'success' : 'info'
        )
      }
    } catch (err) {
      addToast(err.message || 'Poll failed — check inbound email config', 'error')
    }
  }

  const handleClearLog = async () => {
    try {
      await clearInboundLogs()
      addToast('Log cleared', 'info')
    } catch (err) {
      addToast(err.message || 'Failed to clear log', 'error')
    }
  }

  const agentWorkload = agents.map(a => ({
    ...a,
    count: tickets.filter(t => t.assignee === String(a.id) && !['resolved', 'closed'].includes(t.status)).length,
  })).sort((a, b) => b.count - a.count)

  const maxWorkload = Math.max(...agentWorkload.map(a => a.count), 1)
  const inputCls = 'glass-input w-full text-sm'

  // ── Alert Settings state ───────────────────────────────────────────────────
  const [alertEdits, setAlertEdits] = useState(() => alertSettings || DEFAULT_ALERT_SETTINGS)
  const [alertSaving, setAlertSaving] = useState(false)

  // Sync when store loads real settings — deep-merge so new fields get defaults
  useEffect(() => {
    const s = alertSettings || {}
    const d = DEFAULT_ALERT_SETTINGS
    setAlertEdits({
      ...d, ...s,
      reports: {
        timezone: s.reports?.timezone || d.reports.timezone,
        daily:    { ...d.reports.daily,   ...(s.reports?.daily   || {}), template: { ...d.reports.daily.template,   ...(s.reports?.daily?.template   || {}) } },
        weekly:   { ...d.reports.weekly,  ...(s.reports?.weekly  || {}), template: { ...d.reports.weekly.template,  ...(s.reports?.weekly?.template  || {}) } },
        monthly:  { ...d.reports.monthly, ...(s.reports?.monthly || {}), template: { ...d.reports.monthly.template, ...(s.reports?.monthly?.template || {}) } },
      },
      alertEmailConfig: { ...d.alertEmailConfig, ...(s.alertEmailConfig || {}),
        smtp: { ...d.alertEmailConfig.smtp, ...(s.alertEmailConfig?.smtp || {}) },
        m365: { ...d.alertEmailConfig.m365, ...(s.alertEmailConfig?.m365 || {}) },
      },
    })
  }, [alertSettings])

  // Fetch alert settings whenever the alerts tab is opened
  useEffect(() => {
    if (tab === 'alerts') fetchAlertSettings()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveAlerts = async () => {
    setAlertSaving(true)
    try {
      await saveAlertSettings(alertEdits)
      addToast('Alert settings saved', 'success')
    } catch (err) {
      addToast(err?.message || 'Failed to save alert settings', 'error')
    } finally {
      setAlertSaving(false)
    }
  }

  const handleTestAlert = async () => {
    try {
      const result = await sendTestAlert()
      addToast(
        result?.sent > 0
          ? `Test alert sent to ${result.sent} recipient${result.sent > 1 ? 's' : ''}`
          : 'Test alert sent',
        'success'
      )
    } catch (err) {
      const msg = err?.message || ''
      // "Failed to fetch" = network / CORS issue — give a clear hint
      const display = msg === 'Failed to fetch'
        ? 'Could not reach the server — check network and ensure backend is running'
        : msg || 'Test alert failed — check email configuration'
      addToast(display, 'error')
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold t-main">Admin Panel</h1>
          <p className="text-sm t-muted mt-0.5">System configuration and management</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} className="self-start sm:self-auto flex-shrink-0">
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto pb-0.5">
        <div className="flex gap-1 p-1 glass-card w-fit min-w-full sm:min-w-0 border border-glass">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${tab === id ? 'bg-indigo-600/30 dark:bg-indigo-600/30 t-main border border-indigo-500/30' : 't-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5'}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* General / System Settings */}
      {tab === 'general' && (
        <div className="space-y-4 max-w-2xl">

          {/* Language & Region */}
          <Card>
            <CardHeader
              title="Language & Region"
              subtitle="Set the interface language and display timezone for the ticketing tool"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Language picker */}
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
                  <Globe size={11} className="inline mr-1" />Interface Language
                </label>
                <select
                  className={inputCls}
                  value={sysEdits.language}
                  onChange={e => setSysEdits(p => ({ ...p, language: e.target.value }))}
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name} — {l.nativeName}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] t-sub mt-1">
                  Status labels, navigation, and form fields will display in the selected language.
                </p>
              </div>

              {/* Timezone picker */}
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
                  <Clock size={11} className="inline mr-1" />Timezone
                </label>
                <select
                  className={inputCls}
                  value={sysEdits.timezone}
                  onChange={e => setSysEdits(p => ({ ...p, timezone: e.target.value }))}
                >
                  {(() => {
                    const tzGroups = [...new Set(TIMEZONES.map(z => z.group))]
                    return tzGroups.map(grp => (
                      <optgroup key={grp} label={grp}>
                        {TIMEZONES.filter(z => z.group === grp).map(z => (
                          <option key={z.value} value={z.value}>{z.label}</option>
                        ))}
                      </optgroup>
                    ))
                  })()}
                </select>
                <p className="text-[10px] t-sub mt-1">
                  All timestamps (SLA, created, updated) will be displayed in this timezone.
                </p>
              </div>
            </div>

            {/* Live preview */}
            <div className="mt-4 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 flex items-center gap-3">
              <Globe size={14} className="text-indigo-400 flex-shrink-0" />
              <div className="text-xs t-sub">
                <span className="font-semibold t-main">Preview: </span>
                {(() => {
                  try {
                    return new Date().toLocaleString('en-US', {
                      timeZone: sysEdits.timezone,
                      weekday: 'short', month: 'short', day: 'numeric',
                      year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })
                  } catch {
                    return 'Invalid timezone'
                  }
                })()}
                {' '}({TIMEZONES.find(z => z.value === sysEdits.timezone)?.label?.split(' — ')[0] || sysEdits.timezone})
              </div>
            </div>
          </Card>

          {/* Session Management */}
          <Card>
            <CardHeader
              title="Session Management"
              subtitle="Automatically log out inactive users to keep the system secure"
            />
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
                  <Timer size={11} className="inline mr-1" />Session Timeout
                </label>
                <select
                  className={`${inputCls} max-w-xs`}
                  value={sysEdits.sessionTimeoutMinutes}
                  onChange={e => setSysEdits(p => ({ ...p, sessionTimeoutMinutes: Number(e.target.value) }))}
                >
                  {SESSION_TIMEOUTS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="text-[10px] t-sub mt-1.5">
                  Users will be automatically logged out after the specified period of inactivity
                  (no mouse movement, keystrokes, or clicks).
                  {sysEdits.sessionTimeoutMinutes === 0 && (
                    <span className="text-amber-500 font-medium"> Sessions will never expire — not recommended for shared devices.</span>
                  )}
                </p>
              </div>

              {/* Visual indicator */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-black/3 dark:bg-white/3 border border-glass">
                <ShieldCheck size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] t-sub leading-relaxed">
                  {sysEdits.sessionTimeoutMinutes === 0
                    ? 'Sessions will persist indefinitely until the user manually logs out.'
                    : `After ${SESSION_TIMEOUTS.find(o => o.value === sysEdits.sessionTimeoutMinutes)?.label || sysEdits.sessionTimeoutMinutes + ' min'} of inactivity, the user is logged out and all local data is cleared.`
                  }
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-glass flex items-center justify-between">
              <p className="text-[10px] t-muted">
                Language and timezone changes apply immediately without a page reload.
              </p>
              <Button variant="primary" size="sm" onClick={handleSaveSystem}>
                <Save size={13} /> Save General Settings
              </Button>
            </div>
          </Card>

        </div>
      )}

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Unassigned Tickets" subtitle={`${unassigned.length} tickets need assignment`} />
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {unassigned.length === 0
                ? <div className="py-6 text-center text-sm t-sub">All tickets are assigned</div>
                : unassigned.map(t => (
                  <div key={t._uuid} onClick={() => setSelectedTicket(t)}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all group">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono t-sub mb-0.5">{t.id}</div>
                      <div className="text-sm t-main font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">{t.subject}</div>
                    </div>
                    <PriorityBadge priority={t.priority} />
                  </div>
                ))
              }
            </div>
          </Card>

          <Card>
            <CardHeader title="Agent Workload" subtitle="Active tickets per agent" />
            <div className="space-y-3">
              {agentWorkload.map(agent => (
                <div key={String(agent.id)} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 dark:from-indigo-500/40 dark:to-violet-500/40 border border-indigo-500/20 flex items-center justify-center text-xs font-bold t-main flex-shrink-0">
                    {agent.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs t-muted">{agent.name}</span>
                      <span className="text-xs t-sub">{agent.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/8 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all shadow-glow-indigo"
                        style={{ width: `${(agent.count / maxWorkload) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Company */}
      {tab === 'company' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Basic Information */}
          <Card>
            <CardHeader title="Basic Information" subtitle="Details available in email templates" />
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
                  <Building2 size={11} /> Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  className={inputCls}
                  value={companyEdits.name}
                  onChange={e => setCompanyEdits(p => ({ ...p, name: e.target.value }))}
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
                  <Globe size={11} /> Website
                </label>
                <input
                  className={inputCls}
                  value={companyEdits.website}
                  onChange={e => setCompanyEdits(p => ({ ...p, website: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
                  <Phone size={11} /> Phone Number
                </label>
                <input
                  className={inputCls}
                  value={companyEdits.phone}
                  onChange={e => setCompanyEdits(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
                  <MapPin size={11} /> Address
                </label>
                <textarea
                  rows={3}
                  className={inputCls + ' resize-none'}
                  value={companyEdits.address}
                  onChange={e => setCompanyEdits(p => ({ ...p, address: e.target.value }))}
                  placeholder="123 Main Street, City, State, ZIP"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="primary" size="sm" onClick={handleSaveCompany}>
                  <Save size={13} /> Save Changes
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCompanyEdits({ ...companyProfile })}>
                  Reset Changes
                </Button>
              </div>
            </div>
          </Card>

          {/* Logo */}
          <Card>
            <CardHeader title="Company Logo" subtitle="Displayed in the sidebar and emails" />
            <div className="space-y-4">
              {/* Logo preview */}
              <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-glass bg-black/3 dark:bg-white/3 h-40 relative overflow-hidden">
                {companyEdits.logo ? (
                  <>
                    <img
                      src={companyEdits.logo}
                      alt="Company logo"
                      className="max-h-36 max-w-full object-contain p-2"
                    />
                    <button
                      onClick={() => setCompanyEdits(p => ({ ...p, logo: null }))}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 t-muted">
                    <ImagePlus size={32} className="opacity-40" />
                    <span className="text-xs opacity-60">No logo uploaded</span>
                  </div>
                )}
              </div>

              {/* Upload button */}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Button variant="secondary" size="sm" className="w-full" onClick={() => logoInputRef.current?.click()}>
                <ImagePlus size={13} /> {companyEdits.logo ? 'Change Logo' : 'Upload Logo'}
              </Button>
              <p className="text-[10px] t-sub text-center">PNG, JPG, SVG or WebP · Max 2 MB</p>

              <div className="flex gap-2 pt-1">
                <Button variant="primary" size="sm" onClick={handleSaveCompany} className="flex-1">
                  <Save size={13} /> Save Changes
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCompanyEdits(p => ({ ...p, logo: companyProfile.logo }))}>
                  Reset
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tickets */}
      {tab === 'tickets' && (
        <div className="space-y-4">

          {/* ── Ticket Number Series ───────────────────────────────────── */}
          <Card>
            <CardHeader title="Ticket Number Series" subtitle="Configure how ticket IDs are generated" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
                    Ticket Number Prefix
                  </label>
                  <input
                    className={inputCls}
                    value={tktEdits.numberPrefix}
                    maxLength={10}
                    onChange={e => setTktEdits(p => ({ ...p, numberPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                    placeholder="TKT"
                  />
                  <p className="text-[10px] t-sub mt-1">Letters and numbers only (e.g. TKT, INC, REQ)</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
                    Number of Digits
                  </label>
                  <select
                    className={inputCls}
                    value={tktEdits.numberDigits}
                    onChange={e => setTktEdits(p => ({ ...p, numberDigits: Number(e.target.value) }))}
                  >
                    {[3,4,5,6].map(d => (
                      <option key={d} value={d}>{d} digits — {'0'.repeat(d-1)}1</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
                    Default Status
                  </label>
                  <select
                    className={inputCls}
                    value={tktEdits.defaultStatus}
                    onChange={e => setTktEdits(p => ({ ...p, defaultStatus: e.target.value }))}
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="on-hold">On Hold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">
                    Default Priority
                  </label>
                  <select
                    className={inputCls}
                    value={tktEdits.defaultPriority}
                    onChange={e => setTktEdits(p => ({ ...p, defaultPriority: e.target.value }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <Button variant="primary" size="sm" onClick={handleSaveTicketSettings}>
                  <Save size={13} /> Save Settings
                </Button>
              </div>

              {/* Preview */}
              <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-glass bg-black/3 dark:bg-white/3">
                <p className="text-[10px] font-bold t-sub uppercase tracking-widest">Format Preview</p>
                <div className="text-3xl font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-wide">
                  {formatPreview}
                </div>
                <p className="text-xs t-muted text-center">
                  New tickets will be numbered like this.<br />
                  Existing tickets are not renamed.
                </p>
              </div>
            </div>
          </Card>

        </div>
      )}

      {/* Groups & Categories */}
      {tab === 'groups' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* ── Left: Create New Group ───────────────────────────── */}
          <div className="xl:col-span-1">
            <Card>
              <CardHeader title="Create New Group" subtitle="Groups contain categories" />
              <form onSubmit={handleAddGroup} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">Group Name *</label>
                  <input className={inputCls} value={newGroup.name}
                    onChange={e => setNewGroup(g => ({ ...g, name: e.target.value }))}
                    placeholder="e.g. Microsoft 365" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">Description</label>
                  <input className={inputCls} value={newGroup.description}
                    onChange={e => setNewGroup(g => ({ ...g, description: e.target.value }))}
                    placeholder="What does this group cover?" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1.5">Color</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {GROUP_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setNewGroup(g => ({ ...g, color: c }))}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${newGroup.color === c ? 'border-white scale-110 shadow-md' : 'border-transparent'}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <Button type="submit" variant="primary" size="sm" className="w-full">
                  <Plus size={13} /> Add Group
                </Button>
              </form>
            </Card>
          </div>

          {/* ── Right: Groups with nested Categories ─────────────── */}
          <div className="xl:col-span-2 space-y-3">
            {groups.map(group => {
              const groupCats    = categories.filter(c => c.groupId === group.id).sort((a,b) => a.sortOrder - b.sortOrder)
              const isExpanded   = expandedGroups.has(group.id)
              const isEditingGrp = editingGroupId === group.id
              const isAddingCat  = addCatGroupId === group.id

              return (
                <div key={group.id} className="rounded-2xl border border-glass overflow-hidden glass-card">

                  {/* Group Header */}
                  <div className="flex items-center gap-3 px-4 py-3"
                    style={{ background: group.color + '12', borderBottom: isExpanded ? `1px solid ${group.color}25` : 'none' }}>

                    {isEditingGrp ? (
                      /* Inline edit group */
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2 items-center">
                          <input className={inputCls + ' flex-1 text-sm'} value={editingGroupData.name}
                            onChange={e => setEditingGroupData(d => ({ ...d, name: e.target.value }))} />
                          <div className="flex gap-1 flex-shrink-0">
                            {GROUP_COLORS.map(c => (
                              <button key={c} type="button" onClick={() => setEditingGroupData(d => ({ ...d, color: c }))}
                                className={`w-5 h-5 rounded-full border-2 ${editingGroupData.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                                style={{ background: c }} />
                            ))}
                          </div>
                        </div>
                        <input className={inputCls + ' text-xs'} value={editingGroupData.description}
                          onChange={e => setEditingGroupData(d => ({ ...d, description: e.target.value }))}
                          placeholder="Description" />
                        <div className="flex gap-2">
                          <Button variant="primary" size="sm" onClick={() => saveEditGroup(group.id)}><Save size={11}/> Save</Button>
                          <Button variant="ghost" size="sm" onClick={cancelEditGroup}><X size={11}/> Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Color icon */}
                        <button onClick={() => toggleGroupExpand(group.id)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform hover:scale-105"
                          style={{ background: group.color + '30', border: `1.5px solid ${group.color}50` }}>
                          <div className="w-3.5 h-3.5 rounded-full" style={{ background: group.color }} />
                        </button>

                        {/* Group info */}
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleGroupExpand(group.id)}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold t-main">{group.name}</span>
                            {group.isBuiltin && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 t-sub">Built-in</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] t-muted">{groupCats.length} categor{groupCats.length !== 1 ? 'ies' : 'y'}</span>
                            {group.description && <span className="text-[10px] t-sub truncate">{group.description}</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => { setAddCatGroupId(isAddingCat ? null : group.id); if (!isExpanded) toggleGroupExpand(group.id) }}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
                            style={{ color: group.color, borderColor: group.color+'40', background: group.color+'15' }}>
                            <Plus size={11}/> Add Category
                          </button>
                          <button onClick={() => startEditGroup(group)}
                            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 t-sub hover:t-main transition-all">
                            <Pencil size={12}/>
                          </button>
                          <button onClick={() => { deleteGroup(group.id); addToast('Group deleted', 'info') }}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 t-sub hover:text-rose-500 transition-all">
                            <Trash2 size={12}/>
                          </button>
                          <button onClick={() => toggleGroupExpand(group.id)} className="p-1.5 t-sub hover:t-main transition-all">
                            <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 py-3 space-y-2">

                      {/* Add Category inline form */}
                      {isAddingCat && (
                        <form onSubmit={e => handleAddCatToGroup(e, group.id)}
                          className="flex flex-wrap items-end gap-2 p-3 rounded-xl mb-3"
                          style={{ background: group.color+'08', border: `1px dashed ${group.color}40` }}>
                          <div className="flex-1 min-w-32">
                            <div className="text-[10px] t-sub mb-1">Category Name *</div>
                            <input className={inputCls + ' text-sm'} value={newCatForm.name}
                              onChange={e => setNewCatForm(f => ({ ...f, name: e.target.value }))}
                              placeholder="e.g. Exchange Email" autoFocus />
                          </div>
                          <div className="flex-1 min-w-32">
                            <div className="text-[10px] t-sub mb-1">Description</div>
                            <input className={inputCls + ' text-sm'} value={newCatForm.description}
                              onChange={e => setNewCatForm(f => ({ ...f, description: e.target.value }))}
                              placeholder="Optional" />
                          </div>
                          <div>
                            <div className="text-[10px] t-sub mb-1">Color</div>
                            <div className="flex gap-1">
                              {GROUP_COLORS.map(c => (
                                <button key={c} type="button" onClick={() => setNewCatForm(f => ({ ...f, color: c }))}
                                  className={`w-5 h-5 rounded-full border-2 transition-all ${newCatForm.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                                  style={{ background: c }} />
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <Button type="submit" variant="primary" size="sm"><Plus size={11}/> Add</Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setAddCatGroupId(null)}><X size={11}/></Button>
                          </div>
                        </form>
                      )}

                      {/* Categories list */}
                      {groupCats.length === 0 && !isAddingCat ? (
                        <div className="text-xs t-muted text-center py-4 opacity-60">
                          No categories yet — click <strong>Add Category</strong> to create one
                        </div>
                      ) : (
                        groupCats.map(cat => (
                          <div key={cat.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-glass hover:bg-black/5 dark:hover:bg-white/3 transition-all group">
                            {/* Color dot */}
                            <div className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center"
                              style={{ background: (editCatId===cat.id ? editCatForm.color : cat.color)+'22', border: `1.5px solid ${(editCatId===cat.id ? editCatForm.color : cat.color)}50` }}>
                              <span className="w-2 h-2 rounded-full" style={{ background: editCatId===cat.id ? editCatForm.color : cat.color }} />
                            </div>

                            {editCatId === cat.id ? (
                              /* Inline edit category */
                              <div className="flex-1 flex flex-wrap items-center gap-2">
                                <input className={inputCls + ' flex-1 min-w-28 text-xs'} value={editCatForm.name}
                                  onChange={e => setEditCatForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                                <input className={inputCls + ' flex-1 min-w-28 text-xs'} value={editCatForm.description||''}
                                  onChange={e => setEditCatForm(f => ({ ...f, description: e.target.value }))}
                                  placeholder="Description" />
                                <div className="flex gap-1">
                                  {GROUP_COLORS.map(c => (
                                    <button key={c} type="button" onClick={() => setEditCatForm(f => ({ ...f, color: c }))}
                                      className={`w-4 h-4 rounded-full border-2 ${editCatForm.color===c ? 'border-white scale-110' : 'border-transparent'}`}
                                      style={{ background: c }} />
                                  ))}
                                </div>
                                <Button variant="primary" size="sm" onClick={() => { updateCategory(cat.id, editCatForm); setEditCatId(null); addToast('Category updated','success') }}><Save size={11}/></Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditCatId(null)}><X size={11}/></Button>
                              </div>
                            ) : (
                              <>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium t-main">{cat.name}</span>
                                    {cat.isBuiltin && <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 t-sub font-bold uppercase">Built-in</span>}
                                  </div>
                                  {cat.description && <div className="text-[10px] t-muted mt-0.5">{cat.description}</div>}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditCatId(cat.id); setEditCatForm({ name: cat.name, color: cat.color, description: cat.description||'' }) }}
                                    className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-indigo-400 hover:text-indigo-500 transition-all">
                                    <Pencil size={12}/>
                                  </button>
                                  <button onClick={() => { deleteCategory(cat.id); addToast('Category deleted','info') }}
                                    className="p-1.5 rounded-lg hover:bg-rose-500/15 t-sub hover:text-rose-500 transition-all">
                                    <Trash2 size={12}/>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Ungrouped categories — shown only as a cleanup warning if any exist */}
            {(() => {
              const ungrouped = categories.filter(c => !c.groupId)
              if (!ungrouped.length) return null
              return (
                <div className="rounded-2xl border border-dashed border-rose-400/40 overflow-hidden bg-rose-500/3">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <span className="text-xs font-bold text-rose-500">
                        {ungrouped.length} ungrouped categor{ungrouped.length !== 1 ? 'ies' : 'y'} — assign them to a group or delete
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        for (const cat of ungrouped) await deleteCategory(cat.id)
                        addToast('All ungrouped categories removed', 'info')
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:text-rose-400 border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-all">
                      <Trash2 size={11}/> Delete All
                    </button>
                  </div>
                  <div className="px-4 pb-3 space-y-1.5">
                    {ungrouped.map(cat => (
                      <div key={cat.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-200/30 dark:border-rose-500/10 bg-white/50 dark:bg-white/3 group">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                        <span className="text-xs font-medium t-main flex-1">{cat.name}</span>
                        <button
                          onClick={() => { deleteCategory(cat.id); addToast('Category deleted', 'info') }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-rose-500/15 t-sub hover:text-rose-500 transition-all">
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Agents */}
      {tab === 'agents' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Add New Agent" />
            <form onSubmit={handleAddAgent} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Full Name</label>
                  <input className={inputCls} value={newAgent.name} onChange={e => setNewAgent(a => ({ ...a, name: e.target.value }))} placeholder="Jane Smith" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Group / Team</label>
                  <input className={inputCls} value={newAgent.group} onChange={e => setNewAgent(a => ({ ...a, group: e.target.value }))} placeholder="L1 Support" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Username</label>
                  <input className={inputCls} value={newAgent.username} onChange={e => setNewAgent(a => ({ ...a, username: e.target.value }))} placeholder="jsmith" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Password</label>
                  <input type="password" className={inputCls} value={newAgent.password} onChange={e => setNewAgent(a => ({ ...a, password: e.target.value }))} placeholder="••••••••" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Role</label>
                  <select className={inputCls} value={newAgent.role} onChange={e => setNewAgent(a => ({ ...a, role: e.target.value }))}>
                    <option value="technician">Technician</option>
                    <option value="admin">Admin</option>
                    <option value="user">End User</option>
                  </select>
                </div>
              </div>
              <Button type="submit" variant="primary" size="sm" className="w-full"><Plus size={13} /> Add Agent</Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Current Agents" subtitle={`${agents.length} agents`} />
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {agents.map(agent => (
                <div key={String(agent.id)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 group transition-all">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 dark:from-indigo-500/40 dark:to-violet-500/40 border border-indigo-500/20 flex items-center justify-center text-xs font-bold t-main flex-shrink-0">
                    {agent.initials}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="text-sm t-main font-medium truncate">{agent.name}</div>
                    <div className="text-[10px] t-muted truncate">{agent.group} · {agent.role || 'technician'}</div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <button onClick={() => openEditAgent(agent)}
                      className="p-1.5 rounded-lg hover:bg-indigo-500/20 t-sub hover:text-indigo-500 dark:hover:text-indigo-400 transition-all">
                      <Pencil size={13} />
                    </button>
                    {String(agent.id) !== String(currentUser?.id) && (
                      <button onClick={async () => {
                        try {
                          await deleteAgent(String(agent.id))
                          addToast('Agent removed', 'info')
                        } catch (err) {
                          addToast(err.message || 'Failed to remove agent', 'error')
                        }
                      }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 t-sub hover:text-rose-500 dark:hover:text-rose-400 transition-all">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Edit Agent Modal */}
      {editAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl shadow-2xl border border-glass w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-glass">
              <div>
                <h2 className="text-sm font-bold t-main">Edit Agent</h2>
                <p className="text-[11px] t-muted mt-0.5">{editAgent.name}</p>
              </div>
              <button onClick={closeEditAgent} className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 t-sub transition-all">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSaveAgent} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Full Name</label>
                  <input className={inputCls} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Group / Team</label>
                  <input className={inputCls} value={editForm.group} onChange={e => setEditForm(f => ({ ...f, group: e.target.value }))} placeholder="L1 Support" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Role</label>
                  <select className={inputCls} value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="technician">Technician</option>
                    <option value="admin">Admin</option>
                    <option value="user">End User</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Username</label>
                  <input className={inputCls} value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} placeholder="jsmith" autoComplete="off" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">
                    New Password <span className="normal-case font-normal t-muted">(leave blank to keep current)</span>
                  </label>
                  <div className="relative">
                    <Lock size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 t-sub" />
                    <input type="password" className={`${inputCls} pl-7`} value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" autoComplete="new-password" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={closeEditAgent}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm" className="flex-1" disabled={editSaving}>
                  {editSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLA */}
      {tab === 'sla' && (
        <div className="space-y-5 max-w-xl">
          {/* Response Times */}
          <Card>
            <CardHeader title="SLA Response Times" subtitle="Maximum resolution time per priority level" />
            <div className="space-y-3 mb-1">
              {PRIORITIES.map(p => {
                const colors = { critical: 'text-rose-500', high: 'text-orange-500', medium: 'text-amber-500', low: 't-muted' }
                const dots   = { critical: 'bg-rose-500',  high: 'bg-orange-500',  medium: 'bg-amber-500',  low: 'bg-slate-400' }
                return (
                  <div key={p} className="flex items-center gap-4 p-3 rounded-lg bg-black/5 dark:bg-white/3 border border-glass">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dots[p]}`} />
                    <span className={`text-sm font-bold w-20 flex-shrink-0 ${colors[p]}`}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                    <input
                      type="number" min={1} max={720}
                      className="glass-input w-24 text-sm text-center"
                      value={slaEdits[p] || ''}
                      onChange={e => setSlaEdits(s => ({ ...s, [p]: e.target.value }))}
                    />
                    <span className="text-xs t-sub">hours</span>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Timer Behaviour */}
          <Card>
            <CardHeader title="Timer Behaviour" subtitle="When the SLA countdown starts and how it runs" />
            <div className="space-y-4">
              {/* Timer Start */}
              <div>
                <div className="text-xs font-bold t-sub uppercase tracking-wider mb-2">Start Timer</div>
                <div className="flex gap-2">
                  {[['on_creation','On Ticket Creation'],['on_assignment','On Agent Assignment']].map(([val, label]) => (
                    <button key={val} onClick={() => setSlaEdits(s => ({ ...s, timerStart: val }))}
                      className={`flex-1 text-xs py-2 px-3 rounded-lg border font-medium transition-all ${slaEdits.timerStart === val ? 'bg-indigo-500 text-white border-indigo-500' : 'border-glass t-muted hover:t-main'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Countdown Mode */}
              <div>
                <div className="text-xs font-bold t-sub uppercase tracking-wider mb-2">Countdown Mode</div>
                <div className="flex gap-2">
                  {[['24_7','24 / 7 (Always On)'],['business_hours','Business Hours Only']].map(([val, label]) => (
                    <button key={val} onClick={() => setSlaEdits(s => ({ ...s, countdownMode: val }))}
                      className={`flex-1 text-xs py-2 px-3 rounded-lg border font-medium transition-all ${slaEdits.countdownMode === val ? 'bg-indigo-500 text-white border-indigo-500' : 'border-glass t-muted hover:t-main'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Business Hours (shown only when business_hours mode) */}
              {slaEdits.countdownMode === 'business_hours' && (
                <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                  <div className="text-xs font-bold t-sub uppercase tracking-wider">Business Hours</div>
                  {/* Work Days */}
                  <div>
                    <div className="text-[10px] t-sub mb-1.5">Working Days</div>
                    <div className="flex gap-1.5">
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => {
                        const selected = (slaEdits.workDays || []).includes(i)
                        return (
                          <button key={i} onClick={() => setSlaEdits(s => {
                            const cur = s.workDays || []
                            return { ...s, workDays: selected ? cur.filter(x => x !== i) : [...cur, i].sort() }
                          })}
                            className={`w-9 h-8 text-[11px] font-semibold rounded-lg border transition-all ${selected ? 'bg-indigo-500 text-white border-indigo-500' : 'border-glass t-muted hover:t-main'}`}>
                            {d}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {/* Work Hours */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-[10px] t-sub mb-1">Start Time</div>
                      <input type="time" className="glass-input text-sm w-full"
                        value={slaEdits.workStart || '09:00'}
                        onChange={e => setSlaEdits(s => ({ ...s, workStart: e.target.value }))} />
                    </div>
                    <div className="t-sub text-xs mt-4">to</div>
                    <div className="flex-1">
                      <div className="text-[10px] t-sub mb-1">End Time</div>
                      <input type="time" className="glass-input text-sm w-full"
                        value={slaEdits.workEnd || '20:00'}
                        onChange={e => setSlaEdits(s => ({ ...s, workEnd: e.target.value }))} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Pause Conditions */}
          <Card>
            <CardHeader title="Pause Conditions" subtitle="SLA timer pauses when ticket moves to these statuses" />
            <div className="flex flex-wrap gap-2">
              {['on-hold','pending','waiting-for-customer','waiting-for-vendor'].map(s => {
                const active = (slaEdits.pauseOn || []).includes(s)
                return (
                  <button key={s} onClick={() => setSlaEdits(e => {
                    const cur = e.pauseOn || []
                    return { ...e, pauseOn: active ? cur.filter(x => x !== s) : [...cur, s] }
                  })}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${active ? 'bg-amber-500/20 text-amber-500 border-amber-500/40' : 'border-glass t-muted hover:t-main'}`}>
                    {active ? '⏸ ' : ''}{s}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] t-sub mt-3">When the ticket leaves a paused status, the SLA deadline is extended by the time it was paused.</p>
          </Card>

          <Button variant="primary" size="sm" onClick={handleSaveSla}><Save size={13} /> Save SLA Settings</Button>
        </div>
      )}

      {/* Email */}
      {tab === 'email' && <EmailTab
        emailEdits={emailEdits} setEmailEdits={setEmailEdits}
        triggersEdits={triggersEdits} setTriggersEdits={setTriggersEdits}
        inboundEdits={inboundEdits} setInboundEdits={setInboundEdits}
        agents={agents} emailLog={emailLog} categories={categories}
        inputCls={inputCls}
        onSave={handleSaveEmail} onTest={handleTestEmail} saving={emailSaving}
        onSaveInbound={handleSaveInbound}
        onPollNow={handlePollNow}
        onClearLog={handleClearLog}
        addToast={addToast}
        tplEdits={tplEdits} setTplEdits={setTplEdits}
        onSaveTemplate={handleSaveTemplate}
        insertVar={insertVar}
      />}

      {/* Categories */}
      {tab === 'categories' && (
        <CategoriesTab
          categories={categories}
          onAdd={(cat) => { addCategory(cat); addToast(`Category "${cat.name}" added`, 'success') }}
          onUpdate={(id, changes) => { updateCategory(id, changes); addToast('Category updated', 'success') }}
          onDelete={(id) => { deleteCategory(id); addToast('Category deleted', 'info') }}
          inputCls={inputCls}
        />
      )}

      {/* Alerts */}
      {tab === 'alerts' && (
        <AlertsSection
          alertEdits={alertEdits}
          setAlertEdits={setAlertEdits}
          inputCls={inputCls}
          onSave={handleSaveAlerts}
          onTest={handleTestAlert}
          saving={alertSaving}
        />
      )}

      {selectedTicket && <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
    </div>
  )
}
