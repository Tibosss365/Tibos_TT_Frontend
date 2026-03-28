const BASE = 'http://127.0.0.1:8000'

function getToken() {
  try {
    const raw = localStorage.getItem('helpdesk-user')
    if (!raw) return null
    return JSON.parse(raw)?.state?.token ?? null
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) {
    const msg = data?.detail || `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
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
    assignee:    t.assignee_id ? String(t.assignee_id) : null,
    assigneeObj: t.assignee || null,
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
