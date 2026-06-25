import { useState } from 'react'
import { X, Mail, Loader2, ServerCog, ShieldCheck } from 'lucide-react'
import { useEmailStore } from '../../stores/emailStore'
import type { EmailAccountCreate, EmailProtocol } from '../../types/email'

// Known provider presets — auto-fill IMAP/SMTP hosts so the user only needs
// their address + app password.
const PRESETS: Record<string, { label: string; imap_host: string; imap_port: number; smtp_host: string; smtp_port: number; hint?: string }> = {
  gmail:     { label: 'Gmail / Google Workspace', imap_host: 'imap.gmail.com',       imap_port: 993, smtp_host: 'smtp.gmail.com',        smtp_port: 587, hint: 'Use a Google "App Password" (not your normal password) — requires 2-step verification.' },
  office365: { label: 'Microsoft 365 / Outlook',  imap_host: 'outlook.office365.com', imap_port: 993, smtp_host: 'smtp.office365.com',    smtp_port: 587, hint: 'If basic auth is blocked by your tenant, use the Microsoft Graph option instead.' },
  custom:    { label: 'Custom (other provider)',  imap_host: '', imap_port: 993, smtp_host: '', smtp_port: 587 },
}

interface Props {
  onClose: () => void
  onSaved?: () => void
}

