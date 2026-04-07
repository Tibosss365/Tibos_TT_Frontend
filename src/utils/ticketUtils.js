export const STATUSES      = ['open', 'in-progress', 'on-hold', 'resolved', 'closed']
export const PRIORITIES    = ['critical', 'high', 'medium', 'low']
export const TICKET_TYPES  = ['request', 'incident']

export const TICKET_TYPE_META = {
  request:  { label: 'Request',  color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   dot: 'bg-blue-500',   icon: '📋' },
  incident: { label: 'Incident', color: 'text-rose-600 dark:text-rose-400',   bg: 'bg-rose-500/10',   border: 'border-rose-500/30',   dot: 'bg-rose-500',   icon: '⚠️' },
}
export const CATEGORIES = {
  hardware: 'Hardware',
  software: 'Software',
  network:  'Network',
  access:   'Access & Accounts',
  email:    'Email & Communication',
  security: 'Security',
  other:    'Other',
}

export function genId(tickets, prefix = 'TKT', digits = 4) {
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-`)
  const nums = tickets
    .map(t => parseInt(t.id.replace(re, ''), 10))
    .filter(n => !isNaN(n) && n > 0)
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `${prefix}-${String(next).padStart(Number(digits), '0')}`
}

export function categoryLabel(cat) {
  return CATEGORIES[cat] || cat
}

export function statusLabel(s) {
  return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const dy = Math.floor(h / 24)
  return `${dy}d ago`
}

// ── SLA Utilities ─────────────────────────────────────────────────────────────

function _fmtDuration(ms) {
  const totalSec = Math.floor(Math.abs(ms) / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/**
 * Returns SLA status info for a ticket.
 * @returns {{ label: string, overdue: boolean, paused: boolean, done: boolean } | null}
 */
export function getSlaInfo(ticket) {
  if (!ticket.slaDueAt) return null
  const status = ticket.status
  if (status === 'resolved' || status === 'closed') return { label: 'Completed', overdue: false, paused: false, done: true }
  if (status === 'on-hold') return { label: 'SLA Paused', overdue: false, paused: true, done: false }
  const diff = new Date(ticket.slaDueAt).getTime() - Date.now()
  if (diff < 0) return { label: `Overdue by ${_fmtDuration(diff)}`, overdue: true, paused: false, done: false }
  // Warning zone: less than 25% of total SLA time remains (approximate with < 1h for now)
  const warning = diff < 3600_000
  return { label: `${_fmtDuration(diff)} left`, overdue: false, paused: false, done: false, warning }
}

export const PRIORITY_COLORS = {
  critical: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  high:     { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  medium:   { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  low:      { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-400' },
}

export const STATUS_COLORS = {
  'open':        { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  'in-progress': { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30', dot: 'bg-violet-400' },
  'on-hold':     { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  'resolved':    { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  'closed':      { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-400' },
}
