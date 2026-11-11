import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const CHECK_EVERY_MS = 5 * 60 * 1000

// Shows a small banner when a newer build has been deployed while this tab was
// open, so people don't keep running (or hard-refreshing for) an old version.
export function UpdateNotice() {
  const [stale, setStale] = useState(false)

  useEffect(() => {
    if (__APP_VERSION__ === 'dev') return undefined
    let active = true
    const check = async () => {
      try {
        const res = await fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (active && data?.version && data.version !== __APP_VERSION__) setStale(true)
      } catch { /* offline or blocked — try again later */ }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    const timer = setInterval(check, CHECK_EVERY_MS)
    document.addEventListener('visibilitychange', onVisible)
    check()
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  if (!stale) return null
  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-white px-4 py-2.5 text-xs shadow-xl dark:bg-slate-900">
      <span className="t-main font-medium">A new version of the helpdesk is available.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 font-semibold text-white hover:bg-indigo-600 transition-colors"
      >
        <RefreshCw size={12} /> Refresh
      </button>
    </div>
  )
}
