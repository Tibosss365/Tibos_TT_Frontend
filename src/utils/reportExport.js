// ── Ticket report exports (Excel + PDF) ──────────────────────────────────────
// Builds a dashboard-style report (status + priority/SLA summary, agent-wise
// breakdown and a ticket list) from whatever ticket set is passed in — so the
// caller can pass the *filtered* tickets and the report respects the active
// dashboard filters (Today, Critical, Overdue, etc.).
// The heavy libraries (xlsx / jspdf) are imported lazily so they only load when
// the user actually clicks an export button.

const STATUS_KEYS = ['open', 'in-progress', 'on-hold', 'resolved', 'closed']
const STATUS_LABEL = {
  open: 'Open',
  'in-progress': 'In Progress',
  'on-hold': 'On Hold',
  resolved: 'Resolved',
  closed: 'Closed',
}

const ACCENT = [14, 165, 233] // ocean blue

const isOverdue = (t) =>
  t.slaStatus === 'overdue' ||
  (t.slaStatus === 'active' && t.slaDueTime && new Date(t.slaDueTime) < new Date())

const dateStamp = () => new Date().toISOString().slice(0, 10)

// The on-hold reason is stored as a ticket timeline note ("Status changed to
// On Hold: <reason>"), not a dedicated field — pull the most recent one out.
function extractHoldReason(t) {
  const evts = t.timeline || []
  for (let i = evts.length - 1; i >= 0; i--) {
    const raw = (evts[i].text || '').replace(/<[^>]+>/g, '').trim() // strip HTML
    const m = raw.match(/On Hold\s*:?\s*(.+)/i)
    if (m && m[1].trim()) return m[1].trim()
  }
  return ''
}

function htmlToPlainText(value) {
  const html = String(value || '')
  if (!/<[a-z][\s\S]*>/i.test(html)) return html
  if (typeof DOMParser === 'undefined') {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|tr|h[1-6])\s*>/gi, '\n')
      .replace(/<\/(?:td|th)\s*>/gi, '\t')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style, head').forEach(node => node.remove())
  const blockTags = new Set(['ADDRESS', 'ARTICLE', 'BLOCKQUOTE', 'DIV', 'LI', 'P', 'SECTION', 'TR'])
  const read = node => {
    if (node.nodeType === 3) return node.nodeValue || ''
    if (node.nodeType !== 1) return ''
    if (node.tagName === 'BR') return '\n'
    const content = [...node.childNodes].map(read).join('')
    if (node.tagName === 'TD' || node.tagName === 'TH') return `${content}\t`
    return blockTags.has(node.tagName) ? `${content}\n` : content
  }
  return read(doc.body)
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\n[\t ]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Compute the report dataset from a (already filtered) ticket list.
 */
