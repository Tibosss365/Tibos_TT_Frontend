// const BASE = 'https://tt.tibostech.in'
const BASE = 'https://tibos-tt-api.azurewebsites.net'
// const BASE = 'http://127.0.0.1:8000'


function getToken() {
  try {
    const raw = localStorage.getItem('helpdesk-user')
    if (!raw) return null
    return JSON.parse(raw)?.state?.token ?? null
  } catch {
    return null
  }
}

/** Clear persisted state and force a fresh login. */
function forceLogout() {
  localStorage.removeItem('helpdesk-user')
  localStorage.removeItem('helpdesk-tickets')
  localStorage.removeItem('helpdesk-admin')
  window.location.href = '/login'
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 204) return null

  // ── Auth error: token expired / invalid ──────────────────────────────────
  // Only auto-logout when a token was present — not on login failures (no token)
  if (res.status === 401 && token) {
    forceLogout()
    return   // navigation in progress; prevent further processing
  }

  const data = await res.json()
  if (!res.ok) {
    const detail = data?.detail
    let msg
    if (!detail) {
      msg = `HTTP ${res.status}`
    } else if (typeof detail === 'string') {
      msg = detail
    } else if (Array.isArray(detail)) {
      // FastAPI validation errors: [{loc, msg, type}]
      msg = detail.map(e => {
        const field = Array.isArray(e.loc) ? e.loc.filter(x => x !== 'body').join(' → ') : ''
        return field ? `${field}: ${e.msg}` : e.msg
      }).join('\n')
    } else {
      msg = JSON.stringify(detail)
    }
    throw new Error(msg)
  }
  return data
}

export const api = {
  get:    (path)        => request(path),
  post:   (path, body)  => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (path, body)  => request(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  put:    (path, body)  => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)        => request(path, { method: 'DELETE' }),
}

/** Normalize a ticket from the backend shape to the frontend shape. */
export function normalizeTicket(t) {
  return {
    _uuid:       String(t.id),
    id:          t.ticket_id,
    subject:     t.subject,
    category:    t.category,
    priority:    t.priority,
    status:      t.status,
    company:     t.company || '',
    email:       t.email || '',
    phone:       t.phone || '',
    asset:       t.asset || '',
    description: t.description || '',
    submitter:   t.submitter_name,
    contactName: t.contact_name || '',
    assignee:    t.assignee_id ? String(t.assignee_id) : (t.assignee?.id ? String(t.assignee.id) : null),
    assigneeObj: t.assignee || null,
    group:       t.group_id ? String(t.group_id) : (t.group?.id ? String(t.group.id) : ''),
    resolution:  t.resolution || '',
    // ── SLA v2 fields ─────────────────────────────────────────────────
    slaStatus:        t.sla_status        || 'not_started',
    slaStartTime:     t.sla_start_time    || null,
    slaDueTime:       t.sla_due_time      || t.sla_due_at || null,  // prefer v2
    slaPausedAt:      t.sla_paused_at     || null,
    slaPausedSeconds: t.sla_paused_seconds || 0,
    isOverdue:        t.is_overdue        || false,
    // Legacy alias (used by older components)
    slaDueAt:         t.sla_due_time      || t.sla_due_at || null,
    // ──────────────────────────────────────────────────────────────────
    created:     t.created_at,
    updated:     t.updated_at,
    timeline: (t.timeline || []).map(ev => ({
      type:   ev.type,
      text:   ev.text,
      ts:     ev.created_at,
      author: ev.author?.name || '',
    })),
  }
}
