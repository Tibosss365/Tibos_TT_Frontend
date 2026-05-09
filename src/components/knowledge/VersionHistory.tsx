import { useEffect, useState } from 'react'
import { Clock, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { useKnowledgeStore } from '../../stores/knowledgeStore'
import type { Article, ArticleVersion } from '../../types/knowledge'

interface Props {
  isOpen: boolean
  onClose: () => void
  article: Article
  language?: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const maxLen = Math.max(oldLines.length, newLines.length)

  return (
    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
      <div>
        <div className="text-[10px] font-sans font-semibold t-muted mb-1 uppercase tracking-wider">Previous</div>
        <div className="glass-card rounded-lg p-3 overflow-auto max-h-64 space-y-0.5">
          {oldLines.map((line, i) => {
            const changed = line !== (newLines[i] ?? '')
            return (
              <div key={i} className={`leading-relaxed px-1 rounded ${changed ? 'bg-rose-400/10 text-rose-300' : 't-muted'}`}>
                {line || ' '}
              </div>
            )
          })}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-sans font-semibold t-muted mb-1 uppercase tracking-wider">Current</div>
        <div className="glass-card rounded-lg p-3 overflow-auto max-h-64 space-y-0.5">
          {newLines.map((line, i) => {
            const changed = line !== (oldLines[i] ?? '')
            return (
              <div key={i} className={`leading-relaxed px-1 rounded ${changed ? 'bg-emerald-400/10 text-emerald-300' : 't-muted'}`}>
                {line || ' '}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function VersionHistory({ isOpen, onClose, article, language = 'en' }: Props) {
  const { versions, versionsLoading, fetchVersions, revertVersion } = useKnowledgeStore()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [reverting, setReverting] = useState<number | null>(null)
  const [confirmRevert, setConfirmRevert] = useState<ArticleVersion | null>(null)

  useEffect(() => {
    if (isOpen) fetchVersions(article.id, language)
  }, [isOpen, article.id, language])

  const handleRevert = async (ver: ArticleVersion) => {
    setReverting(ver.version_number)
    try {
      await revertVersion(article.id, ver.version_number, language, `Reverted to v${ver.version_number}`)
      setConfirmRevert(null)
      onClose()
    } finally {
      setReverting(null)
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Version History" size="lg">
        <div className="p-5 space-y-3">
          {versionsLoading ? (
            <div className="flex items-center justify-center py-12 t-muted text-sm">Loading versions…</div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 t-muted">
              <Clock size={32} className="opacity-20 mb-3" />
              <p className="text-sm">No version history yet.</p>
            </div>
          ) : (
            versions.map((ver, idx) => {
              const isLatest = idx === 0
              const prev = versions[idx + 1]
              const isExpanded = expanded === ver.id

              return (
                <div key={ver.id} className="glass-card rounded-xl overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    onClick={() => setExpanded(isExpanded ? null : ver.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isLatest ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-400/10 t-muted'
                      }`}>
                        v{ver.version_number}
                      </div>
                      <div>
                        <div className="text-xs font-semibold t-main flex items-center gap-2">
                          {ver.title}
                          {isLatest && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-indigo-400/15 text-indigo-400 font-semibold">CURRENT</span>
                          )}
                        </div>
                        <div className="text-[10px] t-muted mt-0.5">
                          {ver.change_summary && <span className="mr-2">{ver.change_summary}</span>}
                          By {ver.changed_by_name ?? '—'} · {fmtDate(ver.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isLatest && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmRevert(ver) }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold t-muted hover:text-indigo-400 hover:bg-indigo-400/10 transition-all"
                        >
                          <RotateCcw size={11} />
                          Revert
                        </button>
                      )}
                      {isExpanded ? <ChevronDown size={14} className="t-muted" /> : <ChevronRight size={14} className="t-muted" />}
                    </div>
                  </div>

                  {isExpanded && prev && (
                    <div className="px-4 pb-4">
                      <DiffView oldText={prev.content} newText={ver.content} />
                    </div>
                  )}
                  {isExpanded && !prev && (
                    <div className="px-4 pb-4">
                      <div className="text-[11px] font-mono glass-card rounded-lg p-3 t-muted max-h-64 overflow-auto whitespace-pre-wrap">
                        {ver.content}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </Modal>

      {/* Revert confirmation */}
      <Modal isOpen={!!confirmRevert} onClose={() => setConfirmRevert(null)} title="Revert Article" size="sm">
        <div className="p-5">
          <p className="text-sm t-muted mb-1">
            Revert to <span className="font-semibold t-main">v{confirmRevert?.version_number}</span>?
          </p>
          <p className="text-xs t-muted mb-5">
            The current content will be saved as a new version before reverting, so nothing is lost.
          </p>
          <div className="flex items-center justify-end gap-3">
            <button onClick={() => setConfirmRevert(null)} className="px-4 py-2 rounded-lg text-sm t-muted hover:t-main transition-colors">Cancel</button>
            <button
              onClick={() => confirmRevert && handleRevert(confirmRevert)}
              disabled={!!reverting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-all"
            >
              <RotateCcw size={14} />
              {reverting ? 'Reverting…' : 'Revert'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