export function buildReportData(tickets, getAgentName, opts = {}) {
  const list = Array.isArray(tickets) ? tickets : []
  // When provided, only these agent ids appear in the agent-wise breakdown
  // (non-active / deleted agents are excluded — their tickets still count in
  // the overall summary totals).
  const activeAgentIds = opts.activeAgentIds || null

  const counts = {
    open: 0, 'in-progress': 0, 'on-hold': 0, resolved: 0, closed: 0,
    critical: 0, overdue: 0,
  }
  list.forEach(t => {
    if (counts[t.status] !== undefined) counts[t.status]++
    if (t.priority === 'critical') counts.critical++
    if (isOverdue(t)) counts.overdue++
  })

  // ── Agent-wise breakdown ──
  const agentMap = new Map()
  list.forEach(t => {
    const id = t.assignee || 'unassigned'
    // Exclude non-active agents from the agent-wise breakdown.
    if (activeAgentIds && id !== 'unassigned' && !activeAgentIds.has(String(id))) return
    const name = t.assignee ? getAgentName(t.assignee) : 'Unassigned'
    if (!agentMap.has(id)) {
      agentMap.set(id, { name, open: 0, 'in-progress': 0, 'on-hold': 0, resolved: 0, closed: 0, critical: 0, overdue: 0, total: 0 })
    }
    const row = agentMap.get(id)
    if (row[t.status] !== undefined) row[t.status]++
    if (t.priority === 'critical') row.critical++
    if (isOverdue(t)) row.overdue++
    row.total++
  })
  const agentRows = [...agentMap.values()].sort((a, b) => b.total - a.total)

  // ── Ticket list ──
  const getCategoryName = opts.getCategoryName || ((c) => c || '')
  const ticketRows = list.map(t => ({
    id: t.id,
    name: t.submitter || t.contactName || '',
    subject: t.subject || '',
    incident: t.type || '',
    description: htmlToPlainText(t.description),
    company: t.company || '',
    contactName: t.contactName || t.submitter || '',
    contactEmail: t.email || '',
    contactPhone: t.phone || '',
    category: t.category ? getCategoryName(t.category) : '',
    status: STATUS_LABEL[t.status] || t.status || '',
    priority: t.priority || '',
    agent: t.assignee ? getAgentName(t.assignee) : 'Unassigned',
    holdReason: t.holdReason || extractHoldReason(t),
    resolution: t.resolution || '',
    resolutionCode: t.resolutionCode || '',
    created: t.created ? new Date(t.created).toLocaleString() : '',
    updated: t.updated ? new Date(t.updated).toLocaleString() : '',
    dueDate: t.dueDate || '',
    asset: t.asset || '',
    source: t.source || '',
    tags: Array.isArray(t.tags) ? t.tags.join(', ') : (t.tags || ''),
    customFields: t.customFieldData && typeof t.customFieldData === 'object' ? JSON.stringify(t.customFieldData) : (t.customFieldData || ''),
    attachments: JSON.stringify((t.attachments || []).map(({ filename, contentType, size }) => ({ filename, contentType, size }))),
    owners: Array.isArray(t.owners) ? t.owners.join(', ') : (t.owners || ''),
    tasks: JSON.stringify(t.tasks || []),
    workLogs: JSON.stringify(t.workLog || []),
    firstResponse: t.firstRespondedAt ? new Date(t.firstRespondedAt).toLocaleString() : '',
    csatRating: t.csatRating || '',
    csatComment: t.csatComment || '',
    slaStatus: t.slaStatus || '',
    slaStart: t.slaStartTime ? new Date(t.slaStartTime).toLocaleString() : '',
    slaDue: t.slaDueTime ? new Date(t.slaDueTime).toLocaleString() : '',
  }))

  return { total: list.length, counts, agentRows, ticketRows, generatedAt: new Date() }
}

// Summary rows shared by both exporters: [Label, Count]
function summaryRows(d) {
  return [
    ['Open', d.counts.open],
    ['In Progress', d.counts['in-progress']],
    ['On Hold', d.counts['on-hold']],
    ['Resolved', d.counts.resolved],
    ['Closed', d.counts.closed],
    ['Critical', d.counts.critical],
    ['SLA Overdue', d.counts.overdue],
    ['Total', d.total],
  ]
}

/**
 * Download the report as a multi-sheet Excel workbook.
 * @param meta { filterLabel } — text describing the active filter.
 */
