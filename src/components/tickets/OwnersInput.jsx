/**
 * OwnersInput — manages the account-owner list for a company or a ticket.
 *
 * An owner is `{ user_id, name, email }`. One search box does both jobs: typing
 * filters the agent list, and typing a full address that matches no agent gives
 * an "add this email" row — so free-text owners need no separate name field
 * (the name defaults to the address's local part).
 *
 * Owners are CC'd on the ticket's created / resolved / closed emails.
 *
 * Props:
 *   owners   ({user_id,name,email}[]) — current list
 *   onChange (fn)                     — called with the new list
 *   agents   (array)                  — agent list from the admin store
 *   disabled (bool)
 *   compact  (bool)                   — smaller chips, for narrow sidebars
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Mail, Plus, Search, X } from 'lucide-react'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// First letter of the first word + first letter of the last word (e.g.
// "Jai Sathish" -> "JS"). Falls back to the first two chars of a single word.
function initialsOf(name, email) {
  const src = String(name || '').trim() || String(email || '').split('@')[0]
  const parts = src.split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

// Deterministic avatar tint so each owner keeps a stable colour
const AVATAR_TINTS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-fuchsia-500',
]
function tintFor(key) {
  let h = 0
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_TINTS[h % AVATAR_TINTS.length]
}

export default function OwnersInput({
  owners = [],
  onChange,
  agents = [],
  disabled = false,
  compact = false,
}) {
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  const taken = useMemo(
    () => new Set(owners.map(o => String(o.email || '').toLowerCase())),
    [owners],
  )

  // Only internal staff (agents/technicians/admins, never end-users) with an
  // email-shaped username can be picked as an owner
  const selectable = useMemo(() => (
    (agents || [])
      .filter(a => a.id !== 'unassigned' && a.is_active !== false && a.role !== 'user')
      .filter(a => EMAIL_RE.test(String(a.username || '')))
      .filter(a => !taken.has(String(a.username).toLowerCase()))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
  ), [agents, taken])

  const q = query.trim().toLowerCase()
  const matches = useMemo(() => (
    (q ? selectable.filter(a =>
      String(a.name || '').toLowerCase().includes(q) ||
      String(a.username || '').toLowerCase().includes(q)
    ) : selectable).slice(0, 6)
  ), [selectable, q])

  // Offer the typed address itself once it's a valid email no agent matches
  const freeEmail = EMAIL_RE.test(q) && !matches.some(a => String(a.username).toLowerCase() === q)
    ? q : null

  const addOwner = (owner) => {
    const email = String(owner.email || '').trim().toLowerCase()
    if (!EMAIL_RE.test(email)) { setError('Type a full email address, or pick an agent'); return }
    if (taken.has(email)) { setError('That owner is already on the list'); return }
    onChange([...owners, {
      user_id: owner.user_id || null,
      name: String(owner.name || '').trim() || email.split('@')[0],
      email,
    }])
    setQuery('')
    setError('')
  }

  const removeOwner = (email) => {
    onChange(owners.filter(o => String(o.email).toLowerCase() !== String(email).toLowerCase()))
  }

  const closeAdd = () => { setAdding(false); setQuery(''); setError('') }

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (matches.length === 1) {
        const a = matches[0]
        addOwner({ user_id: a.id, name: a.name, email: a.username })
      } else if (freeEmail) {
        addOwner({ email: freeEmail })
      } else {
        setError('Type a full email address, or pick an agent')
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeAdd()
    }
  }

  const rowCls = 'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-indigo-500/10'

  return (
    <div className="space-y-2 min-w-0">
      <div className="flex flex-wrap items-center gap-1.5">
        {owners.length === 0 && disabled && (
          <span className="text-xs t-muted opacity-60">No owners — nobody is CC'd</span>
        )}

        {owners.map(o => {
          const sz = compact ? 'w-6 h-6 text-[9px]' : 'w-7 h-7 text-[10px]'
          return (
            <div key={o.email} className="relative group/owner">
              {/* Round avatar — initials; hover shows the name + email tooltip */}
              <div
                className={`${sz} rounded-full ${tintFor(o.email)} text-white font-bold flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-gray-900 cursor-default`}
                title={`${o.name} <${o.email}>`}
              >
                {initialsOf(o.name, o.email)}
              </div>

              {/* Hover tooltip with the full name + email */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 hidden group-hover/owner:block pointer-events-none">
                <div className="px-2 py-1 rounded-lg bg-gray-900 text-white text-[10px] whitespace-nowrap shadow-lg">
                  <div className="font-semibold">{o.name}</div>
                  <div className="opacity-80">{o.email}</div>
                </div>
              </div>

              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeOwner(o.email)}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover/owner:opacity-100 transition-opacity shadow"
                  aria-label={`Remove ${o.name}`}
                >
                  <X size={8} strokeWidth={3} />
                </button>
              )}
            </div>
          )
        })}

      </div>

      {/* Dropdown-style picker — like the "Assign To" select, but type-to-search.
          Click to open, filter as you type, pick with click or Enter. */}
      {!disabled && !adding && (
        <button
          type="button"
          onClick={() => { setAdding(true); setError('') }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs t-muted hover:t-main hover:border-indigo-500/60 transition-colors"
          style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}
        >
          <Plus size={13} className="flex-shrink-0" />
          <span className="flex-1 text-left">Add account owner…</span>
          <ChevronDown size={13} className="flex-shrink-0 opacity-60" />
        </button>
      )}

      {!disabled && adding && (
        <div
          className="rounded-lg overflow-hidden min-w-0"
          style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}
        >
          {/* Single search box: filters agents, or accepts a full email */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 t-muted pointer-events-none" />
            <input
              ref={inputRef}
              className="w-full pl-8 pr-7 py-2 text-xs t-main bg-transparent outline-none"
              style={{ borderBottom: '1px solid var(--c-border)' }}
              value={query}
              onChange={e => { setQuery(e.target.value); setError('') }}
              onKeyDown={handleKey}
              placeholder="Search agent or type email…"
            />
            <button
              type="button"
              onClick={closeAdd}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full t-muted hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Close"
            >
              <X size={11} />
            </button>
          </div>

          <div className="max-h-44 overflow-y-auto p-1">
            {matches.map(a => (
              <button
                key={a.id}
                type="button"
                className={rowCls}
                onClick={() => addOwner({ user_id: a.id, name: a.name, email: a.username })}
              >
                <span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-500 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                  {String(a.initials || a.name || '?').slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs t-main truncate">{a.name}</span>
                  <span className="block text-[10px] t-muted truncate">{a.username}</span>
                </span>
              </button>
            ))}

            {freeEmail && (
              <button type="button" className={rowCls} onClick={() => addOwner({ email: freeEmail })}>
                <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Mail size={10} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs t-main truncate">Add “{freeEmail}”</span>
                  <span className="block text-[10px] t-muted">Not an agent — CC this address</span>
                </span>
              </button>
            )}

            {matches.length === 0 && !freeEmail && (
              <p className="px-2 py-2 text-[10px] t-muted">
                {q ? 'No agent matches — type the full email address to add it.'
                   : 'Start typing a name, or paste an email address.'}
              </p>
            )}
          </div>

          {error && <p className="px-2.5 pb-2 text-[10px] text-rose-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
