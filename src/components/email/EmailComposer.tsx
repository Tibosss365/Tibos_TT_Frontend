import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, FileText, Loader2, Minus, Paperclip, Send, Signature, X } from 'lucide-react'
import { useEmailStore } from '../../stores/emailStore'
import { RichTextEditor } from './RichTextEditor'
import { TemplateSelector } from './TemplateSelector'
import { SignatureManager } from './SignatureManager'
import type { EmailMessage, EmailThread, Recipient } from '../../types/email'

interface Props {
  thread?: EmailThread
  replyTo?: EmailMessage
  onClose: () => void
  defaultAccountId?: string
}

function RecipientInput({ label, recipients, onChange }: {
  label: string
  recipients: Recipient[]
  onChange: (v: Recipient[]) => void
}) {
  const [input, setInput] = useState('')

  const addRecipient = (value: string) => {
    const trimmed = value.trim().replace(/,$/, '')
    if (!trimmed) return
    const match = trimmed.match(/^(.*?)\s*<([^>]+)>$/)
    const email = match ? match[2] : trimmed
    const name = match ? match[1].trim() : undefined
    if (!email.includes('@')) return
    onChange([...recipients, { email, name }])
    setInput('')
  }

  return (
    <div className="flex items-start gap-2">
      <span className="text-xs t-muted pt-2 w-8 flex-shrink-0">{label}</span>
      <div className="flex-1 flex flex-wrap gap-1 glass-input rounded-lg px-2 py-1.5 min-h-[34px] cursor-text">
        {recipients.map((r, i) => (
          <span key={i} className="flex items-center gap-1 text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
            {r.name ? `${r.name} <${r.email}>` : r.email}
            <button onClick={() => onChange(recipients.filter((_, j) => j !== i))} className="hover:text-white">
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[120px] bg-transparent text-sm t-main outline-none py-0.5"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
              e.preventDefault()
              addRecipient(input)
            }
            if (e.key === 'Backspace' && !input && recipients.length) {
              onChange(recipients.slice(0, -1))
            }
          }}
          onBlur={() => addRecipient(input)}
          placeholder={recipients.length === 0 ? 'email@example.com' : ''}
        />
      </div>
    </div>
  )
}

