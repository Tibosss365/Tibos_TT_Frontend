import { useEffect, useState } from 'react'
import { Check, Edit2, Loader2, Plus, Star, Trash2, X } from 'lucide-react'
import { useEmailStore } from '../../stores/emailStore'
import { RichTextEditor } from './RichTextEditor'
import type { EmailSignature } from '../../types/email'

interface Props {
  selectedId?: string
  onSelect: (sig: EmailSignature | null) => void
  compact?: boolean
}

export function SignatureManager({ selectedId, onSelect, compact = false }: Props) {
  const { signatures, signaturesLoading, fetchSignatures, createSignature, updateSignature, deleteSignature } = useEmailStore()
  const [editing, setEditing] = useState<EmailSignature | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', body_html: '', is_default: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSignatures() }, [])

  const resetForm = () => { setForm({ name: '', body_html: '', is_default: false }); setCreating(false); setEditing(null) }

  const handleSave = async () => {
    if (!form.name || !form.body_html) return
    setSaving(true)
    try {
      if (editing) {
        await updateSignature(editing.id, form)
      } else {
        await createSignature(form)
      }
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (sig: EmailSignature) => {
    setEditing(sig)
    setCreating(false)
    setForm({ name: sig.name, body_html: sig.body_html, is_default: sig.is_default })
  }

  if (compact) {
    return (
      <select
        className="glass-input px-3 py-1.5 rounded-lg text-sm t-main"
        value={selectedId || ''}
        onChange={(e) => {
          const sig = signatures.find((s) => s.id === e.target.value)
          onSelect(sig || null)
        }}
      >
        <option value="">No signature</option>
        {signatures.map((s) => (
          <option key={s.id} value={s.id}>{s.name}{s.is_default ? ' (default)' : ''}</option>
        ))}
      </select>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold t-main">Signatures</p>
        <button
          onClick={() => { setCreating(true); setEditing(null); setForm({ name: '', body_html: '', is_default: false }) }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs glass-card t-muted hover:t-main transition-all"
        >
          <Plus size={12} /> New
        </button>
      </div>

      {/* List */}
      {signaturesLoading ? (
        <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin t-muted" /></div>
      ) : (
        <div className="space-y-2">
          {signatures.map((sig) => (
            <div
              key={sig.id}
              className={`glass-card rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                selectedId === sig.id ? 'border border-indigo-500/40' : 'hover:bg-white/5'
              }`}
              onClick={() => onSelect(selectedId === sig.id ? null : sig)}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium t-main">{sig.name}</p>
                  {sig.is_default && <Star size={11} className="text-amber-400 fill-amber-400" />}
                  {selectedId === sig.id && <Check size={13} className="text-indigo-400" />}
                </div>
                <div
                  className="text-xs t-muted mt-1 line-clamp-1"
                  dangerouslySetInnerHTML={{ __html: sig.body_html }}
                />
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); startEdit(sig) }}
                  className="p-1.5 rounded-lg t-muted hover:t-main transition-all"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSignature(sig.id) }}
                  className="p-1.5 rounded-lg t-muted hover:text-rose-400 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit form */}
      {(creating || editing) && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold t-main">{editing ? 'Edit Signature' : 'New Signature'}</p>
            <button onClick={resetForm} className="t-muted hover:t-main"><X size={14} /></button>
          </div>
          <input
            className="glass-input w-full px-3 py-2 rounded-lg text-sm t-main"
            placeholder="Signature name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <RichTextEditor
            value={form.body_html}
            onChange={(html) => setForm((f) => ({ ...f, body_html: html }))}
            placeholder="Signature content…"
            minHeight={100}
          />
          <label className="flex items-center gap-2 text-xs t-muted cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
            />
            Set as default
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-3 py-1.5 rounded-lg text-xs t-muted hover:t-main transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.body_html}
              className="px-3 py-1.5 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
