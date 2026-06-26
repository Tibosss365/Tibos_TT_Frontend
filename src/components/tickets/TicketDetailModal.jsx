import { useState, useEffect, useRef } from 'react'
import {
  Trash2, Save, MessageSquare, Pencil, X, CheckSquare, Square,
  Clock, Bell, ThumbsUp, ThumbsDown, ClipboardList, FileText,
  Plus, Timer, User, CheckCircle2, AlertCircle, MoreHorizontal,
  CalendarDays, Briefcase, Mail, MailOpen, Send, Paperclip, Download, Loader2 as SpinIcon,
  Image as ImageIcon, Link2, Link2Off, GitMerge, Scissors, BookOpen, Eye, Tag, Star, Lock,
} from 'lucide-react'
import { downloadAttachment, uploadAttachment } from '../../api/client'
import { Modal } from '../ui/Modal'
import { PriorityBadge, StatusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useTicketStore } from '../../stores/ticketStore'
import { useAdminStore } from '../../stores/adminStore'
import { useUserStore } from '../../stores/userStore'
import { useUiStore } from '../../stores/uiStore'
import { STATUSES, PRIORITIES, TICKET_TYPES, TICKET_TYPE_META, fmtDateTime, fmtDate, timeAgo, getSlaInfo, getSlaRemainingSeconds, fmtSlaSeconds } from '../../utils/ticketUtils'
import { useT } from '../../utils/i18n'
import SourceBadge from './SourceBadge'

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
  { id: 'conversations', icon: MessageSquare, label: 'Conversations' },
  { id: 'tasks',         icon: ClipboardList, label: 'Tasks' },
  { id: 'approvals',    icon: ThumbsUp,      label: 'Approvals' },
  { id: 'reminders',    icon: Bell,          label: 'Reminders' },
  { id: 'worklog',      icon: Timer,         label: 'Work Log' },
  { id: 'linked',       icon: Link2,         label: 'Linked' },
  { id: 'resolution',   icon: CheckCircle2,  label: 'Resolution' },
]

