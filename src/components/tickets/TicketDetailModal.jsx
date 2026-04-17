import { useState, useEffect } from 'react'
import {
  Trash2, Save, MessageSquare, Pencil, X, CheckSquare, Square,
  Clock, Bell, ThumbsUp, ThumbsDown, ClipboardList, FileText,
  Plus, Timer, User, CheckCircle2, AlertCircle, MoreHorizontal,
  CalendarDays, Briefcase, Mail, MailOpen, Send,
} from 'lucide-react'
import { Modal } from '../ui/Modal'
import { PriorityBadge, StatusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useTicketStore } from '../../stores/ticketStore'
import { useAdminStore } from '../../stores/adminStore'
import { useUserStore } from '../../stores/userStore'
import { useUiStore } from '../../stores/uiStore'
import { STATUSES, PRIORITIES, TICKET_TYPES, TICKET_TYPE_META, fmtDateTime, fmtDate, timeAgo, getSlaInfo, getSlaRemainingSeconds, fmtSlaSeconds } from '../../utils/ticketUtils'
import { useT } from '../../utils/i18n'

const TIMELINE_STYLES = {
  created:   { dot: 'bg-blue-500',    label: 'Opened' },
  assign:    { dot: 'bg-violet-500',  label: 'Assigned' },
  status:    { dot: 'bg-amber-500',   label: 'Updated' },
  comment:   { dot: 'bg-indigo-500',  label: 'Comment' },
  resolved:  { dot: 'bg-emerald-500', label: 'Resolved' },
  email_out: { dot: 'bg-sky-500',     label: 'Email Sent' },
  email_in:  { dot: 'bg-teal-500',    label: 'Email Received' },
}

const MODAL_TABS = [
  { id: 'details',       icon: FileText,      label: 'Details' },
  { id: 'tasks',         icon: ClipboardList, label: 'Tasks' },
  { id: 'reminders',    icon: Bell,          label: 'Reminders' },
  { id: 'approvals',    icon: ThumbsUp,      label: 'Approvals' },
  { id: 'worklog',      icon: Timer,         label: 'Work Log' },
  { id: 'resolution',   icon: CheckCircle2,  label: 'Resolution' },
  { id: 'conversations', icon: MessageSquare, label: 'Conversations' },
]

const inputCls  = 'glass-input w-full text-sm py-1.5'
const labelCls  = 'block text-[10px] font-bold t-sub uppercase tracking-wider mb-1'

// ── Live SLA Countdown ────────────────────────────────────────────────────────
/**
 * Enterprise-grade SLA countdown panel.
 * Reads slaStatus from the ticket (v2 model) and ticks every second.
 *
 * States:
 *   not_started → "Awaiting assignment" or "SLA not started"
 *   active      → live countdown + progress bar (green→amber→red)
 *   paused      → frozen remaining time with ⏸ badge
 *   overdue     → pulsing red + overdue duration ticking up
 *   completed   → green "SLA Met" with recorded due time
 */