export function AccountSetupModal({ onClose, onSaved }: Props) {
  const createAccount = useEmailStore((s) => s.createAccount)

  const [protocol, setProtocol] = useState<EmailProtocol>('imap_smtp')
  const [preset, setPreset] = useState<string>('gmail')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const [f, setF] = useState<EmailAccountCreate>({
    name: '',
    email_address: '',
    display_name: '',
    protocol: 'imap_smtp',
    imap_host: PRESETS.gmail.imap_host,
    imap_port: PRESETS.gmail.imap_port,
    imap_use_ssl: true,
    imap_username: '',
    imap_password: '',
    smtp_host: PRESETS.gmail.smtp_host,
    smtp_port: PRESETS.gmail.smtp_port,
    smtp_use_tls: true,
    smtp_username: '',
    smtp_password: '',
    graph_tenant_id: '',
    graph_client_id: '',
    graph_client_secret: '',
    graph_user_id: '',
    auto_create_tickets: true,
    default_ticket_priority: 'medium',
  })

  const set = (k: keyof EmailAccountCreate, v: any) => setF((p) => ({ ...p, [k]: v }))

  const applyPreset = (key: string) => {
    setPreset(key)
    const p = PRESETS[key]
    if (p) setF((prev) => ({ ...prev, imap_host: p.imap_host, imap_port: p.imap_port, smtp_host: p.smtp_host, smtp_port: p.smtp_port }))
  }

  const onProtocol = (p: EmailProtocol) => { setProtocol(p); set('protocol', p) }

  const handleSave = async () => {
    setErr('')
    if (!f.name.trim() || !f.email_address.trim()) { setErr('Account name and email address are required.'); return }
    if (protocol === 'imap_smtp' && (!f.imap_host || !f.imap_password)) { setErr('IMAP host and password are required.'); return }
    if (protocol === 'graph_api' && (!f.graph_tenant_id || !f.graph_client_id || !f.graph_client_secret)) { setErr('Tenant ID, Client ID and Client Secret are required for Microsoft Graph.'); return }

    const payload: EmailAccountCreate = {
      name: f.name.trim(),
      email_address: f.email_address.trim(),
      display_name: f.display_name?.trim() || f.name.trim(),
      protocol,
      auto_create_tickets: f.auto_create_tickets,
      default_ticket_priority: f.default_ticket_priority,
    }
    if (protocol === 'imap_smtp') {
      Object.assign(payload, {
        imap_host: f.imap_host, imap_port: Number(f.imap_port) || 993, imap_use_ssl: f.imap_use_ssl,
        imap_username: (f.imap_username || f.email_address).trim(), imap_password: f.imap_password,
        smtp_host: f.smtp_host, smtp_port: Number(f.smtp_port) || 587, smtp_use_tls: f.smtp_use_tls,
        smtp_username: (f.smtp_username || f.email_address).trim(), smtp_password: f.smtp_password || f.imap_password,
      })
    } else {
      Object.assign(payload, {
        graph_tenant_id: f.graph_tenant_id, graph_client_id: f.graph_client_id,
        graph_client_secret: f.graph_client_secret, graph_user_id: (f.graph_user_id || f.email_address).trim(),
      })
    }

    setSaving(true)
    try {
      await createAccount(payload)
      onSaved?.()
      onClose()
    } catch (e: any) {
      setErr(e?.message || 'Failed to save account. Check the details and try again.')
    } finally {
      setSaving(false)
    }
  }

  const label = 'block text-[10px] font-bold t-sub uppercase tracking-wider mb-1'
  const presetHint = PRESETS[preset]?.hint

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="glass-card w-full max-w-lg rounded-2xl border border-glass max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center"><Mail size={15} className="text-indigo-500" /></div>
            <div>
              <div className="text-sm font-bold t-main">Connect Email Inbox</div>
              <div className="text-[11px] t-muted">Incoming mail will appear here and can auto-create tickets</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg t-sub hover:t-main hover:bg-black/5 dark:hover:bg-white/10 transition-all"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Protocol toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onProtocol('imap_smtp')} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${protocol === 'imap_smtp' ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-600 dark:text-indigo-400' : 'border-glass t-muted hover:t-main'}`}>
              <ServerCog size={16} /><div><div className="text-xs font-bold">IMAP / SMTP</div><div className="text-[10px] opacity-70">Gmail, Outlook, any host</div></div>
            </button>
            <button type="button" onClick={() => onProtocol('graph_api')} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${protocol === 'graph_api' ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-600 dark:text-indigo-400' : 'border-glass t-muted hover:t-main'}`}>
              <ShieldCheck size={16} /><div><div className="text-xs font-bold">Microsoft Graph</div><div className="text-[10px] opacity-70">Microsoft 365 (modern auth)</div></div>
            </button>
          </div>

          {/* Common fields */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Account Name *</label><input className="glass-input w-full text-sm" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Support Inbox" /></div>
            <div><label className={label}>Email Address *</label><input className="glass-input w-full text-sm" value={f.email_address} onChange={(e) => set('email_address', e.target.value)} placeholder="helpdesk@company.com" /></div>
          </div>

          {protocol === 'imap_smtp' ? (
            <>
              <div>
                <label className={label}>Provider</label>
                <select className="glass-input w-full text-sm" value={preset} onChange={(e) => applyPreset(e.target.value)}>
                  {Object.entries(PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                {presetHint && <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">{presetHint}</p>}
              </div>

              <div className="rounded-xl border border-glass p-3 space-y-3 bg-black/3 dark:bg-white/3">
                <div className="text-[10px] font-bold t-sub uppercase tracking-wider">Incoming (IMAP)</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2"><label className={label}>Host</label><input className="glass-input w-full text-sm" value={f.imap_host} onChange={(e) => set('imap_host', e.target.value)} placeholder="imap.gmail.com" /></div>
                  <div><label className={label}>Port</label><input className="glass-input w-full text-sm" value={f.imap_port} onChange={(e) => set('imap_port', e.target.value)} placeholder="993" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={label}>Username</label><input className="glass-input w-full text-sm" value={f.imap_username} onChange={(e) => set('imap_username', e.target.value)} placeholder="(usually your email)" /></div>
                  <div><label className={label}>Password / App Password *</label><input type="password" className="glass-input w-full text-sm" value={f.imap_password} onChange={(e) => set('imap_password', e.target.value)} placeholder="••••••••" /></div>
                </div>
                <label className="flex items-center gap-2 text-xs t-muted cursor-pointer"><input type="checkbox" checked={f.imap_use_ssl} onChange={(e) => set('imap_use_ssl', e.target.checked)} className="accent-indigo-500" /> Use SSL</label>
              </div>

              <div className="rounded-xl border border-glass p-3 space-y-3 bg-black/3 dark:bg-white/3">
                <div className="text-[10px] font-bold t-sub uppercase tracking-wider">Outgoing (SMTP) — for replies</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2"><label className={label}>Host</label><input className="glass-input w-full text-sm" value={f.smtp_host} onChange={(e) => set('smtp_host', e.target.value)} placeholder="smtp.gmail.com" /></div>
                  <div><label className={label}>Port</label><input className="glass-input w-full text-sm" value={f.smtp_port} onChange={(e) => set('smtp_port', e.target.value)} placeholder="587" /></div>
                </div>
                <div><label className={label}>Password (blank = same as IMAP)</label><input type="password" className="glass-input w-full text-sm" value={f.smtp_password} onChange={(e) => set('smtp_password', e.target.value)} placeholder="••••••••" /></div>
                <label className="flex items-center gap-2 text-xs t-muted cursor-pointer"><input type="checkbox" checked={f.smtp_use_tls} onChange={(e) => set('smtp_use_tls', e.target.checked)} className="accent-indigo-500" /> Use TLS / STARTTLS</label>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-glass p-3 space-y-3 bg-black/3 dark:bg-white/3">
              <div className="text-[10px] font-bold t-sub uppercase tracking-wider">Microsoft Graph (Azure App Registration)</div>
              <div><label className={label}>Tenant ID *</label><input className="glass-input w-full text-sm" value={f.graph_tenant_id} onChange={(e) => set('graph_tenant_id', e.target.value)} placeholder="xxxxxxxx-xxxx-…" /></div>
              <div><label className={label}>Client (Application) ID *</label><input className="glass-input w-full text-sm" value={f.graph_client_id} onChange={(e) => set('graph_client_id', e.target.value)} placeholder="xxxxxxxx-xxxx-…" /></div>
              <div><label className={label}>Client Secret *</label><input type="password" className="glass-input w-full text-sm" value={f.graph_client_secret} onChange={(e) => set('graph_client_secret', e.target.value)} placeholder="••••••••" /></div>
              <div><label className={label}>Mailbox User ID (blank = email above)</label><input className="glass-input w-full text-sm" value={f.graph_user_id} onChange={(e) => set('graph_user_id', e.target.value)} placeholder="helpdesk@company.com" /></div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">App needs <strong>Mail.ReadWrite</strong> + <strong>Mail.Send</strong> application permissions with admin consent.</p>
            </div>
          )}

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-xs t-muted cursor-pointer"><input type="checkbox" checked={f.auto_create_tickets} onChange={(e) => set('auto_create_tickets', e.target.checked)} className="accent-indigo-500" /> Auto-create tickets from new mail</label>
            <div><label className={label}>Default Priority</label><select className="glass-input w-full text-sm" value={f.default_ticket_priority} onChange={(e) => set('default_ticket_priority', e.target.value)}>{['low', 'medium', 'high', 'critical'].map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}</select></div>
          </div>

          {err && <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/25 rounded-lg px-3 py-2">{err}</div>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--c-border)' }}>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-medium t-muted hover:t-main border border-glass transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 flex items-center gap-1.5">
            {saving ? <><Loader2 size={13} className="animate-spin" /> Connecting…</> : 'Connect Inbox'}
          </button>
        </div>
      </div>
    </div>
  )
}
