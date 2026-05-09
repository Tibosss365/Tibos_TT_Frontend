import { useState } from 'react'
import { ChevronDown, Copy, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { useEmailStore } from '../../stores/emailStore'
import type { EmailMessage, EmailThread } from '../../types/email'
import { SENTIMENT_META } from '../../types/email'

interface Props {
  thread: EmailThread
  activeMessage: EmailMessage | null
  onInsertSuggestion: (text: string) => void
}

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly',     label: 'Friendly' },
  { value: 'formal',       label: 'Formal' },
  { value: 'empathetic',   label: 'Empathetic' },
]

export function AIPanel({ thread, activeMessage, onInsertSuggestion }: Props) {
  const { aiSuggestion, aiSummary, aiLoading, suggestReply, summarizeThread } = useEmailStore()
  const [tone, setTone] = useState('professional')
  const [copied, setCopied] = useState(false)

  const handleSuggest = () => {
    if (!activeMessage) return
    suggestReply(activeMessage.id, tone)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-indigo-400" />
        <p className="text-sm font-semibold t-main">AI Assist</p>
      </div>

      {/* ── Reply Suggestion ── */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold t-main uppercase tracking-widest">Reply Suggestion</p>

        <div className="flex items-center gap-2">
          <label className="text-xs t-muted flex-shrink-0">Tone</label>
          <div className="relative flex-1">
            <select
              className="glass-input w-full px-3 py-1.5 rounded-lg text-xs t-main appearance-none"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 t-muted pointer-events-none" />
          </div>
        </div>

        <button
          onClick={handleSuggest}
          disabled={aiLoading || !activeMessage}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 transition-all"
        >
          {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          Generate Reply
        </button>

        {!activeMessage && (
          <p className="text-[11px] t-muted text-center">Select a message to generate a reply suggestion.</p>
        )}

        {aiSuggestion && (
          <div className="space-y-2">
            <div className="glass-input rounded-lg p-3 text-xs t-main leading-relaxed whitespace-pre-wrap">
              {aiSuggestion.suggestion}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onInsertSuggestion(aiSuggestion.suggestion)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-indigo-600/80 hover:bg-indigo-600 text-white transition-all"
              >
                Insert into Reply
              </button>
              <button
                onClick={() => handleCopy(aiSuggestion.suggestion)}
                className="p-1.5 rounded-lg glass-card t-muted hover:t-main transition-all"
                title="Copy"
              >
                {copied ? '✓' : <Copy size={13} />}
              </button>
              <button
                onClick={handleSuggest}
                className="p-1.5 rounded-lg glass-card t-muted hover:t-main transition-all"
                title="Regenerate"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Thread Summary ── */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold t-main uppercase tracking-widest">Thread Summary</p>

        <button
          onClick={() => summarizeThread(thread.id)}
          disabled={aiLoading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl glass-card t-muted hover:t-main text-xs font-semibold disabled:opacity-50 transition-all"
        >
          {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          Summarize Thread
        </button>

        {aiSummary && (
          <div className="space-y-2">
            {/* Sentiment */}
            {aiSummary.sentiment && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] t-muted">Sentiment:</span>
                <span className={`text-xs font-semibold ${SENTIMENT_META[aiSummary.sentiment]?.cls}`}>
                  {SENTIMENT_META[aiSummary.sentiment]?.label}
                </span>
              </div>
            )}

            {/* Summary text */}
            <div className="glass-input rounded-lg p-3 text-xs t-main leading-relaxed">
              {aiSummary.summary}
            </div>

            {/* Key points */}
            {aiSummary.key_points.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] t-muted font-semibold uppercase tracking-wider">Key Points</p>
                <ul className="space-y-1">
                  {aiSummary.key_points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs t-main">
                      <span className="text-indigo-400 flex-shrink-0 mt-0.5">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