const LINK_TYPES = [
  { id: 'related',   label: 'Related',   color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
  { id: 'duplicate', label: 'Duplicate', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'parent',    label: 'Parent',    color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
  { id: 'child',     label: 'Child',     color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
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
function RequesterPanel({ ticket, isEditing, edits, set, agents, groups, categories, slaSettings, onEdit, onSave, onCancel, onDelete, hideActions, isDeleting }) {
  const t = useT()
  const initials = (ticket.submitter || ticket.contactName || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-glass flex-shrink-0 flex flex-col lg:overflow-y-auto">
      {/* Requester — always locked (read-only), even in edit mode */}
      <div className="p-4 border-b border-glass">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[10px] font-bold t-sub uppercase tracking-wider">{t('requester')}</span>
          <Lock size={10} className="t-sub opacity-60" />
        </div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white shadow-md">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold t-main truncate">{edits.submitter || '—'}</div>
            <div className="text-xs t-muted truncate mt-0.5">{edits.email || '—'}</div>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs t-muted">
            <Briefcase size={11} className="flex-shrink-0" />
            <span className="truncate">{edits.company || '—'}</span>
          </div>
        </div>
      </div>

      {/* Ticket Meta */}
      <div className="p-4 border-b border-glass flex-1">
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
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
        {/* Source */}
        <div>
          <div className={labelCls}>Source</div>
          <SourceBadge source={ticket.source} />
        </div>
        {/* Due Date */}
        {ticket.dueDate && (
          <div>
            <div className={labelCls}>Due Date</div>
            <div className="text-xs t-main flex items-center gap-1">
              <CalendarDays size={11} className="opacity-60" />
              {fmtDate(ticket.dueDate)}
            </div>
          </div>
        )}
        {/* First Response Time */}
        {ticket.firstRespondedAt && (
          <div>
            <div className={labelCls}>First Response</div>
            <div className="text-xs t-main">{fmtDateTime(ticket.firstRespondedAt)}</div>
          </div>
        )}
        {/* CSAT Rating */}
        {ticket.csatRating && (
          <div className="col-span-2 lg:col-span-1">
            <div className={labelCls}>CSAT Rating</div>
            <div className="flex items-center gap-0.5 mt-0.5">
              {[1,2,3,4,5].map(n => (
                <Star key={n} size={14} className={n <= ticket.csatRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'} />
              ))}
              {ticket.csatComment && (
                <span className="ml-2 text-xs t-sub italic truncate max-w-[120px]" title={ticket.csatComment}>"{ticket.csatComment}"</span>
              )}
            </div>
          </div>
        )}
        {/* Tags */}
        {ticket.tags?.length > 0 && (
          <div className="col-span-2 lg:col-span-1">
            <div className={labelCls}>Tags</div>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {ticket.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium">
                  <Tag size={9} />{tag}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="col-span-2 lg:col-span-1 p-3 rounded-xl border border-glass bg-black/3 dark:bg-white/3">
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
        {/* Due Date (editable) */}
        <div>
          <div className={labelCls}>Due Date</div>
          {isEditing ? (
            <input type="date" className={inputCls} value={edits.dueDate ? edits.dueDate.slice(0,10) : ''} onChange={e => set('dueDate', e.target.value)} />
          ) : (
            <div className="text-xs t-main py-1">{edits.dueDate ? fmtDate(edits.dueDate) : '—'}</div>
          )}
        </div>
        {/* Source (editable by staff, read-only for end users via hideActions) */}
        {!hideActions && (
          <div>
            <div className={labelCls}>Source</div>
            {isEditing ? (
              <select className={inputCls} value={edits.source} onChange={e => set('source', e.target.value)}>
                {['portal','email','phone','api','walk_in','chat'].map(s => (
                  <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            ) : (
              <SourceBadge source={edits.source} />
            )}
          </div>
        )}
        </div>{/* end grid */}
      </div>

      {/* Action Buttons — hidden for end users */}
      {!hideActions && (
        <div className="p-4 space-y-2">
          {isEditing ? (
            <>
              <Button variant="primary" size="sm" className="w-full" onClick={onSave}><Save size={13} /> {t('saveChanges')}</Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={onCancel}><X size={13} /> {t('cancel')}</Button>
            </>
          ) : (
            <Button variant="primary" size="sm" className="w-full" onClick={onEdit}><Pencil size={13} /> {t('editTicket')}</Button>
          )}
          <Button variant="danger" size="sm" className="w-full" onClick={onDelete} disabled={isDeleting}>
            {isDeleting ? <><SpinIcon size={13} className="animate-spin" /> Deleting…</> : <><Trash2 size={13} /> {t('delete')}</>}
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Pending compose attachment chips ─────────────────────────────────────────
function ComposeFileList({ files, onRemove }) {
  const fmtSize = (b) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {files.map((f, i) => {
        const isImg = f.type.startsWith('image/')
        const preview = isImg ? URL.createObjectURL(f) : null
        return (
          <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-indigo-500/30 bg-indigo-500/5 text-xs t-main group">
            {isImg
              ? <img src={preview} onLoad={() => URL.revokeObjectURL(preview)} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
              : <FileText size={14} className="t-sub flex-shrink-0" />
            }
            <span className="max-w-[120px] truncate">{f.name}</span>
            <span className="t-muted text-[10px]">{fmtSize(f.size)}</span>
            <button onClick={() => onRemove(i)} className="ml-0.5 t-muted hover:text-rose-400 transition-colors">
              <X size={11} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Attachment download row ────────────────────────────────────────────────────
function AttachmentRow({ att, ticketUuid, compact = false }) {
  const [downloading, setDownloading] = useState(false)
  const { addToast } = useUiStore()

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadAttachment(ticketUuid, att.id, att.filename)
    } catch {
      addToast('Download failed', 'error')
    } finally {
      setDownloading(false)
    }
  }

  const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (compact) {
    return (
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-glass bg-black/3 dark:bg-white/3 hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all group text-left"
      >
        <FileText size={12} className="t-sub flex-shrink-0" />
        <span className="text-[11px] t-main font-medium truncate max-w-[140px]">{att.filename}</span>
        {downloading
          ? <SpinIcon size={11} className="animate-spin text-indigo-400 flex-shrink-0" />
          : <Download size={11} className="text-indigo-400 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-glass bg-black/3 dark:bg-white/3 group">
      <FileText size={13} className="t-sub flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs t-main font-medium truncate">{att.filename}</div>
        <div className="text-[10px] t-sub">{fmtSize(att.size)}</div>
      </div>
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg
          bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500
          border border-indigo-500/20 transition-all disabled:opacity-50 flex-shrink-0"
      >
        {downloading
          ? <SpinIcon size={11} className="animate-spin" />
          : <Download size={11} />}
        {downloading ? 'Saving…' : 'Download'}
      </button>
    </div>
  )
}


// ── Main Modal ────────────────────────────────────────────────────────────────
export function TicketDetailModal({ ticket, onClose }) {
  const {
    updateTicket, addTimelineEvent, softDelete, fetchTicket,
    addTask, toggleTask, deleteTask,
    addWorkLog, deleteWorkLog,
    addReminder, toggleReminder, deleteReminder,
    addApproval, updateApprovalStatus,
    addLink, removeLink, mergeTickets, splitTicket,
  } = useTicketStore()
  const linkedTickets = useTicketStore(s => s.linkedTickets[ticket._uuid] || [])
  const allTickets    = useTicketStore(s => s.tickets)
  const { agents, getAgentName, getCategoryName, categories, groups, slaSettings,
          cannedResponses, resolutionCodes, onHoldReasons } = useAdminStore()
  const { currentUser } = useUserStore()
  const { addToast } = useUiStore()
  const t = useT()
  const isEndUser = currentUser?.role === 'user'


  const [activeTab, setActiveTab] = useState(isEndUser ? 'conversations' : 'details')
  const [resolverId, setResolverId]     = useState(currentUser?.id || '')
  const [resolutionCode, setResolutionCode] = useState('')
  const [editingResolution, setEditingResolution] = useState(false)

  // On-hold reason modal
  const [onHoldModalOpen, setOnHoldModalOpen]   = useState(false)
  const [pendingOnHoldReason, setPendingOnHoldReason] = useState('')
  const [onHoldNote, setOnHoldNote]             = useState('')

  // Merge modal
  const [mergeModalOpen, setMergeModalOpen]     = useState(false)
  const [mergeSearch, setMergeSearch]           = useState('')
  const [mergeTarget, setMergeTarget]           = useState(null)
  const [merging, setMerging]                   = useState(false)

  // Split modal
  const [splitModalOpen, setSplitModalOpen]     = useState(false)
  const [splitForm, setSplitForm]               = useState({ subject: '', description: '', priority: 'medium' })
  const [splitting, setSplitting]               = useState(false)

  // Canned responses picker
  const [cannedOpen, setCannedOpen]             = useState(false)
  const cannedRef = useRef(null)

  // Linked ticket add-link form
  const [linkSearch, setLinkSearch]             = useState('')
  const [linkType, setLinkType]                 = useState('related')

  // Agent collision detection via BroadcastChannel
  const [otherViewers, setOtherViewers]         = useState([])
  useEffect(() => {
    if (!window.BroadcastChannel) return
    const channel = new BroadcastChannel(`ticket-viewers-${ticket._uuid}`)
    const myId    = currentUser?.id || 'unknown'
    const myName  = currentUser?.name || 'An agent'
    const announce = () => channel.postMessage({ type: 'presence', id: myId, name: myName, ts: Date.now() })
    announce()
    const interval = setInterval(announce, 15000)
    channel.onmessage = (e) => {
      if (e.data.type === 'presence' && e.data.id !== myId) {
        setOtherViewers(prev => {
          const without = prev.filter(v => v.id !== e.data.id)
          return [...without, { id: e.data.id, name: e.data.name, ts: e.data.ts }]
        })
      }
    }
    return () => { clearInterval(interval); channel.close() }
  }, [ticket._uuid]) // eslint-disable-line

  // Expire stale viewers (>30s since last heartbeat)
  useEffect(() => {
    const id = setInterval(() => {
      setOtherViewers(prev => prev.filter(v => Date.now() - v.ts < 30000))
    }, 5000)
    return () => clearInterval(id)
  }, [])

  // Close canned picker on outside click
  useEffect(() => {
    const handler = (e) => { if (cannedRef.current && !cannedRef.current.contains(e.target)) setCannedOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Load full ticket detail (with timeline) when modal opens
  useEffect(() => {
    fetchTicket(ticket._uuid)
  }, [ticket._uuid])
  const [isEditing, setIsEditing] = useState(false)
  const [edits, setEdits] = useState({
    subject:         ticket.subject         || '',
    status:          ticket.status          || 'open',
    priority:        ticket.priority        || 'medium',
    type:            ticket.type            || 'request',
    assignee:        ticket.assignee        || '',
    group:           ticket.group           || '',
    description:     ticket.description     || '',
    submitter:       ticket.submitter       || '',
    company:         ticket.company         || '',
    email:           ticket.email           || '',
    category:        ticket.category        || '',
    asset:           ticket.asset           || '',
    resolution:      ticket.resolution      || '',
    source:          ticket.source          || 'portal',
    tags:            ticket.tags            || [],
    customFieldData: ticket.customFieldData || {},
    dueDate:         ticket.dueDate         || '',
  })

  const set = (k, v) => setEdits(x => ({ ...x, [k]: v }))

  // ── Live ticket data ────────────────────────────────────────────────────────
  const liveTicket = useTicketStore(s => s.tickets.find(t => t.id === ticket.id)) || ticket

  // Sync edits whenever liveTicket changes (e.g. after save or SSE push) so the
  // sidebar/SLA panel always reflects the latest backend values.
  useEffect(() => {
    if (isEditing) return             // don't clobber in-progress edits
    setEdits(prev => ({
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
      // Preserve an unsaved resolution note the user is typing on the Resolution
      // tab — a background refresh must not wipe it before they hit Resolve/Save.
      resolution:  (prev?.resolution && prev.resolution !== (liveTicket.resolution || ''))
        ? prev.resolution
        : (liveTicket.resolution || ''),
    }))
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

  // ── Confirm on-hold with reason ───────────────────────────────────────────
  const handleConfirmOnHold = async () => {
    if (!pendingOnHoldReason) { addToast('Please select a reason', 'error'); return }
    const noteText = onHoldNote.trim() ? ` — ${onHoldNote}` : ''
    addTimelineEvent(ticket._uuid, {
      type: 'status',
      text: `Status changed to <strong>On Hold</strong>: ${pendingOnHoldReason}${noteText}`,
    })
    await updateTicket(ticket._uuid, { status: 'on-hold' })
    await fetchTicket(ticket._uuid)
    set('status', 'on-hold')
    addToast('Ticket placed on hold', 'success')
    setOnHoldModalOpen(false)
    setPendingOnHoldReason('')
    setOnHoldNote('')
    setIsEditing(false)
  }

  // ── Merge handler ─────────────────────────────────────────────────────────
  const handleMerge = async () => {
    if (!mergeTarget) return
    setMerging(true)
    try {
      await mergeTickets(ticket._uuid, mergeTarget._uuid, currentUser?.name)
      addToast(`Ticket ${mergeTarget.id} merged into this ticket`, 'success')
      setMergeModalOpen(false)
      setMergeTarget(null)
      setMergeSearch('')
    } catch { addToast('Merge failed', 'error') }
    finally { setMerging(false) }
  }

  // ── Split handler ─────────────────────────────────────────────────────────
  const handleSplit = async () => {
    if (!splitForm.subject.trim() || !splitForm.description.trim()) {
      addToast('Subject and description are required', 'error'); return
    }
    setSplitting(true)
    try {
      const newT = await splitTicket(ticket._uuid, {
        subject:     splitForm.subject,
        description: splitForm.description,
        priority:    splitForm.priority,
        category:    liveTicket.category || '',
        contactName: liveTicket.submitter || '',
        email:       liveTicket.email || '',
        company:     liveTicket.company || '',
        type:        liveTicket.type || 'request',
      })
      addToast(`Split ticket ${newT.id} created`, 'success')
      setSplitModalOpen(false)
      setSplitForm({ subject: '', description: '', priority: 'medium' })
    } catch { addToast('Split failed', 'error') }
    finally { setSplitting(false) }
  }

  const handleSave = async (overrides = {}) => {
    const merged = { ...edits, ...overrides }

    // Intercept on-hold to collect reason first
    if ((merged.status === 'on-hold') && (liveTicket.status !== 'on-hold')) {
      setOnHoldModalOpen(true)
      return
    }

    // Resolution notes are mandatory when resolving a ticket
    if (merged.status === 'resolved' && liveTicket.status !== 'resolved' && !(merged.resolution || '').trim()) {
      addToast('Please enter resolution notes before resolving', 'error')
      setActiveTab('resolution')
      return
    }

    const fields = ['subject','status','priority','type','assignee','group','description','submitter','company','email','category','asset','resolution','source','dueDate']
    const changes = {}
    // Compare against liveTicket so we catch changes the backend already applied
    fields.forEach(k => { if ((merged[k]||'') !== (liveTicket[k]||'')) changes[k] = merged[k] })
    // Tags (array comparison)
    if (JSON.stringify(merged.tags||[]) !== JSON.stringify(liveTicket.tags||[])) changes.tags = merged.tags || []
    // Custom field data
    if (JSON.stringify(merged.customFieldData||{}) !== JSON.stringify(liveTicket.customFieldData||{})) changes.customFieldData = merged.customFieldData || {}
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

  const [deleting, setDeleting] = useState(false)
  const handleDelete = async () => {
    if (!window.confirm('Move this ticket to trash? You can restore it within 30 days.')) return
    setDeleting(true)
    try {
      await softDelete(ticket._uuid)
      addToast('Ticket moved to trash', 'info')
      onClose()
    } catch (e) {
      addToast(e.message || 'Failed to delete ticket', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ── Comment / Email compose ────────────────────────────────────────────────
  const [comment, setComment] = useState('')
  const [sendToCustomer, setSendToCustomer] = useState(false)

  // Email compose state
  const [composeMode, setComposeMode] = useState('comment') // 'comment' | 'email'
  const [composeTo, setComposeTo]     = useState('')
  const [composeCc, setComposeCc]     = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [expandedEmail, setExpandedEmail] = useState(null) // track which email is expanded

  // Compose attachments (files/pasted images pending upload)
  const [composeFiles, setComposeFiles]   = useState([]) // Array<File>
  const [uploading, setUploading]         = useState(false)
  const attachFileRef = useRef(null)

  const addComposeFiles = (fileList) => {
    const valid = Array.from(fileList).filter(f => f.size <= 10 * 1024 * 1024)
    setComposeFiles(prev => [...prev, ...valid])
  }

  const handleComposePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) addComposeFiles([file])
        break
      }
    }
  }

  const removeComposeFile = (idx) => setComposeFiles(prev => prev.filter((_, i) => i !== idx))

  const openReply = (ev, replyAll = false) => {
    setComposeMode('email')
    setComposeTo(ev.from || liveTicket.email || '')
    setComposeCc(replyAll ? (ev.cc || '') : '')
    setComposeSubject(ev.subject ? `Re: ${ev.subject}` : `Re: ${liveTicket.subject || ''}`)
    setComposeBody('')
  }

  const openNewEmail = () => {
    setComposeMode('email')
    setComposeTo(liveTicket.email || '')
    setComposeCc('')
    setComposeSubject(liveTicket.subject || '')
    setComposeBody('')
  }

  const uploadPendingFiles = async () => {
    if (composeFiles.length === 0) return
    setUploading(true)
    try {
      await Promise.all(composeFiles.map(f => uploadAttachment(ticket._uuid, f)))
      // refresh attachments in store after upload
      await fetchTicket(ticket._uuid)
    } catch {
      addToast('Some files failed to upload', 'error')
    } finally {
      setUploading(false)
      setComposeFiles([])
    }
  }

  const handleComment = async () => {
    if (!comment.trim() && composeFiles.length === 0) return
    await uploadPendingFiles()
    if (comment.trim()) {
      addTimelineEvent(ticket._uuid, {
        type: 'comment',
        text: comment,
        author: currentUser?.name || 'Agent',
        sendToCustomer,
      })
    }
    setComment('')
    addToast(sendToCustomer ? 'Comment added & emailed to customer' : 'Comment added', 'success')
  }

  const handleSendEmail = async () => {
    if (!composeTo.trim() || !composeBody.trim()) return
    await uploadPendingFiles()
    addTimelineEvent(ticket._uuid, {
      type: 'email_out',
      text: composeBody,
      subject: composeSubject,
      to: composeTo,
      cc: composeCc,
      author: currentUser?.name || 'Agent',
    })
    setComposeMode('comment')
    setComposeTo(''); setComposeCc(''); setComposeSubject(''); setComposeBody('')
    addToast('Email sent to customer', 'success')
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const [newTask, setNewTask] = useState({ title: '', dueDate: '', assignee: currentUser?.id || '' })
  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!newTask.title.trim()) return
    setNewTask({ title: '', dueDate: '', assignee: currentUser?.id || '' })
    try { await addTask(ticket.id, newTask); addToast('Task added', 'success') }
    catch { addToast('Failed to save task', 'error') }
  }

  // ── Work Log ───────────────────────────────────────────────────────────────
  const [newLog, setNewLog] = useState({ hours: '', description: '', date: new Date().toISOString().slice(0,10) })
  const handleAddLog = async (e) => {
    e.preventDefault()
    if (!newLog.hours || !newLog.description.trim()) return
    setNewLog({ hours: '', description: '', date: new Date().toISOString().slice(0,10) })
    try { await addWorkLog(ticket.id, { ...newLog, agent: currentUser?.name || 'Agent' }); addToast('Work log added', 'success') }
    catch { addToast('Failed to save work log', 'error') }
  }

  // ── Reminders ─────────────────────────────────────────────────────────────
  const [newReminder, setNewReminder] = useState({ date: '', note: '' })
  const handleAddReminder = async (e) => {
    e.preventDefault()
    if (!newReminder.date) return
    setNewReminder({ date: '', note: '' })
    try { await addReminder(ticket.id, newReminder); addToast('Reminder set', 'success') }
    catch { addToast('Failed to save reminder', 'error') }
  }

  // ── Approvals ─────────────────────────────────────────────────────────────
  const [newApproval, setNewApproval] = useState({ requestedFrom: '', note: '' })
  const handleAddApproval = async (e) => {
    e.preventDefault()
    if (!newApproval.requestedFrom) return
    setNewApproval({ requestedFrom: '', note: '' })
    try { await addApproval(ticket.id, { ...newApproval, requestedBy: currentUser?.name || 'Agent' }); addToast('Approval request sent', 'success') }
    catch { addToast('Failed to save approval', 'error') }
  }

  const totalHours = (liveTicket.workLog||[]).reduce((s, w) => s + Number(w.hours||0), 0)

  // Resolution note shows in read-only "view mode" once it's been saved to the
  // backend (matches liveTicket) and the user isn't actively editing it.
  const resolutionSaved = !!(edits.resolution || '').trim() && (edits.resolution || '') === (liveTicket.resolution || '')
  const showResolutionView = resolutionSaved && !editingResolution

  return (
    <>
    <Modal isOpen onClose={onClose} title="" size="xl" fillHeight fullScreen>
      <div className="flex flex-col flex-1 min-h-0">

        {/* ── Top Status Bar ───────────────────────────────────────────── */}
        {/* ── Agent Collision Banner ───────────────────────────────────── */}
        {otherViewers.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/25 flex-shrink-0 flex-wrap">
            <Eye size={12} className="text-amber-500 flex-shrink-0" />
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Also viewing: {otherViewers.map(v => v.name).join(', ')}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-glass flex-shrink-0 flex-wrap gap-y-1.5">
          <span className="text-sm font-bold t-main font-mono">{ticket.id}</span>
          <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
          {isEditing && !isEndUser ? (
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
          {isEditing && !isEndUser ? (
            <select className="glass-input text-xs py-1 w-32" value={edits.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')}</option>)}
            </select>
          ) : <StatusBadge status={edits.status} />}
          {isEditing && !isEndUser ? (
            <select className="glass-input text-xs py-1 w-28" value={edits.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>
          ) : <PriorityBadge priority={edits.priority} />}
          {isEditing && !isEndUser ? (
            <select className="glass-input text-xs py-1 w-36" value={edits.assignee} onChange={e => set('assignee', e.target.value)}>
              <option value="">— Unassigned —</option>
              {agents.filter(a => a.id !== 'unassigned' && a.is_active !== false).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          ) : (
            <span className="text-xs t-muted">
              <span className="t-sub">{t('assignee')}:</span> {edits.assignee ? getAgentName(edits.assignee) : '—'}
            </span>
          )}
          <div className="flex-1" />
          {/* Merge & Split actions (staff only) */}
          {!isEndUser && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMergeModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border border-glass t-muted hover:border-violet-500/40 hover:text-violet-500 hover:bg-violet-500/5 transition-all"
                title="Merge with another ticket"
              >
                <GitMerge size={12} /> Merge
              </button>
              <button
                onClick={() => setSplitModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border border-glass t-muted hover:border-sky-500/40 hover:text-sky-500 hover:bg-sky-500/5 transition-all"
                title="Split into a new ticket"
              >
                <Scissors size={12} /> Split
              </button>
            </div>
          )}
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
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] t-sub">
            <CalendarDays size={11} />
            Created {fmtDateTime(ticket.created)}
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        {/* Mobile: vertical stack (body scrolls as one). Desktop: side-by-side, each column scrolls independently. */}
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">

          {/* Left: Tabs */}
          <div className="flex-1 min-w-0 flex flex-col lg:overflow-hidden">

            {/* Tab bar */}
            <div className="flex border-b border-glass px-2 sm:px-4 flex-shrink-0 overflow-x-auto">
              {(isEndUser ? MODAL_TABS.filter(t => t.id === 'details' || t.id === 'conversations') : MODAL_TABS).map(({ id, icon: Icon, label }) => {
                // Badge counts
                let badge = 0
                if (id === 'tasks')     badge = (liveTicket.tasks||[]).filter(t=>!t.done).length
                if (id === 'reminders') badge = (liveTicket.reminders||[]).filter(r=>!r.done).length
                if (id === 'approvals') badge = (liveTicket.approvals||[]).filter(a=>a.status==='pending').length
                if (id === 'worklog')   badge = (liveTicket.workLog||[]).length
                if (id === 'linked')    badge = linkedTickets.length
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
            <div className="flex-1 lg:overflow-y-auto p-4 sm:p-5">

              {/* ── Conversations ── */}
              {activeTab === 'conversations' && (
                <div className="space-y-3">

                  {/* ── Ticket Attachments panel ── */}
                  {(liveTicket.attachments || []).length > 0 && (
                    <div className="p-3 rounded-xl border border-glass bg-black/3 dark:bg-white/3">
                      <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold t-sub uppercase tracking-wider">
                        <Paperclip size={11} /> Attachments ({liveTicket.attachments.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {liveTicket.attachments.map(att => (
                          <AttachmentRow key={att.id} att={att} ticketUuid={liveTicket._uuid} compact />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Timeline ── */}
                  <div className="space-y-2">
                    {(liveTicket.timeline || []).length === 0 && (
                      <div className="text-sm t-muted text-center py-8">No activity yet</div>
                    )}
                    {(liveTicket.timeline || []).map((ev, i) => {
                      const style    = TIMELINE_STYLES[ev.type] || { dot: 'bg-black/20 dark:bg-white/30', label: '' }
                      const isEmailOut = ev.type === 'email_out'
                      const isEmailIn  = ev.type === 'email_in'
                      const isComment  = ev.type === 'comment'
                      const isEmail    = isEmailOut || isEmailIn
                      const isExpanded = expandedEmail === i

                      /* ── Email bubble (in or out) ── */
                      if (isEmail) {
                        return (
                          <div key={i} className={`rounded-xl border overflow-hidden ${
                            isEmailOut
                              ? 'border-sky-500/30 bg-sky-500/5'
                              : 'border-teal-500/30 bg-teal-500/5'
                          }`}>
                            {/* Email header row */}
                            <div
                              className="flex items-start justify-between gap-2 px-3 py-2.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              onClick={() => setExpandedEmail(isExpanded ? null : i)}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isEmailOut
                                  ? <Send size={12} className="text-sky-500 flex-shrink-0" />
                                  : <MailOpen size={12} className="text-teal-500 flex-shrink-0" />
                                }
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isEmailOut ? 'text-sky-500' : 'text-teal-500'}`}>
                                      {isEmailOut ? 'Email Sent' : 'Email Received'}
                                    </span>
                                    {isEmailIn && ev.from && (
                                      <span className="text-[11px] font-semibold t-main truncate max-w-[180px]">{ev.from}</span>
                                    )}
                                    {isEmailOut && ev.to && (
                                      <span className="text-[11px] t-muted truncate max-w-[180px]">→ {ev.to}</span>
                                    )}
                                  </div>
                                  {ev.subject && (
                                    <p className="text-xs font-medium t-main mt-0.5 truncate">{ev.subject}</p>
                                  )}
                                  {!isExpanded && (
                                    <p className="text-[11px] t-muted mt-0.5 line-clamp-1">
                                      {(ev.text || '').replace(/<[^>]+>/g, '').slice(0, 100)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] t-sub">{timeAgo(ev.ts)}</span>
                                <span className="text-[10px] t-muted">{isExpanded ? '▲' : '▼'}</span>
                              </div>
                            </div>

                            {/* Expanded body */}
                            {isExpanded && (
                              <>
                                {/* Meta row */}
                                <div className="px-3 py-1.5 space-y-0.5" style={{ borderTop: '1px solid rgba(0,0,0,0.08)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                                  {ev.from && <div className="text-[11px] t-muted"><span className="font-semibold t-sub">From:</span> {ev.from}</div>}
                                  {ev.to   && <div className="text-[11px] t-muted"><span className="font-semibold t-sub">To:</span> {ev.to}</div>}
                                  {ev.cc   && <div className="text-[11px] t-muted"><span className="font-semibold t-sub">CC:</span> {ev.cc}</div>}
                                </div>

                                {/* Body */}
                                <div className="px-3 py-3">
                                  <div className="text-xs t-main leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: ev.text }} />
                                </div>

                                {/* Reply actions (only on received emails, staff only) */}
                                {isEmailIn && !isEndUser && (
                                  <div className="flex items-center gap-2 px-3 py-2" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                                    <button
                                      onClick={() => openReply(ev, false)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-500 border border-sky-500/25 hover:bg-sky-500/20 transition-all"
                                    >
                                      <Mail size={12} /> Reply
                                    </button>
                                    <button
                                      onClick={() => openReply(ev, true)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-glass t-muted hover:t-main hover:bg-white/5 transition-all"
                                    >
                                      <Mail size={12} /> Reply All
                                    </button>
                                    <button
                                      onClick={() => {
                                        setComposeMode('email')
                                        setComposeTo(liveTicket.email || '')
                                        setComposeCc('')
                                        setComposeSubject(`Fwd: ${ev.subject || liveTicket.subject || ''}`)
                                        setComposeBody(`\n\n---------- Forwarded Message ----------\nFrom: ${ev.from || ''}\n\n${(ev.text || '').replace(/<[^>]+>/g, '')}`)
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-glass t-muted hover:t-main hover:bg-white/5 transition-all"
                                    >
                                      <Send size={12} /> Forward
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )
                      }

                      /* ── Regular timeline event ── */
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

                  {/* ── Compose area ── */}
                  <div className="pt-3 border-t border-glass space-y-2">

                    {/* Mode toggle buttons */}
                    {!isEndUser && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openNewEmail}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            composeMode === 'email'
                              ? 'bg-sky-500/15 text-sky-500 border-sky-500/40'
                              : 'border-glass t-muted hover:text-sky-500 hover:border-sky-500/30 hover:bg-sky-500/5'
                          }`}
                        >
                          <Mail size={12} /> New Email
                        </button>
                        <button
                          onClick={() => { setComposeMode('comment'); setComposeTo(''); setComposeCc(''); setComposeSubject(''); setComposeBody('') }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            composeMode === 'comment'
                              ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40'
                              : 'border-glass t-muted hover:t-main hover:bg-white/5'
                          }`}
                        >
                          <MessageSquare size={12} /> Add Comment
                        </button>
                      </div>
                    )}

                    {/* Hidden file input for attach button */}
                    <input
                      ref={attachFileRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.log,.zip"
                      className="hidden"
                      onChange={e => { addComposeFiles(e.target.files); e.target.value = '' }}
                    />

                    {/* Email compose form */}
                    {composeMode === 'email' ? (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold t-sub uppercase tracking-wider flex items-center gap-2">
                          <Mail size={11} className="text-sky-500" />
                          <span className="text-sky-500">Email Customer</span>
                          <button
                            onClick={() => { setComposeMode('comment'); setComposeFiles([]) }}
                            className="ml-auto text-[10px] t-muted hover:t-main"
                          >✕ Cancel</button>
                        </div>

                        {/* To */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold t-sub w-6">To</span>
                          <input
                            className="glass-input flex-1 text-xs py-1.5"
                            value={composeTo}
                            onChange={e => setComposeTo(e.target.value)}
                            placeholder="recipient@example.com"
                          />
                        </div>

                        {/* CC */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold t-sub w-6">CC</span>
                          <input
                            className="glass-input flex-1 text-xs py-1.5"
                            value={composeCc}
                            onChange={e => setComposeCc(e.target.value)}
                            placeholder="cc@example.com (optional)"
                          />
                        </div>

                        {/* Subject */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold t-sub w-6">Re</span>
                          <input
                            className="glass-input flex-1 text-xs py-1.5"
                            value={composeSubject}
                            onChange={e => setComposeSubject(e.target.value)}
                            placeholder="Subject"
                          />
                        </div>

                        {/* Body */}
                        <textarea
                          value={composeBody}
                          onChange={e => setComposeBody(e.target.value)}
                          onPaste={handleComposePaste}
                          className="glass-input w-full text-sm resize-none"
                          rows={5}
                          placeholder="Write your email message… (paste screenshots directly)"
                          autoFocus
                        />

                        {/* Attached files preview */}
                        {composeFiles.length > 0 && (
                          <ComposeFileList files={composeFiles} onRemove={removeComposeFile} />
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => attachFileRef.current?.click()}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-glass t-muted hover:t-main hover:bg-white/5 transition-all"
                            title="Attach file"
                          >
                            <Paperclip size={12} /> Attach
                          </button>
                          <div className="flex-1" />
                          <button
                            onClick={() => { setComposeMode('comment'); setComposeFiles([]) }}
                            className="px-3 py-1.5 rounded-lg text-xs t-muted hover:t-main transition-colors"
                          >Cancel</button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSendEmail}
                            disabled={(!composeTo.trim() || !composeBody.trim()) || uploading}
                          >
                            {uploading ? <SpinIcon size={13} className="animate-spin" /> : <Send size={13} />}
                            {uploading ? 'Uploading…' : 'Send Email'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Internal comment form */
                      <>
                        <div className={labelCls}>{t('addComment')}</div>
                        <textarea
                          value={comment}
                          onChange={e => setComment(e.target.value)}
                          onPaste={handleComposePaste}
                          className="glass-input w-full text-sm resize-none"
                          rows={3}
                          placeholder="Write a comment… (paste screenshots directly with Ctrl+V)"
                        />

                        {/* Attached files preview */}
                        {composeFiles.length > 0 && (
                          <ComposeFileList files={composeFiles} onRemove={removeComposeFile} />
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => attachFileRef.current?.click()}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-glass t-muted hover:t-main hover:bg-white/5 transition-all"
                              title="Attach file"
                            >
                              <Paperclip size={12} /> Attach
                            </button>
                            {/* Canned Response picker */}
                            {!isEndUser && cannedResponses.length > 0 && (
                              <div className="relative" ref={cannedRef}>
                                <button
                                  type="button"
                                  onClick={() => setCannedOpen(v => !v)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-glass t-muted hover:t-main hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all"
                                  title="Insert canned response"
                                >
                                  <BookOpen size={12} /> Canned
                                </button>
                                {cannedOpen && (
                                  <div className="absolute bottom-full mb-1 left-0 z-50 w-72 rounded-xl border border-glass shadow-glass-lg animate-fade-in overflow-hidden" style={{ background: 'var(--c-card-bg)' }}>
                                    <div className="px-3 py-2 border-b border-glass text-[10px] font-bold t-sub uppercase tracking-wider">Canned Responses</div>
                                    <div className="max-h-48 overflow-y-auto">
                                      {cannedResponses.map(cr => (
                                        <button
                                          key={cr.id}
                                          type="button"
                                          onClick={() => {
                                            const body = cr.body
                                              .replace(/{contact_name}/g, liveTicket.submitter || '')
                                              .replace(/{ticket_id}/g, liveTicket.id || '')
                                              .replace(/{agent_name}/g, currentUser?.name || '')
                                            setComment(prev => prev ? prev + '\n\n' + body : body)
                                            setCannedOpen(false)
                                          }}
                                          className="w-full text-left px-3 py-2.5 hover:bg-indigo-500/5 transition-colors border-b border-glass last:border-0"
                                        >
                                          <div className="text-xs font-semibold t-main">{cr.title}</div>
                                          <div className="text-[10px] t-muted mt-0.5 line-clamp-2 whitespace-pre-line">{cr.body}</div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {!isEndUser && (
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
                            )}
                          </div>
                          <Button variant={sendToCustomer ? 'primary' : 'ghost'} size="sm" onClick={handleComment} disabled={uploading} className="flex-shrink-0">
                            {uploading ? <SpinIcon size={13} className="animate-spin" /> : sendToCustomer ? <Send size={13} /> : <MessageSquare size={13} />}
                            {uploading ? 'Uploading…' : sendToCustomer ? 'Send Email' : 'Post'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                </div>
              )}

              {/* ── Details ── */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  {/* ── Attachments (top) ── */}
                  {(liveTicket.attachments || []).length > 0 && (
                    <div className="p-3 rounded-xl border border-glass bg-black/3 dark:bg-white/3">
                      <div className={labelCls + ' flex items-center gap-1.5 mb-2'}>
                        <Paperclip size={11} /> Attachments ({liveTicket.attachments.length})
                      </div>
                      <div className="space-y-1.5">
                        {liveTicket.attachments.map(att => (
                          <AttachmentRow
                            key={att.id}
                            att={att}
                            ticketUuid={liveTicket._uuid}
                          />
                        ))}
                      </div>
                    </div>
                  )}
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
                      <textarea className={inputCls + ' resize-y leading-relaxed'} rows={10}
                        style={{ minHeight: '160px' }}
                        value={edits.description} onChange={e => set('description', e.target.value)} />
                    ) : (
                      <div className="text-xs t-main leading-relaxed py-1 whitespace-pre-wrap min-h-[120px]">{edits.description || <span className="opacity-40">No description</span>}</div>
                    )}
                  </div>
                  {isEditing ? (
                    isEndUser && (
                      <div className="flex gap-2 pt-1">
                        <Button variant="primary" size="sm" onClick={() => handleSave()}><Save size={13}/> Save Changes</Button>
                        <Button variant="ghost" size="sm" onClick={handleCancel}><X size={13}/> Cancel</Button>
                      </div>
                    )
                  ) : (
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
                          {agents.filter(a=>a.id!=='unassigned'&&a.is_active!==false).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
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
                  {resolutionCodes.length > 0 && (
                    <div>
                      <div className={labelCls}>Resolution Code</div>
                      <select
                        className={inputCls}
                        value={resolutionCode}
                        onChange={e => setResolutionCode(e.target.value)}
                      >
                        <option value="">— Select a resolution code —</option>
                        {resolutionCodes.map(rc => (
                          <option key={rc.id} value={rc.id}>{rc.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className={labelCls + ' mb-0'}>Resolution Notes <span className="text-rose-500">*</span></div>
                      {showResolutionView && (
                        <button type="button" onClick={() => setEditingResolution(true)} className="text-[11px] text-indigo-500 hover:text-indigo-400 font-medium flex items-center gap-1">
                          <Pencil size={11} /> Edit
                        </button>
                      )}
                    </div>
                    {showResolutionView ? (
                      <div className="glass-input w-full text-sm leading-relaxed whitespace-pre-wrap t-main" style={{ minHeight: 'auto' }}>
                        {edits.resolution}
                      </div>
                    ) : (
                      <textarea
                        className={inputCls + ' resize-none leading-relaxed'}
                        rows={5}
                        value={edits.resolution}
                        onChange={e => set('resolution', e.target.value)}
                        placeholder="Describe how the issue was resolved… (required to resolve)"
                      />
                    )}
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
                        {agents.filter(a => a.id !== 'unassigned' && a.is_active !== false).map(a => (
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
                        disabled={!resolverId || !edits.resolution.trim()}
                        onClick={async () => {
                          if (!resolverId) { addToast('Please select who resolved this ticket', 'error'); return }
                          if (!edits.resolution.trim()) { addToast('Please enter resolution notes before resolving', 'error'); return }
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
                    {!showResolutionView && (
                      <Button variant="ghost" size="sm" onClick={async () => {
                        if (!(edits.resolution || '').trim()) { addToast('Enter resolution notes first', 'error'); return }
                        await updateTicket(ticket._uuid, { resolution: edits.resolution })
                        setEditingResolution(false)
                        addToast('Resolution notes saved', 'success')
                      }}>
                        <Save size={13}/> Save Notes
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Linked Tickets ── */}
              {activeTab === 'linked' && (
                <div className="space-y-4">
                  {/* Add link form */}
                  <div className="p-3 rounded-xl border border-glass bg-black/3 dark:bg-white/3 space-y-3">
                    <div className={labelCls}>Link a Ticket</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[10px] t-sub mb-1">Relationship</div>
                        <select className={inputCls} value={linkType} onChange={e => setLinkType(e.target.value)}>
                          {LINK_TYPES.map(lt => <option key={lt.id} value={lt.id}>{lt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <div className="text-[10px] t-sub mb-1">Search Ticket ID / Subject</div>
                        <input className={inputCls} value={linkSearch} onChange={e => setLinkSearch(e.target.value)} placeholder="e.g. TKT-0042" />
                      </div>
                    </div>
                    {/* Search results */}
                    {linkSearch.trim().length >= 2 && (() => {
                      const q = linkSearch.toLowerCase()
                      const hits = allTickets.filter(t =>
                        t._uuid !== ticket._uuid &&
                        !linkedTickets.some(l => l.linkedUuid === t._uuid) &&
                        ((t.id||'').toLowerCase().includes(q) || (t.subject||'').toLowerCase().includes(q))
                      ).slice(0, 5)
                      return hits.length > 0 ? (
                        <div className="space-y-1">
                          {hits.map(t => (
                            <button key={t._uuid} type="button"
                              onClick={() => {
                                addLink(ticket._uuid, { linkedUuid: t._uuid, linkedId: t.id, type: linkType })
                                setLinkSearch('')
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-glass hover:bg-indigo-500/5 hover:border-indigo-500/30 text-left transition-all"
                            >
                              <span className="text-[10px] font-mono t-sub">{t.id}</span>
                              <span className="text-xs t-main flex-1 truncate">{t.subject}</span>
                              <Plus size={11} className="text-indigo-400 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs t-muted text-center py-2">No matching tickets</div>
                      )
                    })()}
                  </div>

                  {/* Linked tickets list */}
                  {linkedTickets.length === 0 ? (
                    <div className="text-sm t-muted text-center py-8">No linked tickets yet</div>
                  ) : (
                    <div className="space-y-2">
                      {linkedTickets.map(link => {
                        const linked = allTickets.find(t => t._uuid === link.linkedUuid)
                        const lt = LINK_TYPES.find(l => l.id === link.type) || LINK_TYPES[0]
                        return (
                          <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl border border-glass bg-black/3 dark:bg-white/3">
                            <Link2 size={13} className="t-sub flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${lt.color}`}>{lt.label}</span>
                                <span className="text-[10px] font-mono t-sub">{link.linkedId}</span>
                              </div>
                              <div className="text-xs t-main truncate mt-0.5">
                                {linked ? linked.subject : <span className="opacity-40">Ticket not found / deleted</span>}
                              </div>
                              {linked && (
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                                    linked.status === 'resolved' || linked.status === 'closed' ? 'bg-emerald-500/15 text-emerald-500' :
                                    linked.status === 'on-hold' ? 'bg-amber-500/15 text-amber-500' : 'bg-indigo-500/15 text-indigo-400'
                                  }`}>{linked.status}</span>
                                  <span className="text-[10px] t-muted">{linked.priority}</span>
                                </div>
                              )}
                            </div>
                            <button onClick={() => removeLink(ticket._uuid, link.id)}
                              className="p-1 hover:bg-rose-500/20 hover:text-rose-500 rounded t-sub transition-all flex-shrink-0"
                            ><Link2Off size={12}/></button>
                          </div>
                        )
                      })}
                    </div>
                  )}
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
                        {agents.filter(a=>a.id!=='unassigned'&&a.is_active!==false).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
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
            isEditing={isEditing && !isEndUser}
            edits={edits}
            set={set}
            agents={agents}
            groups={groups}
            categories={categories}
            slaSettings={slaSettings}
            onEdit={isEndUser ? undefined : handleEdit}
            onSave={isEndUser ? undefined : handleSave}
            onCancel={isEndUser ? undefined : handleCancel}
            onDelete={isEndUser ? undefined : handleDelete}
            hideActions={isEndUser}
            isDeleting={deleting}
          />
        </div>
      </div>
    </Modal>

    {/* ── Overlay Modals (rendered outside <Modal> to avoid z-index conflicts) ─ */}

    {/* ── On-Hold Reason Modal ─────────────────────────────────────────────── */}
    {onHoldModalOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={() => setOnHoldModalOpen(false)} />
        <div className="relative z-10 w-full max-w-md rounded-2xl p-6 animate-fade-in shadow-glass-lg" style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Clock size={16} className="text-amber-500" />
            </div>
            <div>
              <div className="text-sm font-bold t-main">Place Ticket On Hold</div>
              <div className="text-xs t-muted">Select a reason for putting this ticket on hold</div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className={labelCls}>Reason *</div>
              <select className={inputCls} value={pendingOnHoldReason} onChange={e => setPendingOnHoldReason(e.target.value)}>
                <option value="">— Select a reason —</option>
                {onHoldReasons.map(r => <option key={r.id} value={r.label}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <div className={labelCls}>Additional Note <span className="font-normal t-muted normal-case tracking-normal">(optional)</span></div>
              <input className={inputCls} value={onHoldNote} onChange={e => setOnHoldNote(e.target.value)} placeholder="e.g. Waiting for reply from John" />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Button variant="primary" size="sm" onClick={handleConfirmOnHold} disabled={!pendingOnHoldReason} className="flex-1">
              <Clock size={13} /> Confirm On Hold
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setOnHoldModalOpen(false); setPendingOnHoldReason(''); setOnHoldNote('') }}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* ── Merge Modal ──────────────────────────────────────────────────────── */}
    {mergeModalOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={() => { setMergeModalOpen(false); setMergeTarget(null); setMergeSearch('') }} />
        <div className="relative z-10 w-full max-w-lg rounded-2xl p-6 animate-fade-in shadow-glass-lg" style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <GitMerge size={16} className="text-violet-500" />
            </div>
            <div>
              <div className="text-sm font-bold t-main">Merge Ticket</div>
              <div className="text-xs t-muted">Select a ticket to merge into <strong>{ticket.id}</strong>. The selected ticket will be closed.</div>
            </div>
          </div>
          <input
            className={inputCls + ' mb-3'}
            value={mergeSearch}
            onChange={e => setMergeSearch(e.target.value)}
            placeholder="Search by ticket ID or subject…"
            autoFocus
          />
          <div className="max-h-60 overflow-y-auto space-y-1.5 mb-4">
            {(() => {
              const q = mergeSearch.toLowerCase()
              const hits = allTickets.filter(t =>
                t._uuid !== ticket._uuid &&
                t.status !== 'resolved' && t.status !== 'closed' &&
                (!q || (t.id||'').toLowerCase().includes(q) || (t.subject||'').toLowerCase().includes(q))
              ).slice(0, 8)
              return hits.length > 0 ? hits.map(t => (
                <button key={t._uuid} type="button"
                  onClick={() => setMergeTarget(mergeTarget?._uuid === t._uuid ? null : t)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    mergeTarget?._uuid === t._uuid
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-glass hover:bg-violet-500/5 hover:border-violet-500/30'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono t-sub">{t.id}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-indigo-500/15 text-indigo-400`}>{t.status}</span>
                    </div>
                    <div className="text-xs t-main truncate mt-0.5">{t.subject}</div>
                  </div>
                  {mergeTarget?._uuid === t._uuid && <CheckCircle2 size={14} className="text-violet-500 flex-shrink-0" />}
                </button>
              )) : <div className="text-xs t-muted text-center py-4">No tickets found</div>
            })()}
          </div>
          {mergeTarget && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 mb-4 text-xs text-amber-600 dark:text-amber-400">
              <strong>Warning:</strong> Ticket <strong>{mergeTarget.id}</strong> will be moved to trash and linked to this ticket.
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleMerge} disabled={!mergeTarget || merging} className="flex-1">
              {merging ? <><SpinIcon size={13} className="animate-spin" /> Merging…</> : <><GitMerge size={13} /> Merge Ticket</>}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setMergeModalOpen(false); setMergeTarget(null); setMergeSearch('') }}>Cancel</Button>
          </div>
        </div>
      </div>
    )}

    {/* ── Split Modal ───────────────────────────────────────────────────────── */}
    {splitModalOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={() => setSplitModalOpen(false)} />
        <div className="relative z-10 w-full max-w-lg rounded-2xl p-6 animate-fade-in shadow-glass-lg" style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center">
              <Scissors size={16} className="text-sky-500" />
            </div>
            <div>
              <div className="text-sm font-bold t-main">Split Ticket</div>
              <div className="text-xs t-muted">Create a new linked ticket from part of this one</div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className={labelCls}>New Ticket Subject *</div>
              <input className={inputCls} value={splitForm.subject} onChange={e => setSplitForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief description of the split issue" />
            </div>
            <div>
              <div className={labelCls}>Priority</div>
              <select className={inputCls} value={splitForm.priority} onChange={e => setSplitForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <div className={labelCls}>Description *</div>
              <textarea
                className={inputCls + ' resize-none'}
                rows={4}
                value={splitForm.description}
                onChange={e => setSplitForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the issue that needs to be split off…"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Button variant="primary" size="sm" onClick={handleSplit} disabled={splitting || !splitForm.subject.trim()} className="flex-1">
              {splitting ? <><SpinIcon size={13} className="animate-spin" /> Creating…</> : <><Scissors size={13} /> Create Split Ticket</>}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setSplitModalOpen(false); setSplitForm({ subject: '', description: '', priority: 'medium' }) }}>Cancel</Button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
