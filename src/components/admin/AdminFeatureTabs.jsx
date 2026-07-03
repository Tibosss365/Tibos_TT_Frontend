/**
 * AdminFeatureTabs — renders the 9 new feature management tabs for the Admin page.
 *
 * Usage: <AdminFeatureTabs activeTab="customFields" />
 *
 * Exported tabs (string IDs used in Admin.jsx):
 *   customFields | ticketTemplates | automation | webhooks | notificationChannels
 *   assets | escalation | recurring | branding
 */
import { useEffect, useState, Fragment } from 'react'
import { useFeatureStore } from '../../stores/featureStore'
import { useAdminStore } from '../../stores/adminStore'
import { useUiStore } from '../../stores/uiStore'

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
  brand: '', model: '', specification: '', os_version: '',
  processor: '', ram: '', rom: '', adaptor_status: 'not_provided',
}

// Laptop adaptor status options
const ADAPTOR_OPTIONS = [
  { value: 'not_provided', label: 'Not provided' },
  { value: 'provided',     label: 'Provided' },
  { value: 'replaced',     label: 'Replaced' },
]
const ADAPTOR_COLOR = { provided: 'bg-green-100 text-green-700', replaced: 'bg-amber-100 text-amber-700', not_provided: 'bg-gray-100 text-gray-500' }