export function EmailComposer({ thread, replyTo, onClose, defaultAccountId }: Props) {
  const { accounts, signatures, sendMessage, fetchSignatures } = useEmailStore()
  const [minimized, setMinimized] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [showSignature, setShowSignature] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [sending, setSending] = useState(false)

  const defaultSig = signatures.find((s) => s.is_default)

  const [form, setForm] = useState({
    accountId: defaultAccountId || accounts[0]?.id || '',
    to: replyTo ? [{ email: replyTo.from_email, name: replyTo.from_name }] as Recipient[] : [] as Recipient[],
    cc: replyTo ? replyTo.cc_recipients : [] as Recipient[],
    bcc: [] as Recipient[],
    subject: replyTo ? `Re: ${replyTo.subject || thread?.subject || ''}` : (thread?.subject || ''),
    bodyHtml: '',
    messageType: (replyTo ? 'reply' : 'reply') as 'reply' | 'internal_note' | 'forward',
    signatureId: defaultSig?.id || '',
  })

  useEffect(() => { fetchSignatures() }, [])

  // Append default signature on mount
  useEffect(() => {
    if (defaultSig && !form.bodyHtml) {
      setForm((f) => ({
        ...f,
        signatureId: defaultSig.id,
        bodyHtml: `<p><br></p><div class="email-signature">${defaultSig.body_html}</div>`,
      }))
    }
  }, [defaultSig?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const editorRef = useRef<HTMLDivElement>(null)

  const insertAtCursor = (text: string) => {
    setForm((f) => ({
      ...f,
      bodyHtml: `<p>${text.replace(/\n/g, '<br>')}</p>${f.bodyHtml}`,
    }))
  }

  const handleSend = async () => {
    if (!form.accountId || !form.to.length || !form.subject) return
    setSending(true)
    try {
      await sendMessage({
        thread_id: thread?.id,
        account_id: form.accountId,
        to: form.to,
        cc: form.cc,
        bcc: form.bcc,
        subject: form.subject,
        body_html: form.bodyHtml,
        message_type: form.messageType,
        in_reply_to_message_id: replyTo?.id,
        signature_id: form.signatureId || undefined,
      })
      onClose()
    } finally {
      setSending(false)
    }
  }

  const canSend = !!form.accountId && form.to.length > 0 && !!form.subject && !sending

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 glass-card rounded-2xl shadow-glass-lg flex flex-col transition-all duration-200 ${
        minimized ? 'w-72 h-12' : 'w-[560px] h-[540px]'
      }`}
      style={{ border: '1px solid var(--c-border)' }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 flex-shrink-0 cursor-pointer select-none"
        style={{ borderBottom: minimized ? 'none' : '1px solid var(--c-border)' }}
        onClick={() => setMinimized((v) => !v)}
      >
        <p className="text-sm font-semibold t-main truncate">
          {replyTo ? `Re: ${form.subject}` : 'New Message'}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setMinimized((v) => !v) }}
            className="p-1 rounded t-muted hover:t-main transition-colors"
          >
            {minimized ? <ChevronUp size={14} /> : <Minus size={14} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="p-1 rounded t-muted hover:text-rose-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Form fields */}
          <div className="px-4 py-2 space-y-1.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
            {/* Account selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs t-muted w-8">From</span>
              <select
                className="flex-1 glass-input px-2 py-1 rounded-lg text-xs t-main"
                value={form.accountId}
                onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.display_name || a.name} &lt;{a.email_address}&gt;</option>
                ))}
              </select>
            </div>

            {/* To */}
            <RecipientInput
              label="To"
              recipients={form.to}
              onChange={(v) => setForm((f) => ({ ...f, to: v }))}
            />

            {/* CC / BCC toggles */}
            <div className="flex gap-3 pl-10">
              {!showCc && (
                <button onClick={() => setShowCc(true)} className="text-xs t-muted hover:t-main">+ CC</button>
              )}
              {!showBcc && (
                <button onClick={() => setShowBcc(true)} className="text-xs t-muted hover:t-main">+ BCC</button>
              )}
              <button
                onClick={() => setForm((f) => ({ ...f, messageType: f.messageType === 'internal_note' ? 'reply' : 'internal_note' }))}
                className={`text-xs transition-all ${form.messageType === 'internal_note' ? 'text-amber-400' : 't-muted hover:text-amber-400'}`}
              >
                {form.messageType === 'internal_note' ? '★ Internal Note' : '+ Internal Note'}
              </button>
            </div>

            {showCc && (
              <RecipientInput label="CC" recipients={form.cc} onChange={(v) => setForm((f) => ({ ...f, cc: v }))} />
            )}
            {showBcc && (
              <RecipientInput label="BCC" recipients={form.bcc} onChange={(v) => setForm((f) => ({ ...f, bcc: v }))} />
            )}

            {/* Subject */}
            <div className="flex items-center gap-2">
              <span className="text-xs t-muted w-8">Subj</span>
              <input
                className="flex-1 glass-input px-2 py-1 rounded-lg text-sm t-main"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Subject"
              />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 px-2 pt-1">
            {showTemplate ? (
              <TemplateSelector
                onSelect={(_, rendered) => {
                  setForm((f) => ({ ...f, subject: rendered.subject || f.subject, bodyHtml: rendered.body_html }))
                  setShowTemplate(false)
                }}
                onClose={() => setShowTemplate(false)}
              />
            ) : (
              <RichTextEditor
                value={form.bodyHtml}
                onChange={(html) => setForm((f) => ({ ...f, bodyHtml: html }))}
                placeholder="Write your message…"
                minHeight={160}
                className="h-full"
              />
            )}
          </div>

          {/* Footer actions */}
          <div
            className="flex items-center justify-between gap-2 px-4 py-2 flex-shrink-0"
            style={{ borderTop: '1px solid var(--c-border)' }}
          >
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowTemplate((v) => !v)}
                className={`p-2 rounded-lg text-xs transition-all ${showTemplate ? 'text-indigo-400 bg-indigo-400/10' : 't-muted hover:t-main'}`}
                title="Templates"
              >
                <FileText size={14} />
              </button>
              <button
                onClick={() => setShowSignature((v) => !v)}
                className={`p-2 rounded-lg text-xs transition-all ${showSignature ? 'text-indigo-400 bg-indigo-400/10' : 't-muted hover:t-main'}`}
                title="Signature"
              >
                <Signature size={14} />
              </button>
            </div>

            {showSignature && (
              <div className="absolute bottom-12 right-4 w-72 glass-card rounded-xl p-3 shadow-glass-lg" style={{ border: '1px solid var(--c-border)' }}>
                <SignatureManager
                  compact
                  selectedId={form.signatureId}
                  onSelect={(sig) => {
                    setForm((f) => ({ ...f, signatureId: sig?.id || '' }))
                    setShowSignature(false)
                  }}
                />
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={!canSend}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-all"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {form.messageType === 'internal_note' ? 'Add Note' : 'Send'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
