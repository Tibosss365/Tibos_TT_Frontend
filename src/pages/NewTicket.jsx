import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, AlertTriangle, Info, ClipboardList, AlertOctagon } from 'lucide-react'
import { useTicketStore } from '../stores/ticketStore'
import { useUserStore } from '../stores/userStore'
import { useUiStore } from '../stores/uiStore'
import { useAdminStore } from '../stores/adminStore'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PRIORITIES } from '../utils/ticketUtils'

const EMPTY = { company: '', contactName: '', email: '', phone: '', subject: '', category: 'software', priority: 'medium', description: '', asset: '', group: '', type: 'request', assignee: '' }

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

export default function NewTicket() {
  const { addTicket } = useTicketStore()
  const { currentUser } = useUserStore()
  const { addToast } = useUiStore()
  const { slaSettings, categories, groups, agents } = useAdminStore()
  const navigate = useNavigate()

  const [form, setForm] = useState({ ...EMPTY, contactName: currentUser?.name || '', company: 'Acme Corp' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.company.trim())     errs.company     = 'Required'
    if (!form.contactName.trim()) errs.contactName = 'Required'
    if (!form.email.trim())       errs.email       = 'Required'
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
      await addTicket(form)
      addToast('Ticket Submitted', 'success')
      navigate('/tickets/mine')
    } catch (err) {
      const msg = err.message || 'Failed to submit ticket'
      setSubmitError(msg)
      addToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = (key) => `glass-input w-full text-sm ${errors[key] ? 'border-rose-500 text-rose-600 dark:text-rose-400 focus:border-rose-500' : ''}`
  const labelCls = 'block text-xs font-bold t-sub uppercase tracking-wider mb-1.5'

  return (
    <div className="max-w-4xl space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold t-main">Submit New Ticket</h1>
        <p className="text-sm t-muted mt-0.5">Fill in the details below to create a support request</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Main form */}
        <form onSubmit={handleSubmit} className="xl:col-span-2 space-y-4">
          {/* Ticket Type */}
          <Card>
            <CardHeader title="Ticket Type" />
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(TICKET_TYPE_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon
                const active = form.type === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set('type', key)}
                    className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${active ? cfg.active : cfg.inactive}`}
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

          {/* Contact info */}
          <Card>
            <CardHeader title="Contact Information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Company *</label>
                <input className={inputCls('company')} value={form.company} onChange={e => set('company', e.target.value)} placeholder="Acme Corp" />
                {errors.company && <p className="text-xs text-rose-500 mt-1">{errors.company}</p>}
              </div>
              <div>
                <label className={labelCls}>Contact Name *</label>
                <input className={inputCls('contactName')} value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="Full name" />
                {errors.contactName && <p className="text-xs text-rose-500 mt-1">{errors.contactName}</p>}
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input type="email" className={inputCls('email')} value={form.email} onChange={e => set('email', e.target.value)} placeholder="user@company.com" />
                {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input className={inputCls('phone')} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
              </div>
            </div>
          </Card>

          {/* Ticket details */}
          <Card>
            <CardHeader title="Ticket Details" />
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Subject *</label>
                <input className={inputCls('subject')} value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Brief description of the issue" />
                {errors.subject && <p className="text-xs text-rose-500 mt-1">{errors.subject}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Category</label>
                  <select className="glass-input w-full text-sm" value={form.category} onChange={e => set('category', e.target.value)}>
                    {[...categories].sort((a, b) => a.sortOrder - b.sortOrder).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Group / Team</label>
                  <select className="glass-input w-full text-sm" value={form.group} onChange={e => set('group', e.target.value)}>
                    <option value="">— Select Group —</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Asset / Device</label>
                  <input className="glass-input w-full text-sm" value={form.asset} onChange={e => set('asset', e.target.value)} placeholder="e.g. LAPTOP-042" />
                </div>
                <div>
                  <label className={labelCls}>Assign To</label>
                  <select className="glass-input w-full text-sm" value={form.assignee} onChange={e => set('assignee', e.target.value)}>
                    <option value="">— Unassigned —</option>
                    {agents.filter(a => a.id !== 'unassigned').map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority selector */}
              <div>
                <label className={labelCls}>Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRIORITIES.map(p => {
                    const ui = PRIORITY_UI[p]
                    const active = form.priority === p
                    return (
                      <button key={p} type="button" onClick={() => set('priority', p)}
                        className={`px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${active ? `${ui.bg} ${ui.border} ${ui.text} ring-1 ${ui.ring}` : 'bg-black/5 dark:bg-white/3 border-glass t-muted hover:bg-black/10 dark:hover:bg-white/8 hover:t-main'}`}>
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
                  rows={5}
                  value={form.description}
                  onChange={e => set('description', e.target.value.slice(0, 2000))}
                  placeholder="Please describe the issue in detail. Include error messages, steps to reproduce, and any troubleshooting already attempted."
                />
                {errors.description && <p className="text-xs text-rose-500 mt-1">{errors.description}</p>}
              </div>
            </div>
          </Card>

          {submitError && (
            <div className="flex gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 animate-fade-in">
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
        <div className="space-y-4">
          {/* SLA info */}
          <Card>
            <CardHeader title="Response Times" />
            <div className="space-y-2">
              {PRIORITIES.map(p => {
                const ui = PRIORITY_UI[p]
                const hours = slaSettings[p]
                return (
                  <div key={p} className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${form.priority === p ? `${ui.bg} ${ui.border}` : 'bg-black/5 dark:bg-white/3 border-glass'}`}>
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
            <div className="flex gap-2 mb-3">
              <Info size={14} className="text-indigo-500 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs font-bold t-main uppercase tracking-wider">Tips for faster resolution</span>
            </div>
            <ul className="space-y-2 text-xs t-muted leading-relaxed">
              <li>• Include asset tags or device names when relevant</li>
              <li>• List any error messages exactly as they appear</li>
              <li>• Describe steps you've already tried</li>
              <li>• Note how many users are affected</li>
              <li>• Include relevant screenshots in comments after submission</li>
            </ul>
          </Card>

          {/* Critical warning */}
          {form.priority === 'critical' && (
            <div className="flex gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 animate-fade-in">
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
