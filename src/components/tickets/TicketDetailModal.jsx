import { useState } from 'react'
import { Trash2, Save, MessageSquare } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { PriorityBadge, StatusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useTicketStore } from '../../stores/ticketStore'
import { useAdminStore } from '../../stores/adminStore'
import { useUserStore } from '../../stores/userStore'
import { useUiStore } from '../../stores/uiStore'
import { STATUSES, PRIORITIES, CATEGORIES, categoryLabel, fmtDateTime, timeAgo } from '../../utils/ticketUtils'

const TIMELINE_STYLES = {
  created:  { dot: 'bg-blue-500',    label: 'Opened' },
  assign:   { dot: 'bg-violet-500',  label: 'Assigned' },
  status:   { dot: 'bg-amber-500',   label: 'Updated' },
  comment:  { dot: 'bg-indigo-500',  label: 'Comment' },
  resolved: { dot: 'bg-emerald-500', label: 'Resolved' },
}

export function TicketDetailModal({ ticket, onClose }) {
  const { updateTicket, addTimelineEvent, deleteTicket } = useTicketStore()
  const { agents, getAgentName } = useAdminStore()
  const { currentUser } = useUserStore()
  const { addToast } = useUiStore()

  const [edits, setEdits] = useState({
    status: ticket.status,
    priority: ticket.priority,
    assignee: ticket.assignee || 'unassigned',
  })
  const [comment, setComment] = useState('')

  const assignableAgents = agents.filter(a => a.id !== 'unassigned' || true)

  const handleSave = () => {
    const changes = {}
    if (edits.status   !== ticket.status)   { changes.status   = edits.status;   addTimelineEvent(ticket.id, { type: 'status', text: `Status changed to <strong>${edits.status}</strong>` }) }
    if (edits.priority !== ticket.priority) { changes.priority = edits.priority }
    if (edits.assignee !== ticket.assignee) {
      changes.assignee = edits.assignee
      const name = getAgentName(edits.assignee)
      addTimelineEvent(ticket.id, { type: 'assign', text: `Assigned to <strong>${name}</strong>` })
    }
    if (Object.keys(changes).length > 0) {
      updateTicket(ticket.id, changes)
      addToast('Ticket updated successfully', 'success')
      onClose()
    } else {
      addToast('No changes to save', 'info')
    }
  }

  const handleComment = () => {
    if (!comment.trim()) return
    addTimelineEvent(ticket.id, { type: 'comment', text: comment, author: currentUser?.name || 'Agent' })
    setComment('')
    addToast('Comment added', 'success')
  }

  const handleDelete = () => {
    if (window.confirm('Delete this ticket? This cannot be undone.')) {
      deleteTicket(ticket.id)
      addToast('Ticket deleted', 'error')
      onClose()
    }
  }

  const selectCls = 'glass-input w-full text-sm py-1.5'

  return (
    <Modal isOpen onClose={onClose} title={ticket.id} size="lg">
      <div className="flex flex-col lg:flex-row gap-0">
        {/* Left: details + timeline */}
        <div className="flex-1 p-5 min-w-0">
          <div className="flex items-start gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold t-main mb-2 tracking-tight">{ticket.subject}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <PriorityBadge priority={ticket.priority} />
                <StatusBadge status={ticket.status} />
                <span className="text-xs t-sub font-bold uppercase tracking-wider">{categoryLabel(ticket.category)}</span>
              </div>
            </div>
          </div>

          {/* Edit controls */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div>
              <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Status</label>
              <select className={selectCls} value={edits.status} onChange={e => setEdits(x => ({ ...x, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Priority</label>
              <select className={selectCls} value={edits.priority} onChange={e => setEdits(x => ({ ...x, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Assignee</label>
              <select className={selectCls} value={edits.assignee} onChange={e => setEdits(x => ({ ...x, assignee: e.target.value }))}>
                {assignableAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="mb-5">
            <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-2">Description</div>
            <div className="text-sm t-main leading-relaxed bg-black/5 dark:bg-white/3 rounded-lg p-3 border border-glass">{ticket.description}</div>
          </div>

          {/* Timeline */}
          <div>
            <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-3">Timeline</div>
            <div className="space-y-3">
              {(ticket.timeline || []).map((ev, i) => {
                const style = TIMELINE_STYLES[ev.type] || { dot: 'bg-black/20 dark:bg-white/30', label: 'Event' }
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                      {i < ticket.timeline.length - 1 && <div className="w-px flex-1 bg-black/5 dark:bg-white/6 mt-1 min-h-[12px]" />}
                    </div>
                    <div className="pb-3 flex-1 min-w-0">
                      {ev.author && <div className="text-[10px] font-bold t-sub mb-0.5">{ev.author}</div>}
                      <div className="text-xs t-main leading-relaxed" dangerouslySetInnerHTML={{ __html: ev.text }} />
                      <div className="text-[10px] t-sub opacity-70 mt-0.5">{timeAgo(ev.ts)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Comment box */}
          <div className="mt-4 pt-4 border-t border-glass">
            <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-2">Add Comment</div>
            <div className="flex gap-2">
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="glass-input flex-1 text-sm resize-none"
                rows={2}
                placeholder="Write a comment…"
              />
              <Button variant="ghost" size="sm" onClick={handleComment} className="self-end flex-shrink-0">
                <MessageSquare size={14} /> Post
              </Button>
            </div>
          </div>
        </div>

        {/* Right: metadata sidebar */}
        <div className="lg:w-56 p-5 border-t lg:border-t-0 lg:border-l border-white/6 flex-shrink-0 space-y-4">
          {[
            ['Ticket ID',   ticket.id],
            ['Submitter',   ticket.submitter],
            ['Company',     ticket.company],
            ['Email',       ticket.email],
            ['Category',    categoryLabel(ticket.category)],
            ['Asset',       ticket.asset || '—'],
            ['Created',     fmtDateTime(ticket.created)],
            ['Updated',     fmtDateTime(ticket.updated)],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-0.5">{label}</div>
              <div className="text-xs t-main font-medium">{value || '—'}</div>
            </div>
          ))}

          <div className="pt-4 border-t border-glass space-y-2">
            <Button variant="primary" size="sm" className="w-full" onClick={handleSave}>
              <Save size={13} /> Save Changes
            </Button>
            <Button variant="danger" size="sm" className="w-full" onClick={handleDelete}>
              <Trash2 size={13} /> Delete Ticket
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