function SlaCountdown({ ticket, slaSettings }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const slaStatus  = ticket.slaStatus || 'not_started'
  const dueIso     = ticket.slaDueTime || ticket.slaDueAt
  const startIso   = ticket.slaStartTime
  const pausedSecs = ticket.slaPausedSeconds || 0

  // ── Not started (legacy tickets only — new tickets always start SLA) ──
  if (slaStatus === 'not_started') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-400 font-medium">SLA not started</span>
        </div>
        <div className="text-[10px] t-sub">Waiting for agent assignment</div>
      </div>
    )
  }

  // ── Completed ─────────────────────────────────────────────────────────
  if (slaStatus === 'completed') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
          <span className="text-xs text-emerald-500 font-bold">SLA Met — Completed</span>
        </div>
        {dueIso && <div className="text-[10px] t-sub">Deadline was {fmtDateTime(dueIso)}</div>}
        {pausedSecs > 0 && (
          <div className="text-[10px] t-sub">Total paused: {fmtSlaSeconds(pausedSecs)}</div>
        )}
      </div>
    )
  }

  // ── Paused ────────────────────────────────────────────────────────────
  if (slaStatus === 'paused') {
    const remaining = ticket.slaPausedAt && dueIso
      ? Math.floor((new Date(dueIso).getTime() - new Date(ticket.slaPausedAt).getTime()) / 1000)
      : null
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
          <span className="text-xs text-amber-500 font-bold">⏸ SLA Paused</span>
        </div>
        {remaining !== null && (
          <div className="text-sm font-mono font-semibold text-amber-500">
            {fmtSlaSeconds(remaining)} remaining
          </div>
        )}
        {dueIso && <div className="text-[10px] t-sub">Deadline: {fmtDateTime(dueIso)}</div>}
        <div className="text-[10px] t-sub">Timer paused — resume by changing status</div>
      </div>
    )
  }

  // ── Active / Overdue ──────────────────────────────────────────────────
  if (!dueIso) return <div className="text-xs t-muted">No deadline set</div>

  const dueMs       = new Date(dueIso).getTime()
  const startMs     = startIso ? new Date(startIso).getTime() : null
  const nowMs       = Date.now()
  const remaining   = Math.floor((dueMs - nowMs) / 1000)  // can be negative
  const isOverdue   = slaStatus === 'overdue' || remaining < 0
  const overduesSecs = isOverdue ? Math.abs(remaining) : 0

  // Progress bar: 0% = just started, 100% = at/past deadline
  let pct = 0
  if (startMs) {
    const totalSecs = (dueMs - startMs) / 1000
    const elapsedSecs = (nowMs - startMs) / 1000
    pct = totalSecs > 0 ? Math.min(100, Math.max(0, (elapsedSecs / totalSecs) * 100)) : 100
  }

  const barColor = isOverdue
    ? 'bg-rose-500'
    : pct > 80 ? 'bg-rose-500'
    : pct > 60 ? 'bg-amber-400'
    : 'bg-emerald-400'

  const priority   = ticket.priority || 'medium'
  const slaHrs     = slaSettings?.[priority] || 8
  const warnThresh = slaHrs * 3600 * 0.25 // warning at 25% remaining time
  const warning    = !isOverdue && remaining < warnThresh

  if (isOverdue) return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
        <span className="text-xs font-bold text-rose-500 uppercase tracking-wide">Overdue</span>
      </div>
      <div className="text-base font-mono font-bold text-rose-500 tabular-nums">
        +{fmtSlaSeconds(overduesSecs)}
      </div>
      <div className="text-[10px] t-sub">Deadline was {fmtDateTime(dueIso)}</div>
      <div className="h-1.5 rounded-full bg-rose-500/20 overflow-hidden">
        <div className="h-full w-full rounded-full bg-rose-500 animate-pulse" />
      </div>
    </div>
  )

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${warning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wide ${warning ? 'text-amber-500' : 'text-emerald-500'}`}>
            Active
          </span>
        </div>
        <span className="text-[10px] t-sub">{Math.round(pct)}% elapsed</span>
      </div>
      <div className={`text-base font-mono font-bold tabular-nums ${warning ? 'text-amber-500' : 'text-emerald-500'}`}>
        {fmtSlaSeconds(remaining)}
      </div>
      <div className="text-[10px] t-sub">Due: {fmtDateTime(dueIso)}</div>
      <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {startIso && (
        <div className="text-[10px] t-sub">Started: {fmtDateTime(startIso)}</div>
      )}
      {pausedSecs > 0 && (
        <div className="text-[10px] t-sub">Paused total: {fmtSlaSeconds(pausedSecs)}</div>
      )}
    </div>
  )
}

// ── Requester Details Sidebar ─────────────────────────────────────────────────
function RequesterPanel({ ticket, isEditing, edits, set, agents, groups, categories, slaSettings, onEdit, onSave, onCancel, onDelete }) {
  const t = useT()
  const initials = (ticket.submitter || ticket.contactName || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-glass flex-shrink-0 flex flex-col">
      {/* Requester */}
      <div className="p-4 border-b border-glass">
        <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-3">{t('requester')}</div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white shadow-md">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input className={inputCls + ' mb-1 text-xs'} value={edits.submitter} onChange={e => set('submitter', e.target.value)} placeholder="Full name" />
            ) : (
              <div className="text-sm font-semibold t-main truncate">{edits.submitter || '—'}</div>
            )}
            {isEditing ? (
              <input className={inputCls + ' text-xs'} type="email" value={edits.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
            ) : (
              <div className="text-xs t-muted truncate mt-0.5">{edits.email || '—'}</div>
            )}
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs t-muted">
            <Briefcase size={11} className="flex-shrink-0" />
            {isEditing ? (
              <input className={inputCls + ' text-xs py-1'} value={edits.company} onChange={e => set('company', e.target.value)} placeholder="Company" />
            ) : (
              <span className="truncate">{edits.company || '—'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Meta */}
      <div className="p-4 border-b border-glass space-y-3 flex-1">
        <div>
          <div className={labelCls}>{t('id')}</div>
          <div className="text-xs font-mono font-semibold t-main">{ticket.id}</div>
        </div>
        <div>
          <div className={labelCls}>{t('created')}</div>
          <div className="text-xs t-main">{fmtDateTime(ticket.created)}</div>
        </div>
        <div>
          <div className={labelCls}>{t('updated')}</div>
          <div className="text-xs t-main">{fmtDateTime(ticket.updated)}</div>
        </div>
        <div className="p-3 rounded-xl border border-glass bg-black/3 dark:bg-white/3">
          <div className={labelCls + ' mb-2'}>{t('slaStatus')}</div>
          <SlaCountdown ticket={ticket} slaSettings={slaSettings} />
        </div>
        <div>
          <div className={labelCls}>{t('group')}</div>
          {isEditing ? (
            <select className={inputCls} value={edits.group||''} onChange={e => {
              set('group', e.target.value)
              set('category', '')   // reset category when group changes
            }}>
              <option value="">— Unassigned —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          ) : (
            (() => {
              const g = groups.find(x => x.id === edits.group)
              return g ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: g.color+'20', color: g.color, border: `1px solid ${g.color}40` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.color }} />{g.name}
                </span>
              ) : <div className="text-xs t-main py-1 opacity-40">—</div>
            })()
          )}
        </div>
        <div>
          <div className={labelCls}>{t('category')}</div>
          {isEditing ? (
            (() => {
              const groupCats = edits.group
                ? [...categories].filter(c => c.groupId === edits.group).sort((a,b) => a.sortOrder - b.sortOrder)
                : [...categories].sort((a,b) => a.sortOrder - b.sortOrder)
              return (
                <select className={inputCls} value={edits.category} onChange={e => set('category', e.target.value)}>
                  <option value="">— Select category —</option>
                  {groupCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )
            })()
          ) : (
            <div className="text-xs t-main py-1">{categories.find(c=>c.id===edits.category)?.name || edits.category || '—'}</div>
          )}
        </div>
        <div>
          <div className={labelCls}>{t('asset')}</div>
          {isEditing ? (
            <input className={inputCls} value={edits.asset} onChange={e => set('asset', e.target.value)} placeholder="e.g. WS-042" />
          ) : (
            <div className="text-xs t-main py-1">{edits.asset || '—'}</div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 space-y-2">
        {isEditing ? (
          <>
            <Button variant="primary" size="sm" className="w-full" onClick={onSave}><Save size={13} /> {t('saveChanges')}</Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={onCancel}><X size={13} /> {t('cancel')}</Button>
          </>
        ) : (
          <Button variant="primary" size="sm" className="w-full" onClick={onEdit}><Pencil size={13} /> {t('editTicket')}</Button>
        )}
        <Button variant="danger" size="sm" className="w-full" onClick={onDelete}><Trash2 size={13} /> {t('delete')}</Button>
      </div>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export function TicketDetailModal({ ticket, onClose }) {
  const {
    updateTicket, addTimelineEvent, deleteTicket, fetchTicket,
    addTask, toggleTask, deleteTask,
    addWorkLog, deleteWorkLog,
    addReminder, toggleReminder, deleteReminder,
    addApproval, updateApprovalStatus,
  } = useTicketStore()
  const { agents, getAgentName, getCategoryName, categories, groups, slaSettings } = useAdminStore()
  const { currentUser } = useUserStore()
  const { addToast } = useUiStore()
  const t = useT()


  const [activeTab, setActiveTab] = useState('details')
  const [resolverId, setResolverId] = useState(currentUser?.id || '')

  // Load full ticket detail (with timeline) when modal opens
  useEffect(() => {
    fetchTicket(ticket._uuid)
  }, [ticket._uuid])
  const [isEditing, setIsEditing] = useState(false)
  const [edits, setEdits] = useState({
    subject:     ticket.subject     || '',
    status:      ticket.status      || 'open',
    priority:    ticket.priority    || 'medium',
    type:        ticket.type        || 'request',
    assignee:    ticket.assignee    || '',
    group:       ticket.group       || '',
    description: ticket.description || '',
    submitter:   ticket.submitter   || '',
    company:     ticket.company     || '',
    email:       ticket.email       || '',
    category:    ticket.category    || '',
    asset:       ticket.asset       || '',
    resolution:  ticket.resolution  || '',
  })

  const set = (k, v) => setEdits(x => ({ ...x, [k]: v }))

  // ── Live ticket data ────────────────────────────────────────────────────────
  const liveTicket = useTicketStore(s => s.tickets.find(t => t.id === ticket.id)) || ticket

  // Sync edits whenever liveTicket changes (e.g. after save or SSE push) so the
  // sidebar/SLA panel always reflects the latest backend values.
  useEffect(() => {
    if (isEditing) return             // don't clobber in-progress edits
    setEdits({
      subject:     liveTicket.subject     || '',
      status:      liveTicket.status      || 'open',
      priority:    liveTicket.priority    || 'medium',
      type:        liveTicket.type        || 'request',
      assignee:    liveTicket.assignee    || '',
      group:       liveTicket.group       || '',
      description: liveTicket.description || '',
      submitter:   liveTicket.submitter   || '',
      company:     liveTicket.company     || '',
      email:       liveTicket.email       || '',
      category:    liveTicket.category    || '',
      asset:       liveTicket.asset       || '',
      resolution:  liveTicket.resolution  || '',
    })
  }, [liveTicket, isEditing]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Edit / Save / Cancel ───────────────────────────────────────────────────
  const handleEdit   = () => setIsEditing(true)
  const handleCancel = () => {
    setEdits({
      subject:     liveTicket.subject     || '',
      status:      liveTicket.status      || 'open',
      priority:    liveTicket.priority    || 'medium',
      type:        liveTicket.type        || 'request',
      assignee:    liveTicket.assignee    || '',
      group:       liveTicket.group       || '',
      description: liveTicket.description || '',
      submitter:   liveTicket.submitter   || '',
      company:     liveTicket.company     || '',
      email:       liveTicket.email       || '',
      category:    liveTicket.category    || '',
      asset:       liveTicket.asset       || '',
      resolution:  liveTicket.resolution  || '',
    })
    setIsEditing(false)
  }

  const handleSave = async (overrides = {}) => {
    const merged = { ...edits, ...overrides }
    const fields = ['subject','status','priority','type','assignee','group','description','submitter','company','email','category','asset','resolution']
    const changes = {}
    // Compare against liveTicket so we catch changes the backend already applied
    fields.forEach(k => { if ((merged[k]||'') !== (liveTicket[k]||'')) changes[k] = merged[k] })
    if (changes.status && changes.status !== 'resolved' && changes.status !== 'closed')
      addTimelineEvent(ticket._uuid, { type: 'status', text: `Status changed to <strong>${changes.status}</strong>` })
    if (changes.assignee) addTimelineEvent(ticket._uuid, { type: 'assign', text: `Assigned to <strong>${getAgentName(changes.assignee)}</strong>` })
    if (Object.keys(changes).length > 0) {
      try {
        await updateTicket(ticket._uuid, changes)
        // Re-fetch the ticket so SLA status, group, and all backend-computed
        // fields are refreshed immediately (e.g. sla_status becomes 'active'
        // after the first agent assignment).
        await fetchTicket(ticket._uuid)
      } catch (err) {
        addToast(`Save failed: ${err.message}`, 'error')
        return
      }
      let msg = 'Ticket Updated'
      if (changes.status === 'resolved') msg = 'Ticket Resolved'
      else if (changes.status === 'closed') msg = 'Ticket Closed'
      else if (changes.status === 'in-progress') msg = 'Ticket In Progress'
      else if (changes.status === 'on-hold') msg = 'Ticket On Hold'
      else if (changes.status === 'open') msg = 'Ticket Reopened'
      else if (changes.assignee) msg = `Ticket Assigned to ${getAgentName(changes.assignee)}`
      addToast(msg, 'success')
    } else {
      addToast('No changes to save', 'info')
    }
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (window.confirm('Delete this ticket? This cannot be undone.')) {
      deleteTicket(ticket._uuid); addToast('Ticket deleted', 'error'); onClose()
    }
  }

  // ── Comment ────────────────────────────────────────────────────────────────
  const [comment, setComment] = useState('')
  const [sendToCustomer, setSendToCustomer] = useState(false)
  const handleComment = () => {
    if (!comment.trim()) return
    addTimelineEvent(ticket._uuid, {
      type: 'comment',
      text: comment,
      author: currentUser?.name || 'Agent',
      sendToCustomer,
    })
    setComment('')
    addToast(sendToCustomer ? 'Comment added & emailed to customer' : 'Comment added', 'success')
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const [newTask, setNewTask] = useState({ title: '', dueDate: '', assignee: currentUser?.id || '' })
  const handleAddTask = (e) => {
    e.preventDefault()
    if (!newTask.title.trim()) return
    addTask(ticket.id, newTask); setNewTask({ title: '', dueDate: '', assignee: currentUser?.id || '' })
    addToast('Task added', 'success')
  }

  // ── Work Log ───────────────────────────────────────────────────────────────
  const [newLog, setNewLog] = useState({ hours: '', description: '', date: new Date().toISOString().slice(0,10) })
  const handleAddLog = (e) => {
    e.preventDefault()
    if (!newLog.hours || !newLog.description.trim()) return
    addWorkLog(ticket.id, { ...newLog, agent: currentUser?.name || 'Agent' })
    setNewLog({ hours: '', description: '', date: new Date().toISOString().slice(0,10) })
    addToast('Work log added', 'success')
  }

  // ── Reminders ─────────────────────────────────────────────────────────────
  const [newReminder, setNewReminder] = useState({ date: '', note: '' })
  const handleAddReminder = (e) => {
    e.preventDefault()
    if (!newReminder.date) return
    addReminder(ticket.id, newReminder); setNewReminder({ date: '', note: '' })
    addToast('Reminder set', 'success')
  }

  // ── Approvals ─────────────────────────────────────────────────────────────
  const [newApproval, setNewApproval] = useState({ requestedFrom: '', note: '' })
  const handleAddApproval = (e) => {
    e.preventDefault()
    if (!newApproval.requestedFrom) return
    addApproval(ticket.id, { ...newApproval, requestedBy: currentUser?.name || 'Agent' })
    setNewApproval({ requestedFrom: '', note: '' })
    addToast('Approval request sent', 'success')
  }

  const totalHours = (liveTicket.workLog||[]).reduce((s, w) => s + Number(w.hours||0), 0)

  return (
    <Modal isOpen onClose={onClose} title="" size="xl">
      <div className="flex flex-col" style={{ maxHeight: 'calc(90vh - 56px)' }}>

        {/* ── Top Status Bar ───────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-glass flex-shrink-0 flex-wrap gap-y-2">
          <span className="text-sm font-bold t-main font-mono">{ticket.id}</span>
          <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
          {isEditing ? (
            <select className="glass-input text-xs py-1 w-28" value={edits.type} onChange={e => set('type', e.target.value)}>
              {TICKET_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          ) : (() => {
            const m = TICKET_TYPE_META[edits.type] || TICKET_TYPE_META.request
            return (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${m.bg} ${m.border} ${m.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />{m.label}
              </span>
            )
          })()}
          <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
          {isEditing ? (
            <select className="glass-input text-xs py-1 w-32" value={edits.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')}</option>)}
            </select>
          ) : <StatusBadge status={edits.status} />}
          {isEditing ? (
            <select className="glass-input text-xs py-1 w-28" value={edits.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>
          ) : <PriorityBadge priority={edits.priority} />}
          {isEditing ? (
            <select className="glass-input text-xs py-1 w-36" value={edits.assignee} onChange={e => set('assignee', e.target.value)}>
              <option value="">— Unassigned —</option>
              {agents.filter(a => a.id !== 'unassigned').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          ) : (
            <span className="text-xs t-muted">
              <span className="t-sub">{t('assignee')}:</span> {edits.assignee ? getAgentName(edits.assignee) : '—'}
            </span>
          )}
          <div className="flex-1" />
          {(() => {
            const sla = getSlaInfo(liveTicket)
            if (!sla || sla.done) return null
            if (sla.paused) return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                ⏸ SLA Paused
              </span>
            )
            if (sla.overdue) return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse">
                ⚠ {sla.label}
              </span>
            )
            return (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sla.warning ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' : 'bg-slate-500/10 t-sub border-slate-500/20'}`}>
                ⏱ {sla.label}
              </span>
            )
          })()}
          <div className="flex items-center gap-1.5 text-[10px] t-sub">
            <CalendarDays size={11} />
            Created {fmtDateTime(ticket.created)}
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Left: Tabs */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

            {/* Tab bar */}
            <div className="flex border-b border-glass px-4 flex-shrink-0 overflow-x-auto">
              {MODAL_TABS.map(({ id, icon: Icon, label }) => {
                // Badge counts
                let badge = 0
                if (id === 'tasks')     badge = (liveTicket.tasks||[]).filter(t=>!t.done).length
                if (id === 'reminders') badge = (liveTicket.reminders||[]).filter(r=>!r.done).length
                if (id === 'approvals') badge = (liveTicket.approvals||[]).filter(a=>a.status==='pending').length
                if (id === 'worklog')   badge = (liveTicket.workLog||[]).length
                return (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0
                      ${activeTab === id
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent t-muted hover:t-main hover:border-black/20 dark:hover:border-white/20'}`}>
                    <Icon size={12} />
                    {label}
                    {badge > 0 && (
                      <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-indigo-500 text-white flex items-center justify-center">{badge}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5">

              {/* ── Conversations ── */}
              {activeTab === 'conversations' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {(liveTicket.timeline || []).length === 0 && (
                      <div className="text-sm t-muted text-center py-6">No activity yet</div>
                    )}
                    {(liveTicket.timeline || []).map((ev, i) => {
                      const style = TIMELINE_STYLES[ev.type] || { dot: 'bg-black/20 dark:bg-white/30', label: '' }
                      const isEmailOut = ev.type === 'email_out'
                      const isEmailIn  = ev.type === 'email_in'
                      const isComment  = ev.type === 'comment'
                      const isEmail    = isEmailOut || isEmailIn

                      if (isEmail) {
                        return (
                          <div key={i} className={`rounded-xl border p-3 space-y-1.5 ${
                            isEmailOut
                              ? 'border-sky-500/30 bg-sky-500/5'
                              : 'border-teal-500/30 bg-teal-500/5'
                          }`}>
                            <div className="flex items-center gap-2">
                              {isEmailOut
                                ? <Send size={12} className="text-sky-500 flex-shrink-0" />
                                : <MailOpen size={12} className="text-teal-500 flex-shrink-0" />
                              }
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${isEmailOut ? 'text-sky-500' : 'text-teal-500'}`}>
                                {style.label}
                              </span>
                              <span className="text-[10px] t-sub ml-auto">{timeAgo(ev.ts)}</span>
                            </div>
                            <div className="text-xs t-main leading-relaxed" dangerouslySetInnerHTML={{ __html: ev.text }} />
                          </div>
                        )
                      }

                      return (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                            {i < (liveTicket.timeline||[]).length - 1 && (
                              <div className="w-px flex-1 bg-black/5 dark:bg-white/6 mt-1 min-h-[12px]" />
                            )}
                          </div>
                          <div className={`pb-3 flex-1 min-w-0 ${isComment ? 'bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3 -mt-0.5' : ''}`}>
                            <div className="flex items-center gap-2 mb-0.5">
                              {ev.author && <span className="text-[10px] font-bold t-sub">{ev.author}</span>}
                              {style.label && <span className="text-[10px] t-sub opacity-60">· {style.label}</span>}
                              <span className="text-[10px] t-sub opacity-60 ml-auto">{timeAgo(ev.ts)}</span>
                            </div>
                            <div className="text-xs t-main leading-relaxed" dangerouslySetInnerHTML={{ __html: ev.text }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* ── Add Comment ── */}
                  <div className="pt-3 border-t border-glass space-y-2">
                    <div className={labelCls}>{t('addComment')}</div>
                    <textarea value={comment} onChange={e => setComment(e.target.value)}
                      className="glass-input w-full text-sm resize-none" rows={3}
                      placeholder="Write an internal comment or reply to customer…" />
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div
                          onClick={() => setSendToCustomer(v => !v)}
                          className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 relative cursor-pointer ${sendToCustomer ? 'bg-sky-500' : 'bg-black/15 dark:bg-white/15'}`}
                        >
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${sendToCustomer ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                        <span className="text-xs t-sub flex items-center gap-1">
                          <Mail size={11} className={sendToCustomer ? 'text-sky-500' : ''} />
                          {sendToCustomer ? <span className="text-sky-500 font-medium">Send to customer</span> : 'Internal only'}
                        </span>
                      </label>
                      <Button variant={sendToCustomer ? 'primary' : 'ghost'} size="sm" onClick={handleComment} className="flex-shrink-0">
                        {sendToCustomer ? <Send size={13} /> : <MessageSquare size={13} />}
                        {sendToCustomer ? 'Send Email' : 'Post'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Details ── */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div>
                    <div className={labelCls}>Subject</div>
                    {isEditing ? (
                      <input className={inputCls + ' font-semibold'} value={edits.subject} onChange={e => set('subject', e.target.value)} />
                    ) : (
                      <div className="text-sm font-semibold t-main py-1">{edits.subject || '—'}</div>
                    )}
                  </div>
                  <div>
                    <div className={labelCls}>Description</div>
                    {isEditing ? (
                      <textarea className={inputCls + ' resize-none leading-relaxed'} rows={5}
                        value={edits.description} onChange={e => set('description', e.target.value)} />
                    ) : (
                      <div className="text-xs t-main leading-relaxed py-1 whitespace-pre-wrap">{edits.description || <span className="opacity-40">No description</span>}</div>
                    )}
                  </div>
                  {!isEditing && (
                    <Button variant="primary" size="sm" onClick={handleEdit}><Pencil size={13}/> Edit Details</Button>
                  )}
                </div>
              )}

              {/* ── Tasks ── */}
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  <form onSubmit={handleAddTask} className="p-3 rounded-xl border border-glass bg-black/3 dark:bg-white/3 space-y-3">
                    <div className={labelCls}>Add New Task</div>
                    <input className={inputCls} value={newTask.title} onChange={e => setNewTask(t=>({...t,title:e.target.value}))} placeholder="Task title…" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[10px] t-sub mb-1">Due Date</div>
                        <input type="date" className={inputCls} value={newTask.dueDate} onChange={e => setNewTask(t=>({...t,dueDate:e.target.value}))} />
                      </div>
                      <div>
                        <div className="text-[10px] t-sub mb-1">Assign To</div>
                        <select className={inputCls} value={newTask.assignee} onChange={e => setNewTask(t=>({...t,assignee:e.target.value}))}>
                          <option value="">— Select —</option>
                          {agents.filter(a=>a.id!=='unassigned').map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <Button type="submit" variant="primary" size="sm"><Plus size={12}/> Add Task</Button>
                  </form>
                  <div className="space-y-2">
                    {(liveTicket.tasks||[]).length === 0
                      ? <div className="text-sm t-muted text-center py-6">No tasks yet</div>
                      : (liveTicket.tasks||[]).map(task => (
                        <div key={task.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${task.done ? 'opacity-50 border-glass bg-black/3 dark:bg-white/3' : 'border-glass bg-black/3 dark:bg-white/3'}`}>
                          <button onClick={() => toggleTask(ticket.id, task.id)} className="mt-0.5 flex-shrink-0 text-indigo-500">
                            {task.done ? <CheckSquare size={15}/> : <Square size={15} className="t-sub"/>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm t-main font-medium ${task.done ? 'line-through' : ''}`}>{task.title}</div>
                            <div className="flex items-center gap-3 mt-0.5">
                              {task.dueDate && <span className="text-[10px] t-sub flex items-center gap-1"><CalendarDays size={9}/>{fmtDate(task.dueDate)}</span>}
                              {task.assignee && <span className="text-[10px] t-sub flex items-center gap-1"><User size={9}/>{getAgentName(task.assignee)}</span>}
                            </div>
                          </div>
                          <button onClick={() => deleteTask(ticket.id, task.id)} className="p-1 hover:bg-rose-500/20 hover:text-rose-500 rounded t-sub transition-all">
                            <X size={12}/>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ── Resolution ── */}
              {activeTab === 'resolution' && (
                <div className="space-y-4">
                  {(edits.status === 'resolved' || edits.status === 'closed') && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500"/>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">This ticket is {edits.status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-500/20">
                        <div>
                          <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-0.5">Assigned To</div>
                          <div className="text-xs t-main">{edits.assignee ? getAgentName(edits.assignee) : '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-0.5">Resolved By</div>
                          <div className="text-xs t-main">
                            {(() => {
                              const timeline = liveTicket.timeline || []
                              const ev = [...timeline].reverse().find(e => e.type === 'resolved')
                              if (!ev) return '—'
                              // Use author name if available, otherwise extract from text
                              if (ev.author) return ev.author
                              return ev.text.replace(/<[^>]+>/g, '')
                                .replace('Ticket resolved by ', '')
                                .trim() || '—'
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className={labelCls}>Resolution Notes</div>
                    <textarea
                      className={inputCls + ' resize-none leading-relaxed'}
                      rows={5}
                      value={edits.resolution}
                      onChange={e => set('resolution', e.target.value)}
                      placeholder="Describe how the issue was resolved…"
                    />
                  </div>
                  {/* Resolver — shown when ticket is NOT yet resolved */}
                  {edits.status !== 'resolved' && edits.status !== 'closed' && (
                    <div>
                      <div className={labelCls}>Resolved By</div>
                      <select
                        className={inputCls}
                        value={resolverId}
                        onChange={e => setResolverId(e.target.value)}
                      >
                        <option value="">— Select agent —</option>
                        {agents.filter(a => a.id !== 'unassigned').map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                      {edits.assignee && edits.assignee !== currentUser?.id && (
                        <p className="text-[10px] text-amber-500 mt-1">
                          This ticket is assigned to {getAgentName(edits.assignee)}. Please confirm who resolved it.
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {(edits.status === 'resolved' || edits.status === 'closed') ? (
                      <Button variant="danger" size="sm" onClick={() => {
                        set('status', 'open')
                        handleSave({ status: 'open' })
                      }}>
                        <AlertCircle size={13}/> Reopen Ticket
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!resolverId}
                        onClick={async () => {
                          if (!resolverId) { addToast('Please select who resolved this ticket', 'error'); return }
                          const resolverAgentName = getAgentName(resolverId)
                          set('status', 'resolved')
                          await handleSave({ status: 'resolved', resolution: edits.resolution })
                          // If resolver is different from current user, record it as a note
                          if (resolverId !== currentUser?.id) {
                            addTimelineEvent(ticket._uuid, { type: 'comment', text: `Resolved by: <strong>${resolverAgentName}</strong>` })
                          }
                          // Close modal — ticket is now resolved and leaves My Tickets
                          onClose()
                        }}
                      >
                        <CheckCircle2 size={13}/> {t('markResolved')}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { updateTicket(ticket._uuid, { resolution: edits.resolution }); addToast('Resolution notes saved', 'success') }}>
                      <Save size={13}/> Save Notes
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Reminders ── */}
              {activeTab === 'reminders' && (
                <div className="space-y-4">
                  <form onSubmit={handleAddReminder} className="p-3 rounded-xl border border-glass bg-black/3 dark:bg-white/3 space-y-3">
                    <div className={labelCls}>Set New Reminder</div>
                    <div>
                      <div className="text-[10px] t-sub mb-1">Date & Time</div>
                      <input type="datetime-local" className={inputCls} value={newReminder.date} onChange={e => setNewReminder(r=>({...r,date:e.target.value}))} />
                    </div>
                    <div>
                      <div className="text-[10px] t-sub mb-1">Note</div>
                      <input className={inputCls} value={newReminder.note} onChange={e => setNewReminder(r=>({...r,note:e.target.value}))} placeholder="What to remind about?" />
                    </div>
                    <Button type="submit" variant="primary" size="sm"><Bell size={12}/> Set Reminder</Button>
                  </form>
                  <div className="space-y-2">
                    {(liveTicket.reminders||[]).length === 0
                      ? <div className="text-sm t-muted text-center py-6">No reminders set</div>
                      : (liveTicket.reminders||[]).map(rem => (
                        <div key={rem.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${rem.done ? 'opacity-50 border-glass' : 'border-amber-500/30 bg-amber-500/5'}`}>
                          <button onClick={() => toggleReminder(ticket.id, rem.id)} className="mt-0.5 flex-shrink-0 text-amber-500">
                            {rem.done ? <CheckSquare size={15}/> : <Bell size={15}/>}
                          </button>
                          <div className="flex-1 min-w-0">
                            {rem.note && <div className={`text-sm t-main font-medium ${rem.done ? 'line-through' : ''}`}>{rem.note}</div>}
                            <div className="text-[10px] t-sub flex items-center gap-1 mt-0.5"><CalendarDays size={9}/>{new Date(rem.date).toLocaleString()}</div>
                          </div>
                          <button onClick={() => deleteReminder(ticket.id, rem.id)} className="p-1 hover:bg-rose-500/20 hover:text-rose-500 rounded t-sub transition-all"><X size={12}/></button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ── Approvals ── */}
              {activeTab === 'approvals' && (
                <div className="space-y-4">
                  <form onSubmit={handleAddApproval} className="p-3 rounded-xl border border-glass bg-black/3 dark:bg-white/3 space-y-3">
                    <div className={labelCls}>Request Approval</div>
                    <div>
                      <div className="text-[10px] t-sub mb-1">Approval From</div>
                      <select className={inputCls} value={newApproval.requestedFrom} onChange={e => setNewApproval(a=>({...a,requestedFrom:e.target.value}))}>
                        <option value="">— Select Agent —</option>
                        {agents.filter(a=>a.id!=='unassigned').map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-[10px] t-sub mb-1">Note (optional)</div>
                      <input className={inputCls} value={newApproval.note} onChange={e => setNewApproval(a=>({...a,note:e.target.value}))} placeholder="Why do you need approval?" />
                    </div>
                    <Button type="submit" variant="primary" size="sm"><ThumbsUp size={12}/> Send Request</Button>
                  </form>
                  <div className="space-y-2">
                    {(liveTicket.approvals||[]).length === 0
                      ? <div className="text-sm t-muted text-center py-6">No approvals yet</div>
                      : (liveTicket.approvals||[]).map(appr => (
                        <div key={appr.id} className={`p-3 rounded-xl border ${appr.status==='approved' ? 'bg-emerald-500/5 border-emerald-500/25' : appr.status==='rejected' ? 'bg-rose-500/5 border-rose-500/25' : 'bg-amber-500/5 border-amber-500/25'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-semibold t-main">
                              {getAgentName(appr.requestedFrom)}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${appr.status==='approved' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : appr.status==='rejected' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                              {appr.status}
                            </span>
                          </div>
                          {appr.note && <div className="text-xs t-muted mb-2">{appr.note}</div>}
                          <div className="text-[10px] t-sub mb-2">Requested by {appr.requestedBy} · {timeAgo(appr.ts)}</div>
                          {appr.status === 'pending' && (
                            <div className="flex gap-2">
                              <button onClick={() => updateApprovalStatus(ticket.id, appr.id, 'approved')}
                                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 transition-all border border-emerald-500/25">
                                <ThumbsUp size={11}/> Approve
                              </button>
                              <button onClick={() => updateApprovalStatus(ticket.id, appr.id, 'rejected')}
                                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/30 transition-all border border-rose-500/25">
                                <ThumbsDown size={11}/> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ── Work Log ── */}
              {activeTab === 'worklog' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
                    <Timer size={16} className="text-indigo-500 flex-shrink-0"/>
                    <div>
                      <div className="text-[10px] t-sub uppercase tracking-wider">Total Time Logged</div>
                      <div className="text-lg font-bold t-main">{totalHours.toFixed(1)} <span className="text-sm font-normal t-muted">hours</span></div>
                    </div>
                  </div>
                  <form onSubmit={handleAddLog} className="p-3 rounded-xl border border-glass bg-black/3 dark:bg-white/3 space-y-3">
                    <div className={labelCls}>Log Work</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[10px] t-sub mb-1">Hours Spent</div>
                        <input type="number" step="0.25" min="0.25" className={inputCls} value={newLog.hours}
                          onChange={e => setNewLog(l=>({...l,hours:e.target.value}))} placeholder="e.g. 1.5" />
                      </div>
                      <div>
                        <div className="text-[10px] t-sub mb-1">Date</div>
                        <input type="date" className={inputCls} value={newLog.date} onChange={e => setNewLog(l=>({...l,date:e.target.value}))} />
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] t-sub mb-1">Description</div>
                      <input className={inputCls} value={newLog.description} onChange={e => setNewLog(l=>({...l,description:e.target.value}))} placeholder="What did you work on?" />
                    </div>
                    <Button type="submit" variant="primary" size="sm"><Plus size={12}/> Log Time</Button>
                  </form>
                  <div className="space-y-2">
                    {(liveTicket.workLog||[]).length === 0
                      ? <div className="text-sm t-muted text-center py-6">No work logged yet</div>
                      : [...(liveTicket.workLog||[])].reverse().map(entry => (
                        <div key={entry.id} className="flex items-start gap-3 p-3 rounded-xl border border-glass bg-black/3 dark:bg-white/3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                            <Timer size={13} className="text-indigo-500"/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold t-main">{entry.hours}h</span>
                              <span className="text-[10px] t-sub">{fmtDate(entry.date)}</span>
                            </div>
                            <div className="text-xs t-muted mt-0.5">{entry.description}</div>
                            <div className="text-[10px] t-sub mt-0.5">by {entry.agent}</div>
                          </div>
                          <button onClick={() => deleteWorkLog(ticket.id, entry.id)} className="p-1 hover:bg-rose-500/20 hover:text-rose-500 rounded t-sub transition-all"><X size={12}/></button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right: Requester + Meta + Actions */}
          <RequesterPanel
            ticket={liveTicket}
            isEditing={isEditing}
            edits={edits}
            set={set}
            agents={agents}
            groups={groups}
            categories={categories}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </Modal>
  )
}
