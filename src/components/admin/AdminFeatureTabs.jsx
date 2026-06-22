/**
 * AdminFeatureTabs — renders the 9 new feature management tabs for the Admin page.
 *
 * Usage: <AdminFeatureTabs activeTab="customFields" />
 *
 * Exported tabs (string IDs used in Admin.jsx):
 *   customFields | ticketTemplates | automation | webhooks | notificationChannels
 *   assets | escalation | recurring | branding
 */
import { useEffect, useState } from 'react'
import { useFeatureStore } from '../../stores/featureStore'

// ── Shared helpers ─────────────────────────────────────────────────────────────

function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 mb-6">{desc}</p>
      {action}
    </div>
  )
}

function AddButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
    >
      + {label}
    </button>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

// ── Custom Fields Tab ──────────────────────────────────────────────────────────
function CustomFieldsTab() {
  const { customFields, customFieldsLoading, fetchCustomFields, createCustomField, updateCustomField, deleteCustomField } = useFeatureStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', field_type: 'text', options: '', is_required: false, display_order: 0 })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchCustomFields() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await createCustomField({
        ...form,
        options: form.options ? form.options.split(',').map(s => s.trim()).filter(Boolean) : [],
      })
      setShowForm(false)
      setForm({ name: '', field_type: 'text', options: '', is_required: false, display_order: 0 })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Custom Fields</h3>
          <p className="text-sm text-gray-500">Add extra fields to tickets (text, dropdown, date, etc.)</p>
        </div>
        <AddButton label="Add Field" onClick={() => setShowForm(true)} />
      </div>

      {showForm && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 space-y-4">
          <h4 className="font-semibold text-gray-800">New Custom Field</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Field Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
              <select value={form.field_type} onChange={e => setForm(f => ({ ...f, field_type: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                {['text','number','date','dropdown','checkbox','url'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {form.field_type === 'dropdown' && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Options (comma-separated)</label>
              <input value={form.options} onChange={e => setForm(f => ({ ...f, options: e.target.value }))}
                placeholder="Option A, Option B, Option C"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="cf-required" checked={form.is_required}
              onChange={e => setForm(f => ({ ...f, is_required: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 rounded" />
            <label htmlFor="cf-required" className="text-sm text-gray-700">Required field</label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {customFieldsLoading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
      ) : customFields.length === 0 ? (
        <EmptyState icon="📋" title="No custom fields yet" desc="Add fields to capture extra information on tickets." />
      ) : (
        <div className="space-y-2">
          {customFields.map(f => (
            <div key={f.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{f.field_type}</span>
                <span className="text-sm font-medium text-gray-800">{f.name}</span>
                {f.is_required && <span className="text-xs text-red-500">required</span>}
              </div>
              <button onClick={() => deleteCustomField(f.id)}
                className="text-red-400 hover:text-red-600 text-sm">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Automation Rules Tab ───────────────────────────────────────────────────────
function AutomationTab() {
  const { automationRules, automationLoading, fetchAutomationRules, createAutomationRule, deleteAutomationRule, toggleAutomationRule } = useFeatureStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', trigger: 'ticket_created', is_active: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAutomationRules() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await createAutomationRule({ ...form, conditions: [], actions: [] })
      setShowForm(false)
      setForm({ name: '', trigger: 'ticket_created', is_active: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Automation Rules</h3>
          <p className="text-sm text-gray-500">Auto-assign, change priority, add tags based on conditions.</p>
        </div>
        <AddButton label="Add Rule" onClick={() => setShowForm(true)} />
      </div>

      {showForm && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 space-y-4">
          <h4 className="font-semibold text-gray-800">New Automation Rule</h4>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Rule Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Trigger</label>
            <select value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
              {['ticket_created','ticket_updated','comment_added','status_changed','sla_breach'].map(t => (
                <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500">Conditions and actions can be configured after saving.</p>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {automationLoading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
      ) : automationRules.length === 0 ? (
        <EmptyState icon="⚡" title="No automation rules" desc="Create rules to automate repetitive actions." />
      ) : (
        <div className="space-y-2">
          {automationRules.map(r => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <Toggle value={r.is_active} onChange={() => toggleAutomationRule(r.id)} />
                <div>
                  <span className="text-sm font-medium text-gray-800">{r.name}</span>
                  <span className="ml-2 text-xs text-gray-400">on {r.trigger.replace(/_/g,' ')}</span>
                </div>
              </div>
              <button onClick={() => deleteAutomationRule(r.id)}
                className="text-red-400 hover:text-red-600 text-sm">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Webhooks Tab ───────────────────────────────────────────────────────────────
function WebhooksTab() {
  const { webhooks, webhooksLoading, fetchWebhooks, createWebhook, deleteWebhook } = useFeatureStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', secret: '', events: [] })
  const [saving, setSaving] = useState(false)

  const EVENT_OPTIONS = ['ticket_created','ticket_updated','ticket_resolved','ticket_deleted','comment_added']

  useEffect(() => { fetchWebhooks() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await createWebhook(form)
      setShowForm(false)
      setForm({ name: '', url: '', secret: '', events: [] })
    } finally {
      setSaving(false)
    }
  }

  const toggleEvent = (ev) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Webhooks</h3>
          <p className="text-sm text-gray-500">Send real-time HTTP events to external services.</p>
        </div>
        <AddButton label="Add Webhook" onClick={() => setShowForm(true)} />
      </div>

      {showForm && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 space-y-4">
          <h4 className="font-semibold text-gray-800">New Webhook</h4>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            placeholder="https://your-endpoint.com/hook"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          <input value={form.secret} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
            placeholder="Signing secret (optional)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Subscribe to events:</p>
            <div className="flex flex-wrap gap-2">
              {EVENT_OPTIONS.map(ev => (
                <label key={ev} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors
                  ${form.events.includes(ev) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 text-gray-600 hover:border-indigo-400'}`}>
                  <input type="checkbox" className="hidden" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} />
                  {ev.replace(/_/g,' ')}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name || !form.url}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold">
              Cancel
            </button>
          </div>
        </div>
      )}

      {webhooksLoading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
      ) : webhooks.length === 0 ? (
        <EmptyState icon="🔗" title="No webhooks configured" desc="Connect external services via HTTP webhooks." />
      ) : (
        <div className="space-y-2">
          {webhooks.map(w => (
            <div key={w.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div>
                <span className="text-sm font-medium text-gray-800">{w.name}</span>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{w.url}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${w.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {w.is_active ? 'Active' : 'Paused'}
                </span>
                <button onClick={() => deleteWebhook(w.id)} className="text-red-400 hover:text-red-600 text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Notification Channels Tab ──────────────────────────────────────────────────
function NotificationChannelsTab() {
  const { notificationChannels, notificationChannelsLoading, fetchNotificationChannels, createNotificationChannel, deleteNotificationChannel } = useFeatureStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', channel_type: 'slack', webhook_url: '', events: [] })
  const [saving, setSaving] = useState(false)
  const EVENT_OPTIONS = ['ticket_created','ticket_updated','ticket_resolved','sla_breach']

  useEffect(() => { fetchNotificationChannels() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await createNotificationChannel(form)
      setShowForm(false)
      setForm({ name: '', channel_type: 'slack', webhook_url: '', events: [] })
    } finally {
      setSaving(false)
    }
  }

  const toggleEvent = (ev) => setForm(f => ({
    ...f, events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev]
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Notification Channels</h3>
          <p className="text-sm text-gray-500">Send alerts to Slack, Teams, Discord, or custom webhooks.</p>
        </div>
        <AddButton label="Add Channel" onClick={() => setShowForm(true)} />
      </div>

      {showForm && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 space-y-4">
          <h4 className="font-semibold text-gray-800">New Notification Channel</h4>
          <div className="grid grid-cols-2 gap-4">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Channel name"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
            <select value={form.channel_type} onChange={e => setForm(f => ({ ...f, channel_type: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
              {['slack','teams','discord','generic'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <input value={form.webhook_url} onChange={e => setForm(f => ({ ...f, webhook_url: e.target.value }))}
            placeholder="Webhook URL"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          <div className="flex flex-wrap gap-2">
            {EVENT_OPTIONS.map(ev => (
              <label key={ev} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors
                ${form.events.includes(ev) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 text-gray-600'}`}>
                <input type="checkbox" className="hidden" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} />
                {ev.replace(/_/g,' ')}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name || !form.webhook_url}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold">Cancel</button>
          </div>
        </div>
      )}

      {notificationChannelsLoading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
      ) : notificationChannels.length === 0 ? (
        <EmptyState icon="🔔" title="No notification channels" desc="Set up Slack, Teams, or Discord alerts." />
      ) : (
        <div className="space-y-2">
          {notificationChannels.map(ch => (
            <div key={ch.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">{ch.channel_type}</span>
                <span className="text-sm font-medium text-gray-800">{ch.name}</span>
              </div>
              <button onClick={() => deleteNotificationChannel(ch.id)} className="text-red-400 hover:text-red-600 text-sm">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Assets Tab ─────────────────────────────────────────────────────────────────
const EMPTY_ASSET_FORM = {
  name: '', type: 'laptop', asset_tag: '', serial_number: '', status: 'active',
  assigned_to_name: '', assigned_to_email: '', employee_code: '',
}

function AssetsTab() {
  const { assets, assetsLoading, fetchAssets, createAsset, updateAsset, deleteAsset, fetchAssetHistory } = useFeatureStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_ASSET_FORM })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [historyFor, setHistoryFor] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => { fetchAssets() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await createAsset(form)
      setShowForm(false)
      setForm({ ...EMPTY_ASSET_FORM })
    } finally {
      setSaving(false)
    }
  }

  const startAssign = (a) => {
    setHistoryFor(null)
    setEditingId(a.id)
    setEditForm({
      assigned_to_name: a.assigned_to_name || '',
      assigned_to_email: a.assigned_to_email || '',
      employee_code: a.employee_code || '',
      status: a.status,
    })
  }

  const handleAssignSave = async () => {
    setSaving(true)
    try {
      await updateAsset(editingId, editForm)
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  const showHistory = async (a) => {
    setEditingId(null)
    if (historyFor === a.id) { setHistoryFor(null); return }
    setHistoryFor(a.id)
    setHistoryLoading(true)
    try {
      setHistory(await fetchAssetHistory(a.id) || [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const STATUS_COLOR = { active: 'bg-green-100 text-green-700', retired: 'bg-gray-100 text-gray-500', in_repair: 'bg-yellow-100 text-yellow-700', lost: 'bg-red-100 text-red-600' }
  const ACTION_COLOR = { assigned: 'bg-green-100 text-green-700', reassigned: 'bg-indigo-100 text-indigo-700', unassigned: 'bg-gray-100 text-gray-500' }
  const inputCls = "rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Assets</h3>
          <p className="text-sm text-gray-500">Track laptops, phones, servers, and other hardware — and who they're assigned to.</p>
        </div>
        <AddButton label="Add Asset" onClick={() => setShowForm(true)} />
      </div>

      {showForm && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 space-y-4">
          <h4 className="font-semibold text-gray-800">New Asset</h4>
          <div className="grid grid-cols-2 gap-4">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Asset name *" className={inputCls} />
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className={inputCls}>
              {['laptop','desktop','monitor','printer','phone','server','network','other'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={form.asset_tag} onChange={e => setForm(f => ({ ...f, asset_tag: e.target.value }))}
              placeholder="Asset tag (e.g. TIB-001)" className={inputCls} />
            <input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
              placeholder="Serial number" className={inputCls} />
          </div>
          <p className="text-xs font-medium text-gray-500 pt-1">Assigned to (optional)</p>
          <div className="grid grid-cols-3 gap-4">
            <input value={form.assigned_to_name} onChange={e => setForm(f => ({ ...f, assigned_to_name: e.target.value }))}
              placeholder="User name (e.g. Ravi Kumar)" className={inputCls} />
            <input value={form.assigned_to_email} onChange={e => setForm(f => ({ ...f, assigned_to_email: e.target.value }))}
              placeholder="User email (e.g. ravi@tibos.in)" className={inputCls} />
            <input value={form.employee_code} onChange={e => setForm(f => ({ ...f, employee_code: e.target.value }))}
              placeholder="Employee code (e.g. EMP-042)" className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold">Cancel</button>
          </div>
        </div>
      )}

      {assetsLoading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
      ) : assets.length === 0 ? (
        <EmptyState icon="💻" title="No assets yet" desc="Start tracking your hardware inventory." />
      ) : (
        <div className="space-y-2">
          {assets.map(a => (
            <div key={a.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-800">{a.name}</span>
                  {a.asset_tag && <span className="ml-2 text-xs font-mono text-gray-400">{a.asset_tag}</span>}
                  <span className="ml-2 text-xs text-gray-400">{a.type}</span>
                  {a.assigned_to_name || a.assigned_to_email ? (
                    <div className="text-xs text-gray-500 mt-0.5">
                      Assigned to <span className="font-medium text-gray-700">{a.assigned_to_name || a.assigned_to_email}</span>
                      {a.assigned_to_email && a.assigned_to_name && <span className="text-gray-400"> · {a.assigned_to_email}</span>}
                      {a.employee_code && <span className="ml-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{a.employee_code}</span>}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 mt-0.5 italic">Unassigned</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[a.status] || 'bg-gray-100 text-gray-500'}`}>{a.status}</span>
                  <button onClick={() => startAssign(a)} className="text-indigo-500 hover:text-indigo-700 text-sm">
                    {a.assigned_to_name || a.assigned_to_email ? 'Reassign' : 'Assign'}
                  </button>
                  <button onClick={() => showHistory(a)} className="text-gray-500 hover:text-gray-700 text-sm">History</button>
                  <button onClick={() => deleteAsset(a.id)} className="text-red-400 hover:text-red-600 text-sm">Delete</button>
                </div>
              </div>

              {editingId === a.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <input value={editForm.assigned_to_name} onChange={e => setEditForm(f => ({ ...f, assigned_to_name: e.target.value }))}
                      placeholder="User name" className={inputCls} />
                    <input value={editForm.assigned_to_email} onChange={e => setEditForm(f => ({ ...f, assigned_to_email: e.target.value }))}
                      placeholder="User email" className={inputCls} />
                    <input value={editForm.employee_code} onChange={e => setEditForm(f => ({ ...f, employee_code: e.target.value }))}
                      placeholder="Employee code" className={inputCls} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleAssignSave} disabled={saving}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save assignment'}
                    </button>
                    <button onClick={() => setEditForm(f => ({ ...f, assigned_to_name: '', assigned_to_email: '', employee_code: '' }))}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold">Clear (unassign)</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-gray-500 text-xs">Cancel</button>
                  </div>
                </div>
              )}

              {historyFor === a.id && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Assignment history</p>
                  {historyLoading ? (
                    <p className="text-xs text-gray-400">Loading…</p>
                  ) : history.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No assignment changes recorded yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {history.map(h => (
                        <div key={h.id} className="flex items-start gap-2 text-xs">
                          <span className={`px-1.5 py-0.5 rounded-full font-medium shrink-0 ${ACTION_COLOR[h.action] || 'bg-gray-100 text-gray-500'}`}>{h.action}</span>
                          <div className="text-gray-600">
                            {(h.assigned_to_name || h.assigned_to_email) && (
                              <span>
                                <span className="font-medium text-gray-800">{h.assigned_to_name || h.assigned_to_email}</span>
                                {h.assigned_to_email && h.assigned_to_name && <span className="text-gray-400"> · {h.assigned_to_email}</span>}
                                {h.employee_code && <span className="ml-1 font-mono text-[10px] text-gray-400">{h.employee_code}</span>}
                              </span>
                            )}
                            {h.note && <span className="text-gray-400"> — {h.note}</span>}
                            <span className="text-gray-400"> · {new Date(h.created_at).toLocaleString()}</span>
                            {h.changed_by_name && <span className="text-gray-400"> · by {h.changed_by_name}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Escalation Rules Tab ───────────────────────────────────────────────────────
function EscalationTab() {
  const { escalationRules, escalationLoading, fetchEscalationRules, createEscalationRule, deleteEscalationRule } = useFeatureStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', priority: 'high', hours_before_escalation: 4, notify_email: '', is_active: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchEscalationRules() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await createEscalationRule({ ...form, hours_before_escalation: Number(form.hours_before_escalation), escalate_to_ids: [] })
      setShowForm(false)
      setForm({ name: '', priority: 'high', hours_before_escalation: 4, notify_email: '', is_active: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Escalation Rules</h3>
          <p className="text-sm text-gray-500">Auto-escalate tickets that breach time thresholds.</p>
        </div>
        <AddButton label="Add Rule" onClick={() => setShowForm(true)} />
      </div>

      {showForm && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 space-y-4">
          <h4 className="font-semibold text-gray-800">New Escalation Rule</h4>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Rule name *"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Trigger Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                {['critical','high','medium','low'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Hours before escalation</label>
              <input type="number" min={1} value={form.hours_before_escalation} onChange={e => setForm(f => ({ ...f, hours_before_escalation: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <input value={form.notify_email} onChange={e => setForm(f => ({ ...f, notify_email: e.target.value }))}
            placeholder="Notification email (optional)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold">Cancel</button>
          </div>
        </div>
      )}

      {escalationLoading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
      ) : escalationRules.length === 0 ? (
        <EmptyState icon="🚨" title="No escalation rules" desc="Ensure critical tickets get attention fast." />
      ) : (
        <div className="space-y-2">
          {escalationRules.map(r => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div>
                <span className="text-sm font-medium text-gray-800">{r.name}</span>
                <p className="text-xs text-gray-400 mt-0.5">{r.priority} tickets → escalate after {r.hours_before_escalation}h</p>
              </div>
              <button onClick={() => deleteEscalationRule(r.id)} className="text-red-400 hover:text-red-600 text-sm">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Recurring Templates Tab ────────────────────────────────────────────────────
function RecurringTab() {
  const { recurringTemplates, recurringLoading, fetchRecurringTemplates, createRecurringTemplate, deleteRecurringTemplate } = useFeatureStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', subject: '', cron_expr: '0 9 * * 1', category: 'other', priority: 'medium', description: '', is_active: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchRecurringTemplates() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await createRecurringTemplate(form)
      setShowForm(false)
      setForm({ name: '', subject: '', cron_expr: '0 9 * * 1', category: 'other', priority: 'medium', description: '', is_active: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Recurring Tickets</h3>
          <p className="text-sm text-gray-500">Schedule tickets to be created automatically on a cron schedule.</p>
        </div>
        <AddButton label="Add Schedule" onClick={() => setShowForm(true)} />
      </div>

      {showForm && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 space-y-4">
          <h4 className="font-semibold text-gray-800">New Recurring Ticket</h4>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Schedule name *"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="Ticket subject *"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Cron expression</label>
            <input value={form.cron_expr} onChange={e => setForm(f => ({ ...f, cron_expr: e.target.value }))}
              placeholder="0 9 * * 1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500" />
            <p className="text-xs text-gray-400 mt-1">e.g. <code>0 9 * * 1</code> = Every Monday at 09:00</p>
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)" rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 resize-none" />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name || !form.subject}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold">Cancel</button>
          </div>
        </div>
      )}

      {recurringLoading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
      ) : recurringTemplates.length === 0 ? (
        <EmptyState icon="🔄" title="No recurring tickets" desc="Schedule periodic maintenance or review tickets." />
      ) : (
        <div className="space-y-2">
          {recurringTemplates.map(t => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div>
                <span className="text-sm font-medium text-gray-800">{t.name}</span>
                <p className="text-xs text-gray-400 mt-0.5">{t.subject} · <code className="font-mono">{t.cron_expr}</code></p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {t.is_active ? 'Active' : 'Paused'}
                </span>
                <button onClick={() => deleteRecurringTemplate(t.id)} className="text-red-400 hover:text-red-600 text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Branding Tab ───────────────────────────────────────────────────────────────
function BrandingTab() {
  const { branding, brandingLoading, fetchBranding, saveBranding } = useFeatureStore()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchBranding().then(() => {
      const b = useFeatureStore.getState().branding
      setForm(b || { company_name: 'Help Desk', primary_color: '#0ea5e9', logo_url: '', favicon_url: '', support_email: '', welcome_message: '' })
    })
  }, [])

  useEffect(() => {
    if (branding && !form) setForm(branding)
  }, [branding])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveBranding(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (brandingLoading || !form) return <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Portal Branding</h3>
        <p className="text-sm text-gray-500">Customise the look of your support portal.</p>
      </div>
      {saved && <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">✅ Branding saved.</div>}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Company Name</label>
        <input value={form.company_name || ''} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Support Email</label>
        <input type="email" value={form.support_email || ''} onChange={e => setForm(f => ({ ...f, support_email: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Primary Colour</label>
        <div className="flex items-center gap-3">
          <input type="color" value={form.primary_color || '#0ea5e9'} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
            className="h-10 w-16 rounded-lg border border-gray-300 cursor-pointer" />
          <span className="text-sm font-mono text-gray-600">{form.primary_color || '#0ea5e9'}</span>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Logo URL</label>
        <input value={form.logo_url || ''} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
          placeholder="https://your-cdn.com/logo.png"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Welcome Message</label>
        <textarea value={form.welcome_message || ''} onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))}
          rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 resize-none" />
      </div>
      <button onClick={handleSave} disabled={saving}
        className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save Branding'}
      </button>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

const TAB_MAP = {
  customFields:          <CustomFieldsTab />,
  automation:            <AutomationTab />,
  webhooks:              <WebhooksTab />,
  notificationChannels:  <NotificationChannelsTab />,
  assets:                <AssetsTab />,
  escalation:            <EscalationTab />,
  recurring:             <RecurringTab />,
  branding:              <BrandingTab />,
}

export default function AdminFeatureTabs({ activeTab }) {
  return TAB_MAP[activeTab] || null
}
