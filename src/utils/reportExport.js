// ── Ticket report exports (Excel + PDF) ──────────────────────────────────────
// Builds a dashboard-style report (status summary, today's counts, agent-wise
// breakdown and a ticket list) and downloads it as .xlsx or .pdf.
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

function isToday(d) {
  if (!d) return false
  const dt = new Date(d)
  const now = new Date()
  return (
    dt.getFullYear() === now.getFullYear() &&
    dt.getMonth() === now.getMonth() &&
    dt.getDate() === now.getDate()
  )
}

const dateStamp = () => new Date().toISOString().slice(0, 10)

/**
 * Compute the report dataset from the full ticket list + agent name resolver.
 */
export function buildReportData(tickets, getAgentName) {
  const list = Array.isArray(tickets) ? tickets : []
  const total = list.length

  const byStatus = Object.fromEntries(STATUS_KEYS.map(k => [k, 0]))
  const todayByStatus = Object.fromEntries(STATUS_KEYS.map(k => [k, 0]))
  let createdToday = 0

  list.forEach(t => {
    if (byStatus[t.status] !== undefined) byStatus[t.status]++
    if (isToday(t.created)) {
      createdToday++
      if (todayByStatus[t.status] !== undefined) todayByStatus[t.status]++
    }
  })

  // ── Agent-wise breakdown ──
  const agentMap = new Map()
  list.forEach(t => {
    const id = t.assignee || 'unassigned'
    const name = t.assignee ? getAgentName(t.assignee) : 'Unassigned'
    if (!agentMap.has(id)) {
      agentMap.set(id, { name, open: 0, 'in-progress': 0, 'on-hold': 0, resolved: 0, closed: 0, total: 0 })
    }
    const row = agentMap.get(id)
    if (row[t.status] !== undefined) row[t.status]++
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

  return { total, byStatus, todayByStatus, createdToday, agentRows, ticketRows, generatedAt: new Date() }
}

/**
 * Download the report as a multi-sheet Excel workbook.
 */
export async function exportTicketsExcel(tickets, getAgentName) {
  const XLSX = await import('xlsx')
  const d = buildReportData(tickets, getAgentName)

  // ── Summary sheet ──
  const aoa = []
  aoa.push(['Helpdesk Ticket Report'])
  aoa.push(['Generated', d.generatedAt.toLocaleString()])
  aoa.push([])
  aoa.push(['Status Summary (All Tickets)'])
  aoa.push(['Status', 'Count'])
  STATUS_KEYS.forEach(k => aoa.push([STATUS_LABEL[k], d.byStatus[k]]))
  aoa.push(['Total', d.total])
  aoa.push([])
  aoa.push(["Today's Tickets"])
  aoa.push(['Status', 'Count'])
  STATUS_KEYS.forEach(k => aoa.push([STATUS_LABEL[k], d.todayByStatus[k]]))
  aoa.push(['Created Today (total)', d.createdToday])
  aoa.push([])
  aoa.push(['Agent-wise Count'])
  aoa.push(['Agent', 'Open', 'In Progress', 'On Hold', 'Resolved', 'Closed', 'Total'])
  d.agentRows.forEach(r =>
    aoa.push([r.name, r.open, r['in-progress'], r['on-hold'], r.resolved, r.closed, r.total]),
  )

  const wb = XLSX.utils.book_new()
  const ws1 = XLSX.utils.aoa_to_sheet(aoa)
  ws1['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }]
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
 */
export async function exportTicketsPdf(tickets, getAgentName) {
  const { default: jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const d = buildReportData(tickets, getAgentName)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })

  // Title
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text('Helpdesk Ticket Report', 40, 48)
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Generated: ${d.generatedAt.toLocaleString()}`, 40, 64)
  doc.text(`Total tickets: ${d.total}   |   Created today: ${d.createdToday}`, 40, 77)

  // Status summary
  autoTable(doc, {
    startY: 92,
    head: [['Status', 'All Tickets', 'Today']],
    body: STATUS_KEYS.map(k => [STATUS_LABEL[k], d.byStatus[k], d.todayByStatus[k]])
      .concat([['Total', d.total, d.createdToday]]),
    headStyles: { fillColor: ACCENT, textColor: 255 },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
    theme: 'striped',
  })

  // Agent-wise
  let y = doc.lastAutoTable.finalY + 26
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text('Agent-wise Count', 40, y)
  autoTable(doc, {
    startY: y + 8,
    head: [['Agent', 'Open', 'In Prog.', 'On Hold', 'Resolved', 'Closed', 'Total']],
    body: d.agentRows.map(r => [r.name, r.open, r['in-progress'], r['on-hold'], r.resolved, r.closed, r.total]),
    headStyles: { fillColor: ACCENT, textColor: 255 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' } },
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
