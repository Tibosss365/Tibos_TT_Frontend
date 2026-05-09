/**
 * Knowledge Base API client — wraps the existing `api` helper with typed endpoints.
 * All paths match the FastAPI router mounted at /api/kb
 */
import { api } from './client'
import type {
  Article, ArticleCreate, ArticleFilters, ArticleUpdate, ArticleVersion,
  Category, CategoryCreate, CategoryUpdate, FeedbackCreate,
  PaginatedArticles, SearchParams, SearchResult, Tag,
  TicketArticleLink, TicketLink, TicketLinkCreate, TranslationInput,
} from '../types/knowledge'

const BASE = '/kb'

// ── Categories ────────────────────────────────────────────────────────────────
export const kbCategoryApi = {
  list: (): Promise<Category[]> =>
    api.get(`${BASE}/categories`),

  create: (data: CategoryCreate): Promise<Category> =>
    api.post(`${BASE}/categories`, data),

  update: (id: string, data: CategoryUpdate): Promise<Category> =>
    api.patch(`${BASE}/categories/${id}`, data),

  delete: (id: string): Promise<void> =>
    api.delete(`${BASE}/categories/${id}`),
}

// ── Articles ──────────────────────────────────────────────────────────────────
export const kbArticleApi = {
  list: (filters: ArticleFilters = {}): Promise<PaginatedArticles> => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.set(k, String(v)) })
    return api.get(`${BASE}/articles?${params}`)
  },

  get: (id: string): Promise<Article> =>
    api.get(`${BASE}/articles/${id}`),

  getBySlug: (slug: string): Promise<Article> =>
    api.get(`${BASE}/articles/slug/${slug}`),

  create: (data: ArticleCreate): Promise<Article> =>
    api.post(`${BASE}/articles`, data),

  update: (id: string, data: ArticleUpdate): Promise<Article> =>
    api.patch(`${BASE}/articles/${id}`, data),

  delete: (id: string): Promise<void> =>
    api.delete(`${BASE}/articles/${id}`),

  transition: (id: string, status: string, comment?: string): Promise<Article> =>
    api.post(`${BASE}/articles/${id}/status`, { status, comment }),

  upsertTranslation: (id: string, language: string, data: TranslationInput): Promise<Article> =>
    api.put(`${BASE}/articles/${id}/translations/${language}`, data),

  feedback: (id: string, data: FeedbackCreate): Promise<void> =>
    api.post(`${BASE}/articles/${id}/feedback`, data),
}

// ── Versions ──────────────────────────────────────────────────────────────────
export const kbVersionApi = {
  list: (articleId: string, language?: string): Promise<ArticleVersion[]> => {
    const q = language ? `?language=${language}` : ''
    return api.get(`${BASE}/articles/${articleId}/versions${q}`)
  },

  revert: (articleId: string, versionNumber: number, language: string, changeSummary?: string): Promise<Article> =>
    api.post(`${BASE}/articles/${articleId}/versions/${versionNumber}/revert?language=${language}`, {
      change_summary: changeSummary,
    }),
}

// ── Ticket links ──────────────────────────────────────────────────────────────
export const kbTicketApi = {
  getLinksForArticle: (articleId: string): Promise<TicketLink[]> =>
    api.get(`${BASE}/articles/${articleId}/ticket-links`),

  linkTicket: (articleId: string, data: TicketLinkCreate): Promise<TicketLink> =>
    api.post(`${BASE}/articles/${articleId}/ticket-links`, data),

  unlinkTicket: (articleId: string, ticketId: string): Promise<void> =>
    api.delete(`${BASE}/articles/${articleId}/ticket-links/${ticketId}`),

  getArticlesForTicket: (ticketId: string): Promise<TicketArticleLink[]> =>
    api.get(`${BASE}/tickets/${ticketId}/articles`),
}

// ── Search ────────────────────────────────────────────────────────────────────
export const kbSearchApi = {
  search: (params: SearchParams): Promise<SearchResult> => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.set(k, String(v)) })
    return api.get(`${BASE}/search?${q}`)
  },

  suggest: (prefix: string, language = 'en'): Promise<string[]> =>
    api.get(`${BASE}/search/suggest?q=${encodeURIComponent(prefix)}&language=${language}`),
}

// ── Tags ──────────────────────────────────────────────────────────────────────
export const kbTagApi = {
  list: (): Promise<Tag[]> =>
    api.get(`${BASE}/tags`),

  create: (name: string, color?: string): Promise<Tag> =>
    api.post(`${BASE}/tags`, { name, color }),
}
