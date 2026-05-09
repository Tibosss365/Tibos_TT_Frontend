/**
 * Debounced full-text search hook with autocomplete suggestions.
 * Decouples search state from the Zustand store so each search bar
 * instance manages its own loading/suggestion state.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { kbSearchApi } from '../api/knowledge'
import type { SearchHit } from '../types/knowledge'

interface UseKnowledgeSearchOptions {
  language?: string
  categoryId?: string
  debounceMs?: number
  minLength?: number
  maxSuggestions?: number
}

interface UseKnowledgeSearchReturn {
  query: string
  setQuery: (q: string) => void
  hits: SearchHit[]
  suggestions: string[]
  isSearching: boolean
  total: number
  tookMs: number
  hasResults: boolean
  reset: () => void
}

export function useKnowledgeSearch(opts: UseKnowledgeSearchOptions = {}): UseKnowledgeSearchReturn {
  const {
    language       = 'en',
    categoryId,
    debounceMs     = 300,
    minLength      = 2,
    maxSuggestions = 6,
  } = opts

  const [query, setQueryRaw]   = useState('')
  const [hits, setHits]        = useState<SearchHit[]>([])
  const [suggestions, setSugs] = useState<string[]>([])
  const [isSearching, setIs]   = useState(false)
  const [total, setTotal]      = useState(0)
  const [tookMs, setTook]      = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef    = useRef<AbortController | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (q.length < minLength) {
      setHits([]); setSugs([]); setTotal(0); setIs(false)
      return
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setIs(true)

    try {
      const [result, sugs] = await Promise.all([
        kbSearchApi.search({ q, language, category_id: categoryId, limit: 20 }),
        kbSearchApi.suggest(q, language).catch(() => [] as string[]),
      ])
      setHits(result.hits)
      setTotal(result.total)
      setTook(result.took_ms)
      setSugs(sugs.slice(0, maxSuggestions))
    } catch {
      // Aborted or network error — silently ignore
    } finally {
      setIs(false)
    }
  }, [language, categoryId, minLength, maxSuggestions])

  const setQuery = useCallback((q: string) => {
    setQueryRaw(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q), debounceMs)
  }, [doSearch, debounceMs])

  const reset = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()
    setQueryRaw(''); setHits([]); setSugs([]); setTotal(0); setIs(false)
  }, [])

  // Clean up on unmount
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()
  }, [])

  return {
    query, setQuery,
    hits, suggestions,
    isSearching, total, tookMs,
    hasResults: hits.length > 0,
    reset,
  }
}
