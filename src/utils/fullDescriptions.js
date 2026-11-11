import { api } from '../api/client'

// Ticket lists carry only a short description preview to keep pages fast. Reports
// need the complete text, so they fetch it on demand (cached for a minute).
let cache = { at: 0, map: null }

async function loadAll() {
  const map = new Map()
  const take = data => (data.items || []).forEach(t => map.set(t.ticket_id, t.description || ''))
  const first = await api.get('/tickets?page=1&page_size=100&full_description=true')
  take(first)
  const pages = Math.max(1, Number(first.pages) || 1)
  for (let start = 2; start <= pages; start += 4) {
    const end = Math.min(start + 3, pages)
    const batch = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, i) => api.get(`/tickets?page=${start + i}&page_size=100&full_description=true`))
    )
    batch.forEach(take)
  }
  return map
}

export async function withFullDescriptions(list) {
  if (!list.length) return list
  if (!cache.map || Date.now() - cache.at > 60000) cache = { at: Date.now(), map: await loadAll() }
  return list.map(t => (cache.map.has(t.id) ? { ...t, description: cache.map.get(t.id) } : t))
}
