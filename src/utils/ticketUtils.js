import { useAdminStore } from '../stores/adminStore'

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

/** Get the configured timezone (safe to call outside React). Falls back to local time. */
function _tz() {
  try {
    return useAdminStore.getState().systemSettings?.timezone || undefined
  } catch {
    return undefined
  }
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const tz = _tz()
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    ...(tz ? { timeZone: tz } : {}),
  })
}

export function fmtDateTime(iso) {
  if (!iso) return '—'
  const tz = _tz()
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    ...(tz ? { timeZone: tz } : {}),
  })
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

/**
 * Format seconds into a short human-readable string.
 * e.g.  7815 → "2h 10m"   |  45 → "45s"  |  86400 → "1d 00h"
 */
export function fmtSlaSeconds(totalSeconds) {
  totalSeconds = Math.abs(totalSeconds)
  const days  = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const mins  = Math.floor((totalSeconds % 3600) / 60)
  const secs  = totalSeconds % 60
  if (days)  return `${days}d ${String(hours).padStart(2,'0')}h`
  if (hours) return `${hours}h ${String(mins).padStart(2,'0')}m`
  if (mins)  return `${mins}m ${String(secs).padStart(2,'0')}s`
  return `${secs}s`
}

/**
 * Compute remaining SLA seconds from a normalized ticket object.
 * Returns a positive number while time remains, negative when overdue.
 * Returns null when SLA has not started or is completed.
 */
export function getSlaRemainingSeconds(ticket) {
  const slaStatus = ticket.slaStatus || 'not_started'
  if (slaStatus === 'not_started' || slaStatus === 'completed') return null
  const dueIso = ticket.slaDueTime || ticket.slaDueAt
  if (!dueIso) return null
  const dueMs = new Date(dueIso).getTime()

  // When paused, remaining is measured from the pause moment
  if (slaStatus === 'paused' && ticket.slaPausedAt) {
    return Math.floor((dueMs - new Date(ticket.slaPausedAt).getTime()) / 1000)
  }
  return Math.floor((dueMs - Date.now()) / 1000)
}

/**
 * Returns SLA display info for a ticket.
 *
 * @returns {{
 *   label: string,           // e.g. "2h 15m left" | "30m overdue" | "Paused" | "Completed"
 *   overdue: boolean,
 *   paused: boolean,
 *   done: boolean,
 *   notStarted: boolean,
 *   warning: boolean,        // < 25% time remaining
 *   remainingSeconds: number | null,
 *   overdueSeconds: number,
 * } | null}
 */
export function getSlaInfo(ticket) {
  const slaStatus = ticket.slaStatus || 'not_started'

  if (slaStatus === 'not_started') {
    const dueIso = ticket.slaDueTime || ticket.slaDueAt
    const slaSettings = useAdminStore.getState().slaSettings
    const startsOnAssign = slaSettings?.timerStart === 'on_assignment'
    if (!dueIso && (!ticket.assignee && startsOnAssign)) {
      return { label: 'Awaiting assignment', overdue: false, paused: false, done: false, notStarted: true, warning: false, remainingSeconds: null, overdueSeconds: 0 }
    }
    if (!dueIso) {
      return { label: 'Not started', overdue: false, paused: false, done: false, notStarted: true, warning: false, remainingSeconds: null, overdueSeconds: 0 }
    }
    return null
  }

  if (slaStatus === 'completed') {
    return { label: 'Completed', overdue: false, paused: false, done: true, notStarted: false, warning: false, remainingSeconds: null, overdueSeconds: 0 }
  }

  const remaining = getSlaRemainingSeconds(ticket)
  if (remaining === null) return null

  const overdueSeconds = remaining < 0 ? Math.abs(remaining) : 0

  if (slaStatus === 'paused') {
    return {
      label: `Paused — ${remaining > 0 ? fmtSlaSeconds(remaining) + ' left' : fmtSlaSeconds(overdueSeconds) + ' overdue'}`,
      overdue: false, paused: true, done: false, notStarted: false,
      warning: false, remainingSeconds: remaining, overdueSeconds,
    }
  }

  // Active or overdue
  if (remaining < 0 || slaStatus === 'overdue') {
    return {
      label: `${fmtSlaSeconds(overdueSeconds)} overdue`,
      overdue: true, paused: false, done: false, notStarted: false,
      warning: false, remainingSeconds: remaining, overdueSeconds,
    }
  }

  // Warning: less than 25% of the SLA window remains
  const priority = ticket.priority || 'medium'
  const slaSettings = useAdminStore.getState().slaSettings
  const slaHrs = slaSettings?.[priority] || 8
  const warnThresh = slaHrs * 3600 * 0.25
  const warning = remaining < warnThresh

  return {
    label: `${fmtSlaSeconds(remaining)} left`,
    overdue: false, paused: false, done: false, notStarted: false,
    warning, remainingSeconds: remaining, overdueSeconds: 0,
  }
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