function AssetsTab() {
  const { assets, assetsLoading, fetchAssets, createAsset, updateAsset, deleteAsset, fetchAssetHistory, fetchAllAssetHistory } = useFeatureStore()
  const { agents, fetchAgents } = useAdminStore()
  const { addToast } = useUiStore()
  // All users (admin / technician / end users / SSO-provisioned) come from /agents.
  const userOptions = (agents || []).filter(u => u.is_active !== false && String(u.id) !== 'unassigned')
  const [showForm, setShowForm] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [allHistory, setAllHistory] = useState([])
  const [allHistLoading, setAllHistLoading] = useState(false)
  const [histSearch, setHistSearch] = useState('')
  const [form, setForm] = useState({ ...EMPTY_ASSET_FORM })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editingAsset, setEditingAsset] = useState(null)
  const [historyFor, setHistoryFor] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [assetSearch, setAssetSearch] = useState('')

  useEffect(() => { fetchAssets(); if (!agents || agents.length === 0) fetchAgents() }, [])

  // Fill name + email from a picked user (kept editable afterwards).
  const applyUser = (setter, userId) => {
    const u = userOptions.find(x => String(x.id) === String(userId))
    if (u) setter(f => ({ ...f, assigned_to_name: u.name, assigned_to_email: u.username || '' }))
  }
  const applyUserForEdit = (userId) => {
    const u = userOptions.find(x => String(x.id) === String(userId))
    if (u) {
      setEditingAsset(f => ({ ...f, assigned_to_name: u.name, assigned_to_email: u.username || '' }))
    } else {
      setEditingAsset(f => ({ ...f, assigned_to_name: '', assigned_to_email: '', employee_code: '' }))
    }
  }
  const selectedUserId = (email) => userOptions.find(u => (u.username || '') === email)?.id ?? ''

  const handleSave = async () => {
    setSaving(true)
    try {
      await createAsset(form)
      setShowForm(false)
      setForm({ ...EMPTY_ASSET_FORM })
      addToast('Asset created successfully', 'success')
    } catch (e) {
      addToast(e.message || 'Failed to create asset', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEditSave = async () => {
    setSaving(true)
    try {
      // Map empty string inputs to null for standard fields to keep database clean
      const cleanedAsset = { ...editingAsset }
      for (const key in cleanedAsset) {
        if (cleanedAsset[key] === '') {
          cleanedAsset[key] = null
        }
      }
      await updateAsset(editingAsset.id, cleanedAsset)
      setEditingAsset(null)
      addToast('Asset updated successfully', 'success')
    } catch (e) {
      addToast(e.message || 'Failed to update asset', 'error')
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
      addToast('Asset assignment updated successfully', 'success')
    } catch (e) {
      addToast(e.message || 'Failed to update assignment', 'error')
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

  const openAllHistory = async () => {
    setShowAllHistory(true)
    setAllHistLoading(true)
    setHistSearch('')
    try { setAllHistory(await fetchAllAssetHistory() || []) }
    catch { setAllHistory([]) }
    finally { setAllHistLoading(false) }
  }

  const handleDelete = async (a) => {
    const reason = window.prompt(`Delete "${a.name}" — reason? (e.g. employee left, damaged, scrapped)`)
    if (reason === null) return            // cancelled
    if (!reason.trim()) { alert('A reason is required to delete an asset.'); return }
    try {
      await deleteAsset(a.id, reason.trim())
      addToast('Asset deleted successfully', 'success')
    } catch (e) {
      addToast(e.message || 'Failed to delete asset', 'error')
    }
  }

  const STATUS_COLOR = { active: 'bg-green-100 text-green-700', retired: 'bg-gray-100 text-gray-500', in_repair: 'bg-yellow-100 text-yellow-700', lost: 'bg-red-100 text-red-600' }
  const ACTION_COLOR = { created: 'bg-blue-100 text-blue-700', assigned: 'bg-green-100 text-green-700', reassigned: 'bg-indigo-100 text-indigo-700', unassigned: 'bg-gray-100 text-gray-500', deleted: 'bg-red-100 text-red-600' }
  const inputCls = "rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"

  // Filter history rows by search
  const filteredHistory = allHistory.filter(h => {
    if (!histSearch.trim()) return true
    const q = histSearch.toLowerCase()
    return (
      (h.assigned_to_name || '').toLowerCase().includes(q) ||
      (h.assigned_to_email || '').toLowerCase().includes(q) ||
      (h.asset_name || '').toLowerCase().includes(q) ||
      (h.asset_tag || '').toLowerCase().includes(q) ||
      (h.asset_number || '').toLowerCase().includes(q) ||
      (h.model || '').toLowerCase().includes(q) ||
      (h.brand || '').toLowerCase().includes(q)
    )
  })

  // Filter the assets table by search (name / tag / serial / brand / model / OS / assignee).
  const filteredAssets = assets.filter(a => {
    const q = assetSearch.trim().toLowerCase()
    if (!q) return true
    return [a.name, a.asset_tag, a.serial_number, a.brand, a.model, a.os_version,
            a.assigned_to_name, a.assigned_to_email, a.type, a.status]
      .some(v => (v || '').toString().toLowerCase().includes(q))
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Assets</h3>
          <p className="text-sm text-gray-500">Track laptops, phones, servers, and other hardware — and who they're assigned to.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openAllHistory}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50">
            Asset History
          </button>
          <AddButton label="Add Asset" onClick={() => setShowForm(true)} />
        </div>
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
            <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
              placeholder="Brand (e.g. Dell, HP, Apple)" className={inputCls} />
            <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              placeholder="Model (e.g. Latitude 5420)" className={inputCls} />
            <input value={form.os_version} onChange={e => setForm(f => ({ ...f, os_version: e.target.value }))}
              placeholder="OS Version (e.g. Windows 11 Pro)" className={inputCls} />
            <select value={form.adaptor_status || 'not_provided'} onChange={e => setForm(f => ({ ...f, adaptor_status: e.target.value }))} className={inputCls} title="Laptop adaptor">
              {ADAPTOR_OPTIONS.map(o => <option key={o.value} value={o.value}>Adaptor: {o.label}</option>)}
            </select>
          </div>
          {/* Hardware Specification Fields */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Specification</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Processor</label>
                <input value={form.processor || ''} onChange={e => setForm(f => ({ ...f, processor: e.target.value }))}
                  placeholder="e.g. Intel Core i7-12th Gen" className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">RAM</label>
                <input value={form.ram || ''} onChange={e => setForm(f => ({ ...f, ram: e.target.value }))}
                  placeholder="e.g. 16GB DDR5" className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">ROM / Storage</label>
                <input value={form.rom || ''} onChange={e => setForm(f => ({ ...f, rom: e.target.value }))}
                  placeholder="e.g. 512GB SSD" className={inputCls + ' w-full'} />
              </div>
            </div>
            <div className="mt-2">
              <label className="text-[11px] text-gray-500 mb-1 block">Additional Specification Notes</label>
              <textarea value={form.specification} onChange={e => setForm(f => ({ ...f, specification: e.target.value }))}
                placeholder="Any other specification details…" rows={2}
                className={inputCls + ' w-full resize-none'} />
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 pt-1">Assigned to (optional)</p>
          <select value={selectedUserId(form.assigned_to_email)} onChange={e => applyUser(setForm, e.target.value)} className={inputCls + ' w-full'}>
            <option value="">— Pick a user (admin / technician / end user / SSO) —</option>
            {userOptions.map(u => <option key={u.id} value={u.id}>{u.name} · {u.username}{u.role ? ` (${u.role})` : ''}</option>)}
          </select>
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

      {assets.length > 0 && (
        <input value={assetSearch} onChange={e => setAssetSearch(e.target.value)}
          placeholder="🔍  Search assets — name, tag, serial, brand, model, user, email…"
          className={inputCls + ' w-full max-w-md'} />
      )}

      {assetsLoading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
      ) : assets.length === 0 ? (
        <EmptyState icon="💻" title="No assets yet" desc="Start tracking your hardware inventory." />
      ) : filteredAssets.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">No assets match “{assetSearch}”.</div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Username</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Email ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Asset Tag</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Asset Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Brand</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Model</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Specification</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">OS Version</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Adaptor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssets.map((a, idx) => (
                <Fragment key={a.id}>
                  <tr
                    className={`${editingId === a.id ? 'bg-indigo-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-indigo-50/40`}
                    style={{ transition: 'background 0.15s' }}
                  >
                    {/* Username */}
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                      {a.assigned_to_name || <span className="text-gray-400 italic text-xs">Unassigned</span>}
                      {a.employee_code && (
                        <span className="ml-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{a.employee_code}</span>
                      )}
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {a.assigned_to_email || <span className="text-gray-400 italic text-xs">—</span>}
                    </td>
                    {/* Asset Tag */}
                    <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">
                      {a.asset_tag || <span className="text-gray-400 italic text-xs">—</span>}
                    </td>
                    {/* Asset Name */}
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                      <div>{a.name}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{a.type}</div>
                    </td>
                    {/* Brand */}
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {a.brand || <span className="text-gray-400 italic text-xs">—</span>}
                    </td>
                    {/* Model */}
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {a.model || <span className="text-gray-400 italic text-xs">—</span>}
                    </td>
                    {/* Specification */}
                    <td className="px-4 py-3 text-gray-600 max-w-[180px]">
                      <span className="line-clamp-2 text-xs" title={a.specification || ''}>
                        {a.specification || <span className="text-gray-400 italic">—</span>}
                      </span>
                    </td>
                    {/* OS Version */}
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {a.os_version || <span className="text-gray-400 italic text-xs">—</span>}
                    </td>
                    {/* Adaptor */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ADAPTOR_COLOR[a.adaptor_status] || ADAPTOR_COLOR.not_provided}`}>
                        {(ADAPTOR_OPTIONS.find(o => o.value === a.adaptor_status) || ADAPTOR_OPTIONS[0]).label}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[a.status] || 'bg-gray-100 text-gray-500'}`}>
                        {a.status}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditingAsset({ ...a })}
                          className="text-indigo-500 hover:text-indigo-700 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => startAssign(a)}
                          className="text-gray-500 hover:text-gray-700 text-xs font-semibold"
                        >
                          {a.assigned_to_name || a.assigned_to_email ? 'Reassign' : 'Assign'}
                        </button>
                        <button
                          onClick={() => handleDelete(a)}
                          className="text-red-400 hover:text-red-600 text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline expand row for Reassign/Assign form */}
                  {editingId === a.id && (
                    <tr className="bg-indigo-50/70 border-t border-indigo-100">
                      <td colSpan={11} className="px-5 py-4">
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-indigo-700 mb-2">
                            {a.assigned_to_name || a.assigned_to_email ? `Reassign "${a.name}"` : `Assign "${a.name}"`}
                          </p>
                          <select
                            value={selectedUserId(editForm.assigned_to_email)}
                            onChange={e => applyUser(setEditForm, e.target.value)}
                            className={inputCls + ' w-full max-w-lg'}
                          >
                            <option value="">— Pick a user (admin / technician / end user / SSO) —</option>
                            {userOptions.map(u => (
                              <option key={u.id} value={u.id}>{u.name} · {u.username}{u.role ? ` (${u.role})` : ''}</option>
                            ))}
                          </select>
                          <div className="grid grid-cols-3 gap-3 max-w-2xl">
                            <input
                              value={editForm.assigned_to_name}
                              onChange={e => setEditForm(f => ({ ...f, assigned_to_name: e.target.value }))}
                              placeholder="User name"
                              className={inputCls}
                            />
                            <input
                              value={editForm.assigned_to_email}
                              onChange={e => setEditForm(f => ({ ...f, assigned_to_email: e.target.value }))}
                              placeholder="User email"
                              className={inputCls}
                            />
                            <input
                              value={editForm.employee_code}
                              onChange={e => setEditForm(f => ({ ...f, employee_code: e.target.value }))}
                              placeholder="Employee code"
                              className={inputCls}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleAssignSave}
                              disabled={saving}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {saving ? 'Saving…' : 'Save assignment'}
                            </button>
                            <button
                              onClick={() => setEditForm(f => ({ ...f, assigned_to_name: '', assigned_to_email: '', employee_code: '' }))}
                              className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                            >
                              Clear (unassign)
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 rounded-lg text-gray-500 text-xs hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Global Asset History — Full-width Table Modal ── */}
      {showAllHistory && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowAllHistory(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col"
            style={{ width: 'calc(100vw - 2rem)', maxHeight: 'calc(100vh - 3rem)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h4 className="text-base font-bold text-gray-900">Asset History</h4>
                <p className="text-xs text-gray-500 mt-0.5">Complete audit trail — every created, assigned, reassigned, unassigned and deleted event.</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <input
                    value={histSearch}
                    onChange={e => setHistSearch(e.target.value)}
                    placeholder="Search by user, asset, model…"
                    className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 w-64"
                  />
                  <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button onClick={() => setShowAllHistory(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {allHistLoading ? (
                <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading history…</div>
              ) : filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-sm text-gray-500 font-medium">{histSearch ? 'No matching records found.' : 'No asset history yet.'}</p>
                </div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Action</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Username</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Email ID</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Asset Number</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Asset Tag</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Asset Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Model</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Brand</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Specification</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">OS Version</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date &amp; Time</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Changed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredHistory.map((h, idx) => (
                      <tr key={h.id} className={idx % 2 === 0 ? 'bg-white hover:bg-indigo-50/40' : 'bg-gray-50/50 hover:bg-indigo-50/40'} style={{ transition: 'background 0.15s' }}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLOR[h.action] || 'bg-gray-100 text-gray-500'}`}>
                            {h.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                          {h.assigned_to_name || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {h.assigned_to_email || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">
                          {h.asset_number || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">
                          {h.asset_tag || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                          {h.asset_name || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {h.model || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {h.brand || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs">
                          <span className="line-clamp-2" title={h.specification || ''}>
                            {h.specification || <span className="text-gray-400 italic">—</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {h.os_version || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {new Date(h.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {h.changed_by_name || <span className="text-gray-400 italic">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50 rounded-b-2xl">
              <p className="text-xs text-gray-400">
                {allHistLoading ? 'Loading…' : `${filteredHistory.length} record${filteredHistory.length !== 1 ? 's' : ''}${histSearch ? ' (filtered)' : ''}`}
              </p>
              <button onClick={() => setShowAllHistory(false)}
                className="px-4 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Edit Asset Modal ── */}
      {editingAsset && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setEditingAsset(null) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col w-full max-w-3xl max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h4 className="text-base font-bold text-gray-900">Edit Asset: {editingAsset.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">Modify hardware properties and assignment info.</p>
              </div>
              <button onClick={() => setEditingAsset(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Asset Name *</label>
                  <input
                    value={editingAsset.name || ''}
                    onChange={e => setEditingAsset(f => ({ ...f, name: e.target.value }))}
                    placeholder="Asset name *"
                    className={inputCls + ' w-full'}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
                  <select
                    value={editingAsset.type || 'laptop'}
                    onChange={e => setEditingAsset(f => ({ ...f, type: e.target.value }))}
                    className={inputCls + ' w-full'}
                  >
                    {['laptop','desktop','monitor','printer','phone','server','network','other'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Asset Tag</label>
                  <input
                    value={editingAsset.asset_tag || ''}
                    onChange={e => setEditingAsset(f => ({ ...f, asset_tag: e.target.value }))}
                    placeholder="Asset tag"
                    className={inputCls + ' w-full'}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Serial Number</label>
                  <input
                    value={editingAsset.serial_number || ''}
                    onChange={e => setEditingAsset(f => ({ ...f, serial_number: e.target.value }))}
                    placeholder="Serial number"
                    className={inputCls + ' w-full'}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Brand</label>
                  <input
                    value={editingAsset.brand || ''}
                    onChange={e => setEditingAsset(f => ({ ...f, brand: e.target.value }))}
                    placeholder="Brand"
                    className={inputCls + ' w-full'}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Model</label>
                  <input
                    value={editingAsset.model || ''}
                    onChange={e => setEditingAsset(f => ({ ...f, model: e.target.value }))}
                    placeholder="Model"
                    className={inputCls + ' w-full'}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">OS Version</label>
                  <input
                    value={editingAsset.os_version || ''}
                    onChange={e => setEditingAsset(f => ({ ...f, os_version: e.target.value }))}
                    placeholder="OS Version"
                    className={inputCls + ' w-full'}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
                  <select
                    value={editingAsset.status || 'active'}
                    onChange={e => setEditingAsset(f => ({ ...f, status: e.target.value }))}
                    className={inputCls + ' w-full'}
                  >
                    {['active', 'retired', 'in_repair', 'lost'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Laptop Adaptor</label>
                  <select
                    value={editingAsset.adaptor_status || 'not_provided'}
                    onChange={e => setEditingAsset(f => ({ ...f, adaptor_status: e.target.value }))}
                    className={inputCls + ' w-full'}
                  >
                    {ADAPTOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Hardware Specification */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-700 mb-3">Specification</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Processor</label>
                    <input
                      value={editingAsset.processor || ''}
                      onChange={e => setEditingAsset(f => ({ ...f, processor: e.target.value }))}
                      placeholder="e.g. Intel Core i7-12th Gen"
                      className={inputCls + ' w-full'}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 mb-1 block">RAM</label>
                    <input
                      value={editingAsset.ram || ''}
                      onChange={e => setEditingAsset(f => ({ ...f, ram: e.target.value }))}
                      placeholder="e.g. 16GB DDR5"
                      className={inputCls + ' w-full'}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 mb-1 block">ROM / Storage</label>
                    <input
                      value={editingAsset.rom || ''}
                      onChange={e => setEditingAsset(f => ({ ...f, rom: e.target.value }))}
                      placeholder="e.g. 512GB SSD"
                      className={inputCls + ' w-full'}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Additional Specification Notes</label>
                  <textarea
                    value={editingAsset.specification || ''}
                    onChange={e => setEditingAsset(f => ({ ...f, specification: e.target.value }))}
                    placeholder="Any other specification details…"
                    rows={2}
                    className={inputCls + ' w-full resize-none'}
                  />
                </div>
              </div>

              {/* Assignment Details */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-700 mb-2">Assignment Details</p>
                <div className="space-y-3">
                  <select
                    value={selectedUserId(editingAsset.assigned_to_email)}
                    onChange={e => applyUserForEdit(e.target.value)}
                    className={inputCls + ' w-full'}
                  >
                    <option value="">— Pick a user (admin / technician / end user / SSO) —</option>
                    {userOptions.map(u => (
                      <option key={u.id} value={u.id}>{u.name} · {u.username}{u.role ? ` (${u.role})` : ''}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      value={editingAsset.assigned_to_name || ''}
                      onChange={e => setEditingAsset(f => ({ ...f, assigned_to_name: e.target.value }))}
                      placeholder="User name"
                      className={inputCls}
                    />
                    <input
                      value={editingAsset.assigned_to_email || ''}
                      onChange={e => setEditingAsset(f => ({ ...f, assigned_to_email: e.target.value }))}
                      placeholder="User email"
                      className={inputCls}
                    />
                    <input
                      value={editingAsset.employee_code || ''}
                      onChange={e => setEditingAsset(f => ({ ...f, employee_code: e.target.value }))}
                      placeholder="Employee code"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setEditingAsset(null)}
                className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving || !editingAsset.name}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
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