export async function exportTicketsExcel(tickets, getAgentName, meta = {}) {
  const XLSX = await import('xlsx')
  const d = buildReportData(tickets, getAgentName, { activeAgentIds: meta.activeAgentIds })
  const filterLabel = meta.filterLabel || 'All Time'

  // ── Summary sheet ──
  const aoa = []
  aoa.push(['Helpdesk Ticket Report'])
  aoa.push(['Generated', d.generatedAt.toLocaleString()])
  aoa.push(['Filter', filterLabel])
  aoa.push([])
  aoa.push(['Summary'])
  aoa.push(['Metric', 'Count'])
  summaryRows(d).forEach(r => aoa.push(r))
  aoa.push([])
  aoa.push(['Agent-wise Count'])
  aoa.push(['Agent', 'Open', 'In Progress', 'On Hold', 'Resolved', 'Closed', 'Critical', 'Overdue', 'Total'])
  d.agentRows.forEach(r =>
    aoa.push([r.name, r.open, r['in-progress'], r['on-hold'], r.resolved, r.closed, r.critical, r.overdue, r.total]),
  )

  const wb = XLSX.utils.book_new()
  const recurringTicketOccurrences = new Map()
  if (meta.includeCategorySummary) {
    const categoryName = meta.getCategoryName || (category => category || 'Uncategorized')
    const categoryTickets = Array.isArray(tickets) ? tickets : []
    const categoryCounts = new Map()
    const issueGroups = new Map()
    categoryTickets.forEach((ticket, ticketIndex) => {
      const category = ticket.category ? categoryName(ticket.category) : 'Uncategorized'
      categoryCounts.set(category || 'Uncategorized', (categoryCounts.get(category || 'Uncategorized') || 0) + 1)
      const subject = String(ticket.subject || '').trim()
      if (!subject) return
      const issueKey = `${String(category || 'Uncategorized').toLowerCase()}\u0000${subject.toLowerCase().replace(/\s+/g, ' ')}`
      const group = issueGroups.get(issueKey) || { category: category || 'Uncategorized', subject, tickets: [], ticketIndexes: [] }
      group.tickets.push(ticket)
      group.ticketIndexes.push(ticketIndex)
      issueGroups.set(issueKey, group)
    })
    const categoryRows = [
      ['Category Tickets Report'],
      ['Generated', d.generatedAt.toLocaleString()],
      ['Scope', 'All tickets currently loaded in the dashboard'],
      ['Total Categories', categoryCounts.size],
      ['Total Tickets', categoryTickets.length],
      [],
      ['Category', 'Times Occurred', 'Share of Total'],
      ...[...categoryCounts]
        .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
        .map(([category, count]) => [category, count, categoryTickets.length ? `${((count / categoryTickets.length) * 100).toFixed(1)}%` : '0%']),
      ['Total', categoryTickets.length, categoryTickets.length ? '100%' : '0%'],
    ]
    const categorySheet = XLSX.utils.aoa_to_sheet(categoryRows)
    categorySheet['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, categorySheet, 'Category Summary')

    const recurringGroups = [...issueGroups.values()]
      .filter(group => group.tickets.length > 1)
      .sort((a, b) => b.tickets.length - a.tickets.length || a.category.localeCompare(b.category) || a.subject.localeCompare(b.subject))
    const recurringRows = [
      ['Category', 'Recurring Subject', 'Times Occurred', 'Ticket IDs'],
      ...recurringGroups.map(group => [group.category, group.subject, group.tickets.length, group.tickets.map(ticket => ticket.id).join(', ')]),
    ]
    if (recurringGroups.length === 0) recurringRows.push(['No repeated category and subject pairs', '', 0, ''])
    const recurringSheet = XLSX.utils.aoa_to_sheet(recurringRows)
    recurringSheet['!cols'] = [{ wch: 34 }, { wch: 56 }, { wch: 18 }, { wch: 64 }]
    XLSX.utils.book_append_sheet(wb, recurringSheet, 'Recurring Issues')

    recurringGroups.forEach(group => group.ticketIndexes.forEach(ticketIndex => recurringTicketOccurrences.set(ticketIndex, group.tickets.length)))
  }

  const ws1 = XLSX.utils.aoa_to_sheet(aoa)
  ws1['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary')

  // ── Tickets sheet ──
  const tRows = [['Ticket #', 'Name', 'Subject', 'Incident', 'Description', 'Company', 'Contact Person', 'Contact Email', 'Contact Phone', 'Category', 'Status', 'Priority', 'Agent', 'Hold Reason', 'Resolution', 'Resolution Code', 'Created', 'Updated', 'Due Date', 'Asset', 'Source', 'Tags', 'Custom Fields', 'Attachments', 'Owners', 'Tasks', 'Work Logs', 'First Responded', 'CSAT Rating', 'CSAT Comment', 'SLA Status', 'SLA Start', 'SLA Due']]
  // Excel limits a single cell to 32,767 characters. Split unusually long
  // descriptions over continuation columns so exports retain the full text.
  const maxCellCharacters = 32767
  const descriptionParts = Math.max(1, ...d.ticketRows.map(t => Math.ceil((t.description || '').length / maxCellCharacters)))
  if (descriptionParts > 1) {
    tRows[0].splice(5, 1, ...Array.from({ length: descriptionParts }, (_, index) => `Description${index ? ` (continued ${index + 1})` : ''}`))
  }
  d.ticketRows.forEach(t => {
    const description = t.description || ''
    const parts = Array.from({ length: descriptionParts }, (_, index) => description.slice(index * maxCellCharacters, (index + 1) * maxCellCharacters))
    tRows.push([t.id, t.name, t.subject, t.incident, ...parts, t.company, t.contactName, t.contactEmail, t.contactPhone, t.category, t.status, t.priority, t.agent, t.holdReason, t.resolution, t.resolutionCode, t.created, t.updated, t.dueDate, t.asset, t.source, t.tags, t.customFields, t.attachments, t.owners, t.tasks, t.workLogs, t.firstResponse, t.csatRating, t.csatComment, t.slaStatus, t.slaStart, t.slaDue])
  })
  const ws2 = XLSX.utils.aoa_to_sheet(tRows)
  ws2['!cols'] = [
    { wch: 14 }, { wch: 24 }, { wch: 44 }, { wch: 18 },
    ...Array.from({ length: descriptionParts }, () => ({ wch: 60 })),
    { wch: 24 }, { wch: 20 }, { wch: 28 }, { wch: 16 }, { wch: 22 }, { wch: 13 }, { wch: 10 },
    { wch: 22 }, { wch: 28 }, { wch: 34 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 16 },
    { wch: 20 }, { wch: 16 }, { wch: 24 }, { wch: 40 }, { wch: 30 }, { wch: 24 }, { wch: 40 },
    { wch: 40 }, { wch: 20 }, { wch: 12 }, { wch: 30 }, { wch: 16 }, { wch: 20 }, { wch: 20 },
  ]
  XLSX.utils.book_append_sheet(wb, ws2, 'Tickets')

  if (meta.includeCategorySummary) {
    const recurringDetailRows = [
      ['Times Occurred', ...tRows[0]],
      ...[...recurringTicketOccurrences]
        .sort((a, b) => a[0] - b[0])
        .map(([ticketIndex, occurrenceCount]) => [occurrenceCount, ...tRows[ticketIndex + 1]]),
    ]
    if (recurringDetailRows.length === 1) recurringDetailRows.push(['No recurring tickets'])
    const recurringDetailsSheet = XLSX.utils.aoa_to_sheet(recurringDetailRows)
    recurringDetailsSheet['!cols'] = [{ wch: 18 }, ...(ws2['!cols'] || [])]
    XLSX.utils.book_append_sheet(wb, recurringDetailsSheet, 'Recurring Details')
  }

  // Keep each timeline entry as its own row so the complete conversation and
  // ticket activity can be read alongside the ticket's summary details.
  const messageRows = [['Ticket #', 'Ticket Subject', 'Date', 'Author', 'Type', 'Email Subject', 'From', 'To', 'CC', 'Message']]
  const timelineEntries = d.ticketRows.flatMap((row, ticketIndex) => {
    const ticket = tickets[ticketIndex]
    return (ticket.timeline || []).map(event => ({ row, event }))
  })
  const messages = timelineEntries.map(({ event }) => htmlToPlainText(event.text))
  const maxMessageParts = Math.max(1, ...messages.map(message => Math.ceil(message.length / maxCellCharacters)))
  if (maxMessageParts > 1) {
    messageRows[0].splice(9, 1, ...Array.from({ length: maxMessageParts }, (_, index) => `Message${index ? ` (continued ${index + 1})` : ''}`))
  }
  timelineEntries.forEach(({ row, event }, index) => {
    const message = messages[index]
    const parts = Array.from({ length: maxMessageParts }, (_, index) => message.slice(index * maxCellCharacters, (index + 1) * maxCellCharacters))
    messageRows.push([
      row.id, row.subject, event.ts ? new Date(event.ts).toLocaleString() : '', event.author || '', event.type || '',
      event.subject || '', event.from || '', event.to || '', event.cc || '', ...parts,
    ])
  })
  const ws3 = XLSX.utils.aoa_to_sheet(messageRows)
  ws3['!cols'] = [
    { wch: 14 }, { wch: 44 }, { wch: 22 }, { wch: 24 }, { wch: 18 },
    { wch: 32 }, { wch: 28 }, { wch: 28 }, { wch: 28 },
    ...Array.from({ length: maxMessageParts }, () => ({ wch: 60 })),
  ]
  XLSX.utils.book_append_sheet(wb, ws3, 'Ticket Messages')

  XLSX.writeFile(wb, meta.fileName || `helpdesk-report-${dateStamp()}.xlsx`)
}

/** Download resolution-time metrics grouped by the ticket's assigned agent. */
export async function exportAgentsResultExcel(tickets, getAgentName, meta = {}) {
  const XLSX = await import('xlsx')
  const list = Array.isArray(tickets) ? tickets : []
  const completedTickets = list.filter(ticket => ticket.status === 'resolved' || ticket.status === 'closed')
  const parseDate = value => {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const resolutionFor = ticket => {
    const explicit = parseDate(ticket.resolvedAt)
    if (explicit) return { date: explicit, source: 'Resolution timestamp' }
    const timeline = Array.isArray(ticket.timeline) ? ticket.timeline : []
    for (let index = timeline.length - 1; index >= 0; index--) {
      const event = timeline[index]
      const text = String(event.text || '').replace(/<[^>]*>/g, '')
      const isResolution = event.type === 'resolved' || event.type === 'closed' ||
        (event.type === 'status' && /\b(?:resolved|closed)\b/i.test(text))
      const date = isResolution ? parseDate(event.ts) : null
      if (date) return { date, source: 'Status history' }
    }
    const updated = parseDate(ticket.updated)
    return updated ? { date: updated, source: 'Last updated (fallback)' } : { date: null, source: 'Unavailable' }
  }
  const agentGroups = new Map()
  const detailRows = completedTickets.map(ticket => {
    const agent = ticket.assignee ? getAgentName(ticket.assignee) : 'Unassigned'
    const created = parseDate(ticket.created)
    const resolution = resolutionFor(ticket)
    const hours = created && resolution.date ? (resolution.date.getTime() - created.getTime()) / 3600000 : null
    const validHours = hours !== null && Number.isFinite(hours) && hours >= 0 ? hours : null
    const key = ticket.assignee ? String(ticket.assignee) : 'unassigned'
    if (!agentGroups.has(key)) agentGroups.set(key, { agent, total: 0, measured: [] })
    const group = agentGroups.get(key)
    group.total++
    if (validHours !== null) group.measured.push(validHours)
    return {
      agent,
      ticketId: ticket.id || '',
      subject: ticket.subject || '',
      category: ticket.category || '',
      status: STATUS_LABEL[ticket.status] || ticket.status || '',
      created,
      resolved: resolution.date,
      resolutionHours: validHours,
      timestampSource: resolution.source,
    }
  })
  const summaryRows = [...agentGroups.values()]
    .map(group => {
      const values = group.measured
      return [
        group.agent,
        group.total,
        values.length,
        values.length ? values.reduce((sum, value) => sum + value, 0) : '',
        values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : '',
        values.length ? Math.min(...values) : '',
        values.length ? Math.max(...values) : '',
      ]
    })
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))

  const workbook = XLSX.utils.book_new()
  const summary = XLSX.utils.aoa_to_sheet([
    ['Agents Result'],
    ['Generated', new Date().toLocaleString()],
    ['Scope', 'All resolved and closed tickets currently loaded in the dashboard'],
    ['Hours', 'Elapsed time from ticket creation to resolution'],
    [],
    ['Agent', 'Resolved / Closed Tickets', 'Tickets With Measured Time', 'Total Resolution Hours', 'Average Resolution Hours', 'Fastest (Hours)', 'Longest (Hours)'],
    ...summaryRows,
  ])
  summary['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 27 }, { wch: 24 }, { wch: 27 }, { wch: 18 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(workbook, summary, 'Agent Summary')

  const details = XLSX.utils.json_to_sheet(detailRows.map(row => ({
    Agent: row.agent,
    'Ticket ID': row.ticketId,
    Subject: row.subject,
    Category: row.category,
    Status: row.status,
    Created: row.created ? row.created.toLocaleString() : '',
    Resolved: row.resolved ? row.resolved.toLocaleString() : '',
    'Resolution Hours': row.resolutionHours === null ? '' : Number(row.resolutionHours.toFixed(2)),
    'Resolution Time Source': row.timestampSource,
  })))
  details['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 48 }, { wch: 28 }, { wch: 14 }, { wch: 23 }, { wch: 23 }, { wch: 20 }, { wch: 28 }]
  XLSX.utils.book_append_sheet(workbook, details, 'Resolved Ticket Details')

  const now = new Date()
  const fileName = meta.fileName || `agents-result-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

/**
 * Download the report as a PDF mirroring the dashboard structure.
 * @param meta { filterLabel } — text describing the active filter.
 */
export async function exportTicketsPdf(tickets, getAgentName, meta = {}) {
  const jspdfMod = await import('jspdf')
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default
  const autoTable = (await import('jspdf-autotable')).default
  const d = buildReportData(tickets, getAgentName, { activeAgentIds: meta.activeAgentIds })
  const filterLabel = meta.filterLabel || 'All Time'

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })

  // Title
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text('Helpdesk Ticket Report', 40, 48)
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Generated: ${d.generatedAt.toLocaleString()}`, 40, 64)
  doc.text(`Filter: ${filterLabel}    |    Total: ${d.total}`, 40, 77)

  // ── Summary cards (mirrors the dashboard stat cards) ──
  const cards = [
    { label: 'Open Tickets',  value: d.counts.open,           color: [37, 99, 235] },
    { label: 'In Progress',   value: d.counts['in-progress'], color: [14, 165, 233] },
    { label: 'On Hold',       value: d.counts['on-hold'],     color: [245, 158, 11] },
    { label: 'Resolved',      value: d.counts.resolved,       color: [16, 185, 129] },
    { label: 'Critical',      value: d.counts.critical,       color: [239, 68, 68] },
    { label: 'SLA Overdue',   value: d.counts.overdue,        color: [244, 63, 94] },
    { label: 'Total Tickets', value: d.total,                 color: [6, 182, 212] },
  ]
  const pageW = doc.internal.pageSize.getWidth()
  const mLeft = 40, perRow = 4, gap = 10, cardH = 46, cardY = 92
  const cardW = (pageW - mLeft * 2 - gap * (perRow - 1)) / perRow
  cards.forEach((c, i) => {
    const x = mLeft + (i % perRow) * (cardW + gap)
    const yy = cardY + Math.floor(i / perRow) * (cardH + gap)
    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x, yy, cardW, cardH, 6, 6, 'FD')
    doc.setFontSize(17)
    doc.setTextColor(c.color[0], c.color[1], c.color[2])
    doc.text(String(c.value), x + 12, yy + 25)
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(c.label, x + 12, yy + 38)
  })
  const cardRows = Math.ceil(cards.length / perRow)

  // Agent-wise
  let y = cardY + cardRows * cardH + (cardRows - 1) * gap + 26
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text('Agent-wise Count', 40, y)
  autoTable(doc, {
    startY: y + 8,
    head: [['Agent', 'Open', 'In Prog.', 'On Hold', 'Resolved', 'Closed', 'Critical', 'Overdue', 'Total']],
    body: d.agentRows.map(r => [r.name, r.open, r['in-progress'], r['on-hold'], r.resolved, r.closed, r.critical, r.overdue, r.total]),
    headStyles: { fillColor: ACCENT, textColor: 255 },
    styles: { fontSize: 8, cellPadding: 4 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' }, 8: { halign: 'center' } },
    theme: 'striped',
  })

  // Ticket details
  y = doc.lastAutoTable.finalY + 26
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text('Ticket Details', 40, y)
  autoTable(doc, {
    startY: y + 8,
    head: [['Ticket #', 'Subject', 'Category', 'Status', 'Priority', 'Agent', 'Hold Reason', 'Resolution']],
    body: d.ticketRows.map(t => [t.id, t.subject, t.category, t.status, t.priority, t.agent, t.holdReason, t.resolution]),
    headStyles: { fillColor: ACCENT, textColor: 255 },
    styles: { fontSize: 6.5, cellPadding: 2.5, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 46 },   // Ticket #
      1: { cellWidth: 96 },   // Subject
      2: { cellWidth: 66 },   // Category
      3: { cellWidth: 42 },   // Status
      4: { cellWidth: 40 },   // Priority
      5: { cellWidth: 70 },   // Agent
      6: { cellWidth: 70 },   // Hold Reason
      7: { cellWidth: 85 },   // Resolution
    },
    theme: 'striped',
  })

  doc.save(`helpdesk-report-${dateStamp()}.pdf`)
}

