import { useEffect, useRef, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import { useKnowledgeSearch } from '../../hooks/useKnowledgeSearch'
import type { SearchHit } from '../../types/knowledge'

interface Props {
  language?: string
  categoryId?: string
  onSelectHit?: (hit: SearchHit) => void
  onViewAll?: (query: string) => void
  placeholder?: string
  autoFocus?: boolean
}

export function SearchBar({ language, categoryId, onSelectHit, onViewAll, placeholder = 'Search knowledge base…', autoFocus = false }: Props) {
  const { query, setQuery, hits, suggestions, isSearching, total, reset, hasResults } = useKnowledgeSearch({ language, categoryId })
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { if (query.length >= 2) setOpen(true) }, [query])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { reset(); setOpen(false) }
    if (e.key === 'Enter' && query && onViewAll) { onViewAll(query); setOpen(false) }
  }

  const handleSuggestion = (s: string) => {
    setQuery(s)
    inputRef.current?.focus()
  }

  const handleHit = (hit: SearchHit) => {
    onSelectHit?.(hit)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      {/* Input */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 t-muted" />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          className="glass-input w-full pl-9 pr-8 py-2 rounded-xl text-sm t-main"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.length >= 2) setOpen(true) }}
          onKeyDown={handleKey}
        />
        {isSearching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 t-muted animate-spin" />}
        {!isSearching && query && (
          <button onClick={reset} className="absolute right-3 top-1/2 -translate-y-1/2 t-muted hover:t-main transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && query.length >= 2 && (
        <div
          className="absolute top-full mt-1.5 left-0 right-0 z-50 glass-card rounded-xl overflow-hidden shadow-glass-lg animate-fade-in"
          style={{ border: '1px solid var(--c-border)' }}
        >
          {/* Suggestions */}
          {suggestions.length > 0 && !hasResults && (
            <div className="px-3 py-2 space-y-0.5">
              <p className="text-[10px] t-muted uppercase tracking-wider font-semibold mb-1">Suggestions</p>
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs t-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <Search size={11} className="flex-shrink-0 opacity-50" />
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          {hasResults && (
            <div>
              <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                <p className="text-[10px] t-muted uppercase tracking-wider font-semibold">
                  {total} result{total !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {hits.slice(0, 8).map((hit) => (
                  <button
                    key={hit.article_id}
                    onClick={() => handleHit(hit)}
                    className="w-full flex flex-col px-3 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                  >
                    <span className="text-xs font-semibold t-main truncate">{hit.title}</span>
                    {hit.category_name && (
                      <span className="text-[10px] t-muted mt-0.5">{hit.category_name}</span>
                    )}
                    {hit.headline && (
                      <span
                        className="text-[11px] t-muted mt-1 line-clamp-2 leading-relaxed [&_mark]:bg-amber-400/30 [&_mark]:text-amber-300 [&_mark]:rounded"
                        dangerouslySetInnerHTML={{ __html: hit.headline }}
                      />
                    )}
                  </button>
                ))}
              </div>
              {total > 8 && onViewAll && (
                <button
                  onClick={() => { onViewAll(query); setOpen(false) }}
                  className="w-full px-3 py-2.5 text-xs text-indigo-400 hover:bg-indigo-400/5 transition-all font-semibold text-center"
                  style={{ borderTop: '1px solid var(--c-border)' }}
                >
                  View all {total} results →
                </button>
              )}
            </div>
          )}

          {/* Empty */}
          {!isSearching && !hasResults && suggestions.length === 0 && (
            <div className="px-3 py-6 text-center text-xs t-muted">No results for "{query}"</div>
          )}
        </div>
      )}
    </div>
  )
}
