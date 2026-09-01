/**
 * Zustand store for Knowledge Base — server-state with local cache.
 * Does NOT persist to localStorage (server is source of truth).
 */
import { create } from 'zustand'
import {
  kbArticleApi, kbCategoryApi, kbSearchApi, kbVersionApi, kbTicketApi,
} from '../api/knowledge'
import type {
  Article, ArticleCreate, ArticleFilters, ArticleListItem, ArticleUpdate,
  ArticleVersion, Category, CategoryCreate, CategoryUpdate,
  PaginatedArticles, SearchResult, TicketArticleLink,
} from '../types/knowledge'

interface KBState {
  // ── Categories
  categories: Category[]
  categoriesLoading: boolean
  fetchCategories: () => Promise<void>
  createCategory: (data: CategoryCreate) => Promise<Category>
  updateCategory: (id: string, data: CategoryUpdate) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>

  // ── Article list
  articles: ArticleListItem[]
  pagination: Omit<PaginatedArticles, 'items'>
  articlesLoading: boolean
  fetchArticles: (filters?: ArticleFilters) => Promise<void>

  // ── Active article
  activeArticle: Article | null
  activeLoading: boolean
  fetchArticle: (id: string) => Promise<void>
  fetchArticleBySlug: (slug: string) => Promise<void>
  createArticle: (data: ArticleCreate) => Promise<Article>
  updateArticle: (id: string, data: ArticleUpdate) => Promise<Article>
  deleteArticle: (id: string) => Promise<void>
  transitionStatus: (id: string, status: string, comment?: string) => Promise<void>

  // ── Versions
  versions: ArticleVersion[]
  versionsLoading: boolean
  fetchVersions: (articleId: string, language?: string) => Promise<void>
  revertVersion: (articleId: string, versionNumber: number, language: string, summary?: string) => Promise<void>

  // ── Search
  searchResult: SearchResult | null
  searchLoading: boolean
  runSearch: (query: string, language?: string, categoryId?: string) => Promise<void>
  clearSearch: () => void

  // ── Ticket links
  ticketArticles: TicketArticleLink[]
  fetchArticlesForTicket: (ticketId: string) => Promise<void>

  // ── Error
  error: string | null
  clearError: () => void
}

const DEFAULT_PAGINATION: Omit<PaginatedArticles, 'items'> = {
  total: 0, page: 1, page_size: 20, pages: 0,
}

let isKbApiSupported = true

export const useKnowledgeStore = create<KBState>((set, get) => ({
  // ── Categories ──────────────────────────────────────────────────────────────
  categories: [],
  categoriesLoading: false,

  fetchCategories: async () => {
    if (!isKbApiSupported) return
    set({ categoriesLoading: true, error: null })
    try {
      const data = await kbCategoryApi.list()
      set({ categories: data, categoriesLoading: false })
    } catch (e: any) {
      if (e?.message === 'Not Found' || e?.message?.includes('404')) {
        isKbApiSupported = false
      }
      set({ error: e.message, categoriesLoading: false })
    }
  },

  createCategory: async (data) => {
    const cat = await kbCategoryApi.create(data)
    await get().fetchCategories()
    return cat
  },

  updateCategory: async (id, data) => {
    const cat = await kbCategoryApi.update(id, data)
    await get().fetchCategories()
    return cat
  },

  deleteCategory: async (id) => {
    await kbCategoryApi.delete(id)
    await get().fetchCategories()
  },

  // ── Article list ────────────────────────────────────────────────────────────
  articles: [],
  pagination: DEFAULT_PAGINATION,
  articlesLoading: false,

  fetchArticles: async (filters = {}) => {
    if (!isKbApiSupported) return
    set({ articlesLoading: true, error: null })
    try {
      const data = await kbArticleApi.list(filters)
      set({ articles: data.items, pagination: { total: data.total, page: data.page, page_size: data.page_size, pages: data.pages }, articlesLoading: false })
    } catch (e: any) {
      if (e?.message === 'Not Found' || e?.message?.includes('404')) {
        isKbApiSupported = false
      }
      set({ error: e.message, articlesLoading: false })
    }
  },

  // ── Active article ──────────────────────────────────────────────────────────
  activeArticle: null,
  activeLoading: false,

  fetchArticle: async (id) => {
    set({ activeLoading: true, error: null })
    try {
      const article = await kbArticleApi.get(id)
      set({ activeArticle: article, activeLoading: false })
    } catch (e: any) {
      set({ error: e.message, activeLoading: false })
    }
  },

  fetchArticleBySlug: async (slug) => {
    set({ activeLoading: true, error: null })
    try {
      const article = await kbArticleApi.getBySlug(slug)
      set({ activeArticle: article, activeLoading: false })
    } catch (e: any) {
      set({ error: e.message, activeLoading: false })
    }
  },

  createArticle: async (data) => {
    const article = await kbArticleApi.create(data)
    set((s) => ({ articles: [article as unknown as ArticleListItem, ...s.articles] }))
    return article
  },

  updateArticle: async (id, data) => {
    const article = await kbArticleApi.update(id, data)
    set((s) => ({
      activeArticle: s.activeArticle?.id === id ? article : s.activeArticle,
      articles: s.articles.map((a) => a.id === id ? { ...a, ...article } as ArticleListItem : a),
    }))
    return article
  },

  deleteArticle: async (id) => {
    await kbArticleApi.delete(id)
    set((s) => ({
      articles: s.articles.filter((a) => a.id !== id),
      activeArticle: s.activeArticle?.id === id ? null : s.activeArticle,
    }))
  },

  transitionStatus: async (id, status, comment) => {
    const article = await kbArticleApi.transition(id, status, comment)
    set((s) => ({
      activeArticle: s.activeArticle?.id === id ? article : s.activeArticle,
      articles: s.articles.map((a) => a.id === id ? { ...a, status: article.status } as ArticleListItem : a),
    }))
  },

  // ── Versions ────────────────────────────────────────────────────────────────
  versions: [],
  versionsLoading: false,

  fetchVersions: async (articleId, language) => {
    set({ versionsLoading: true })
    try {
      const versions = await kbVersionApi.list(articleId, language)
      set({ versions, versionsLoading: false })
    } catch (e: any) {
      set({ error: e.message, versionsLoading: false })
    }
  },

  revertVersion: async (articleId, versionNumber, language, summary) => {
    const article = await kbVersionApi.revert(articleId, versionNumber, language, summary)
    set((s) => ({
      activeArticle: s.activeArticle?.id === articleId ? article : s.activeArticle,
    }))
    await get().fetchVersions(articleId, language)
  },

  // ── Search ──────────────────────────────────────────────────────────────────
  searchResult: null,
  searchLoading: false,

  runSearch: async (query, language = 'en', categoryId) => {
    set({ searchLoading: true, error: null })
    try {
      const result = await kbSearchApi.search({ q: query, language, category_id: categoryId })
      set({ searchResult: result, searchLoading: false })
    } catch (e: any) {
      set({ error: e.message, searchLoading: false })
    }
  },

  clearSearch: () => set({ searchResult: null }),

  // ── Ticket articles ─────────────────────────────────────────────────────────
  ticketArticles: [],

  fetchArticlesForTicket: async (ticketId) => {
    try {
      const data = await kbTicketApi.getArticlesForTicket(ticketId)
      set({ ticketArticles: data })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  // ── Error ───────────────────────────────────────────────────────────────────
  error: null,
  clearError: () => set({ error: null }),
}))