// ── Company-wise report exports ───────────────────────────────────────────────
// `rows` is a pre-computed array of company stat objects:
//   { name, domain, contactName, contactEmail, contactPhone,
//     total, open, closed, critical, slaPct, lastTicket }

export async function exportCompanyExcel(rows, meta = {}) {
  const XLSX = await import('xlsx')
  const filterLabel = meta.filterLabel || 'All Time'

  const aoa = [
    ['Company-wise Ticket Report'],
    ['Generated', new Date().toLocaleString()],
    ['Filter', filterLabel],
    [],
    ['Company', 'Domain', 'Contact Person', 'Contact Email', 'Contact Phone',
     'Total', 'Open', 'Closed', 'Critical', 'SLA %', 'Last Ticket'],
  ]
  rows.forEach(r => aoa.push([
    r.name, r.domain || '', r.contactName || '', r.contactEmail || '', r.contactPhone || '',
    r.total, r.open, r.closed, r.critical, r.slaPct, r.lastTicket || '',
  ]))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [
    { wch: 28 }, { wch: 24 }, { wch: 22 }, { wch: 28 }, { wch: 18 },
    { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 9 }, { wch: 8 }, { wch: 20 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Companies')
  XLSX.writeFile(wb, `company-report-${dateStamp()}.xlsx`)
}

export async function exportCompanyPdf(rows, meta = {}) {
  const jspdfMod = await import('jspdf')
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default
  const autoTable = (await import('jspdf-autotable')).default
  const filterLabel = meta.filterLabel || 'All Time'

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  doc.setFontSize(18); doc.setTextColor(15, 23, 42)
  doc.text('Company-wise Ticket Report', 40, 48)
  doc.setFontSize(9); doc.setTextColor(100, 116, 139)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 64)
  doc.text(`Filter: ${filterLabel}   |   Companies: ${rows.length}`, 40, 77)

  autoTable(doc, {
    startY: 92,
    head: [['Company', 'Domain', 'Contact Person', 'Contact Email', 'Total', 'Open', 'Closed', 'Critical', 'SLA %', 'Last Ticket']],
    body: rows.map(r => [r.name, r.domain || '', r.contactName || '', r.contactEmail || '', r.total, r.open, r.closed, r.critical, `${r.slaPct}%`, r.lastTicket || '']),
    headStyles: { fillColor: ACCENT, textColor: 255 },
    styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 84 },   // Company
      1: { cellWidth: 74 },   // Domain
      2: { cellWidth: 68 },   // Contact Person
      3: { cellWidth: 96 },   // Contact Email
      4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' },
      7: { halign: 'center' }, 8: { halign: 'center' },
    },
    theme: 'striped',
  })

  doc.save(`company-report-${dateStamp()}.pdf`)
}
