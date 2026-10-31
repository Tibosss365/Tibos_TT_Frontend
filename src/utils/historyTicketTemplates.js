const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'but', 'by', 'can', 'could',
  'do', 'does', 'for', 'from', 'get', 'has', 'have', 'help', 'in', 'is', 'it', 'its', 'issue',
  'kindly', 'need', 'of', 'on', 'our', 'please', 'problem', 'regards', 'request', 'should', 'that',
  'the', 'their', 'there', 'this', 'to', 'unable', 'was', 'we', 'were', 'with', 'would', 'thanks',
])

export function normalizeTicketSubject(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\b(?:re|fw|fwd)\s*:\s*/gi, ' ')
    .replace(/\b[A-Z]{2,10}[-# ]?\d{3,}\b/gi, ' ')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Z]{2,}/gi, ' ')
    .replace(/\b\+?\d[\d ().-]{7,}\d\b/g, ' ')
    .replace(/\b\d{5,}\b/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const subjectTokens = value => new Set(normalizeTicketSubject(value).split(/\s+/).filter(token => token.length > 2 && !STOP_WORDS.has(token)))
const issueKey = ticket => `${ticket.category || ''}|${ticket.type || 'request'}`
const ticketDescriptionEvidence = ticket => [ticket.description, ticket.resolution]
  .filter(Boolean)
  .map(value => String(value).replace(/<[^>]*>/g, ' '))
  .join(' ')

function similarity(left, right) {
  return tokenSimilarity(subjectTokens(left), subjectTokens(right))
}

function tokenSimilarity(a, b) {
  if (!a.size || !b.size) return 0
  let shared = 0
  a.forEach(token => { if (b.has(token)) shared++ })
  return shared / (a.size + b.size - shared)
}

function addTokens(target, source) {
  source.forEach(token => target.add(token))
  return target
}

function safeSubject(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b\+?\d[\d ().-]{7,}\d\b/g, '[phone]')
    .replace(/\b(?:TKT|INC|REQ|SR)[-# ]?\d{3,}\b/gi, '[ticket]')
    .replace(/\b\d{5,}\b/g, '[id]')
    .replace(/\s+/g, ' ')
    .trim()
}

function getDescriptionOutline() {
  return [
    'Please include:',
    '• When the issue started',
    '• Who or what is affected',
    '• The exact error message',
    '• Troubleshooting steps already tried',
  ].join('\n')
}

/** Build admin-reviewable drafts from repeated patterns across all loaded tickets. */
export function buildHistoryTemplateSuggestions(tickets = [], minimumMatches = 3) {
  const eligible = (Array.isArray(tickets) ? tickets : []).filter(ticket =>
    normalizeTicketSubject(ticket.subject),
  )
  const buckets = new Map()

  eligible.forEach(ticket => {
    const key = `${issueKey(ticket)}|${normalizeTicketSubject(ticket.subject)}`
    if (!buckets.has(key)) buckets.set(key, { key, tickets: [], category: ticket.category || '', type: ticket.type || 'request' })
    buckets.get(key).tickets.push(ticket)
  })

  // Compare precomputed subject and description tokens for all ticket groups.
  // This keeps analysis practical for a large history while using the complete
  // description/resolution text as matching evidence.
  for (const bucket of buckets.values()) {
    bucket.subjectTokenSets = bucket.tickets.map(ticket => subjectTokens(ticket.subject))
    bucket.descriptionTokens = bucket.tickets.reduce((tokens, ticket) => {
      const evidence = ticketDescriptionEvidence(ticket)
      return evidence ? addTokens(tokens, subjectTokens(evidence)) : tokens
    }, new Set())
  }

  // Merge similar subjects or descriptions only within the same type/category.
  const clusters = []
  for (const bucket of buckets.values()) {
    const sample = bucket.tickets[0]?.subject || ''
    const cluster = clusters.find(item => {
      if (item.category !== bucket.category || item.type !== bucket.type) return false
      const sampleTokens = subjectTokens(sample)
      const subjectMatch = Math.max(...item.subjectTokenSets.map(tokens => tokenSimilarity(tokens, sampleTokens))) >= 0.62
      const descriptionMatch = tokenSimilarity(item.descriptionTokens, bucket.descriptionTokens) >= 0.34
      return subjectMatch || descriptionMatch
    })
    if (cluster) {
      cluster.tickets.push(...bucket.tickets)
      cluster.subjects.push(...bucket.tickets.map(ticket => ticket.subject).filter(Boolean))
      cluster.subjectTokenSets.push(...bucket.subjectTokenSets)
      addTokens(cluster.descriptionTokens, bucket.descriptionTokens)
    } else {
      clusters.push({ ...bucket, subjects: bucket.tickets.map(ticket => ticket.subject).filter(Boolean) })
    }
  }

  return clusters
    .filter(cluster => cluster.tickets.length >= minimumMatches)
    .map(cluster => {
      const subjectCounts = new Map()
      cluster.subjects.forEach(subject => subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1))
      const subjects = [...subjectCounts.entries()].sort((a, b) => b[1] - a[1])
      const priorityCounts = new Map()
      cluster.tickets.forEach(ticket => {
        const priority = ticket.priority || 'medium'
        priorityCounts.set(priority, (priorityCounts.get(priority) || 0) + 1)
      })
      const priority = [...priorityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'medium'
      const subject = safeSubject(subjects[0]?.[0] || 'Recurring support issue')
      return {
        id: cluster.key,
        name: `${subject.slice(0, 82)}${subject.length > 82 ? '…' : ''} template`,
        subject,
        description: getDescriptionOutline(),
        category: cluster.category,
        type: cluster.type,
        priority,
        matchCount: cluster.tickets.length,
        exampleSubjects: subjects.slice(0, 3).map(([label]) => safeSubject(label)),
      }
    })
    .sort((a, b) => b.matchCount - a.matchCount)
}

/** Suggest historical subjects relevant to a selected template. */
export function getHistorySubjectSuggestions(tickets = [], template, minimumMatches = 1) {
  if (!template) return []
  const category = template.category && template.category !== 'other' ? String(template.category) : ''
  const templateContext = `${template.name || ''} ${template.subject || ''}`
  const matching = (Array.isArray(tickets) ? tickets : []).filter(ticket =>
    String(ticket.type || 'request') === String(template.type || 'request') &&
    (category
      ? String(ticket.category || '') === category
      : true) &&
    similarity(ticket.subject, templateContext) >= 0.18,
  )
  const groups = new Map()
  matching.forEach(ticket => {
    const key = normalizeTicketSubject(ticket.subject)
    if (!key) return
    if (!groups.has(key)) groups.set(key, { subject: safeSubject(ticket.subject), count: 0 })
    groups.get(key).count++
  })
  return [...groups.values()]
    .filter(item => item.count >= minimumMatches)
    .sort((a, b) => b.count - a.count)
}
