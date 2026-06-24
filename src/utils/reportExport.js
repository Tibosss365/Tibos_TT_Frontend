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
  const ticketRows = list.map(t => ({
    id: t.id,
    subject: t.subject || '',
    status: STATUS_LABEL[t.status] || t.status || '',
    priority: t.priority || '',
    agent: t.assignee ? getAgentName(t.assignee) : 'Unassigned',
    created: t.created ? new Date(t.created).toLocaleString() : '',
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
  const ws1 = XLSX.utils.aoa_to_sheet(aoa)
  ws1['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary')

  // ── Tickets sheet ──
  const tRows = [['Ticket #', 'Subject', 'Status', 'Priority', 'Agent', 'Created']]
  d.ticketRows.forEach(t => tRows.push([t.id, t.subject, t.status, t.priority, t.agent, t.created]))
  const ws2 = XLSX.utils.aoa_to_sheet(tRows)
  ws2['!cols'] = [{ wch: 14 }, { wch: 50 }, { wch: 14 }, { wch: 10 }, { wch: 22 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Tickets')

  XLSX.writeFile(wb, `helpdesk-report-${dateStamp()}.xlsx`)
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
    head: [['Ticket #', 'Subject', 'Status', 'Priority', 'Agent']],
    body: d.ticketRows.map(t => [t.id, t.subject, t.status, t.priority, t.agent]),
    headStyles: { fillColor: ACCENT, textColor: 255 },
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 64 }, 1: { cellWidth: 210 }, 4: { cellWidth: 96 } },
    theme: 'striped',
  })

  doc.save(`helpdesk-report-${dateStamp()}.pdf`)
}

// ── Company-wise report exports ───────────────────────────────────────────────
// `rows` is a pre-computed array of company stat objects:
//   { name, domain, total, open, closed, critical, slaPct, lastTicket }

export async function exportCompanyExcel(rows, meta = {}) {
  const XLSX = await import('xlsx')
  const filterLabel = meta.filterLabel || 'All Time'

  const aoa = [
    ['Company-wise Ticket Report'],
    ['Generated', new Date().toLocaleString()],
    ['Filter', filterLabel],
    [],
    ['Company', 'Domain', 'Total', 'Open', 'Closed', 'Critical', 'SLA %', 'Last Ticket'],
  ]
  rows.forEach(r => aoa.push([r.name, r.domain || '', r.total, r.open, r.closed, r.critical, r.slaPct, r.lastTicket || '']))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 9 }, { wch: 8 }, { wch: 20 }]
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
    head: [['Company', 'Domain', 'Total', 'Open', 'Closed', 'Critical', 'SLA %', 'Last Ticket']],
    body: rows.map(r => [r.name, r.domain || '', r.total, r.open, r.closed, r.critical, `${r.slaPct}%`, r.lastTicket || '']),
    headStyles: { fillColor: ACCENT, textColor: 255 },
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 100 }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' } },
    theme: 'striped',
  })

  doc.save(`company-report-${dateStamp()}.pdf`)
}
