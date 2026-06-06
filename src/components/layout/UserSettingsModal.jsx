/**
 * UserSettingsModal — self-service profile settings for the current user.
 * Accessible from the Topbar user menu.
 *
 * Tabs:
 *   • Profile   — name, initials, timezone
 *   • Security  — change password, 2FA / TOTP setup
 */
import { useState } from 'react'
import { useFeatureStore } from '../../stores/featureStore'

const TIMEZONES = [
  'UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'America/New_York',
  'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Australia/Sydney', 'Pacific/Auckland',
]

export default function UserSettingsModal({ user, onClose, onSaved }) {
  const [tab, setTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Profile fields
  const [name, setName] = useState(user?.name || '')
  const [initials, setInitials] = useState(user?.initials || '')
  const [timezone, setTimezone] = useState(user?.preferred_timezone || 'UTC')

  // Password change
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')

  // TOTP
  const [totpSetup, setTotpSetup] = useState(null)
  const [totpCode, setTotpCode] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [disableCode, setDisableCode] = useState('')

  const { initTotpSetup, verifyTotp, disableTotp, updateOwnSettings } = useFeatureStore()

  const handleSaveProfile = async () => {
    setSaving(true); setError(''); setSuccess('')
    try {
      await updateOwnSettings({ name, initials, preferred_timezone: timezone })
      setSuccess('Profile updated.')
      if (onSaved) onSaved()
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPass !== confirmPass) { setError('New passwords do not match'); return }
    if (newPass.length < 4) { setError('Password must be at least 4 characters'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      await updateOwnSettings({ current_password: currentPass, new_password: newPass })
      setSuccess('Password changed successfully.')
      setCurrentPass(''); setNewPass(''); setConfirmPass('')
    } catch (e) {
      setError(e.message || 'Password change failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSetupTotp = async () => {
    setSaving(true); setError('')
    try {
      const data = await initTotpSetup()
      setTotpSetup(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyTotp = async () => {
    setSaving(true); setError('')
    try {
      const result = await verifyTotp(totpCode)
      setBackupCodes(result.backup_codes || [])
      setSuccess('2FA enabled! Save your backup codes below.')
      setTotpSetup(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDisableTotp = async () => {
    setSaving(true); setError('')
    try {
      await disableTotp(disableCode)
      setSuccess('2FA has been disabled.')
      setDisableCode('')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile',  label: 'Profile' },
    { id: 'security', label: 'Security & 2FA' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">My Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(''); setSuccess('') }}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors -mb-px
                ${tab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">{success}</div>
          )}

          {tab === 'profile' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initials</label>
                <input value={initials} onChange={e => setInitials(e.target.value)} maxLength={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select value={timezone} onChange={e => setTimezone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <button onClick={handleSaveProfile} disabled={saving}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </>
          )}

          {tab === 'security' && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">Change Password</h3>
                <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)}
                  placeholder="Current password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                  placeholder="New password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                <button onClick={handleChangePassword} disabled={saving || !currentPass || !newPass}
                  className="w-full py-2.5 rounded-xl bg-gray-700 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50">
                  {saving ? 'Updating…' : 'Update Password'}
                </button>
              </div>

              <hr className="border-gray-100" />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">Two-Factor Authentication (TOTP)</h3>
                {user?.totp_enabled ? (
                  <>
                    <p className="text-xs text-green-700 bg-green-50 rounded-lg p-2 border border-green-200">
                      ✅ 2FA is currently <strong>enabled</strong> on your account.
                    </p>
                    <input value={disableCode} onChange={e => setDisableCode(e.target.value)}
                      maxLength={6} placeholder="Enter TOTP code to disable"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-red-500" />
                    <button onClick={handleDisableTotp} disabled={saving || disableCode.length < 6}
                      className="w-full py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                      Disable 2FA
                    </button>
                  </>
                ) : (
                  <>
                    {!totpSetup ? (
                      <>
                        <p className="text-xs text-gray-500">
                          Enable 2FA to protect your account with an authenticator app (Google Authenticator, Authy, etc.)
                        </p>
                        <button onClick={handleSetupTotp} disabled={saving}
                          className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                          Set Up 2FA
                        </button>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-700">
                          Scan this QR code in your authenticator app or enter the secret manually.
                        </p>
                        <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl border">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(totpSetup.provisioning_uri)}`}
                            alt="QR code"
                            className="rounded"
                          />
                          <code className="text-xs font-mono text-gray-600 break-all text-center">{totpSetup.secret}</code>
                        </div>
                        <input value={totpCode} onChange={e => setTotpCode(e.target.value)}
                          maxLength={6} placeholder="Enter the 6-digit code"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-center focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={handleVerifyTotp} disabled={saving || totpCode.length < 6}
                          className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                          {saving ? 'Verifying…' : 'Verify & Enable 2FA'}
                        </button>
                      </div>
                    )}

                    {backupCodes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-700">
                          🔑 Save these backup codes — they won't be shown again:
                        </p>
                        <div className="grid grid-cols-2 gap-1">
                          {backupCodes.map((code, i) => (
                            <code key={i} className="text-xs font-mono bg-gray-100 rounded px-2 py-1">{code}</code>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
