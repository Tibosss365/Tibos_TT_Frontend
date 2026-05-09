// ─── Shared literals ──────────────────────────────────────────────────────────
export type ArticleStatus     = 'draft' | 'review' | 'approved' | 'published' | 'archived'
export type ArticleVisibility = 'public' | 'internal' | 'agent_only' | 'customer_specific'
export type LinkType          = 'related' | 'resolved_by' | 'referenced'

// ─── Category ─────────────────────────────────────────────────────────────────
export interface CategoryTranslation {
  id: string
  language: string
  name: string
  description?: string | null
}

export interface Category {
  id: string
  parent_id: string | null
  slug: string
  icon?: string | null
  sort_order: number
  translations: CategoryTranslation[]
  children: Category[]
  article_count: number
  created_at: string
  updated_at: string
}

export interface CategoryCreate {
  parent_id?: string | null
  slug: string
  icon?: string
  sort_order?: number
  translations: { language: string; name: string; description?: string }[]
}

export interface CategoryUpdate extends Partial<CategoryCreate> {}

// ─── Translation ──────────────────────────────────────────────────────────────
export interface ArticleTranslation {
  id: string
  language: string
  title: string
  content: string
  excerpt?: string | null
  created_at: string
  updated_at: string
}

export interface TranslationInput {
  language: string
  title: string
  content: string
  excerpt?: string
}

// ─── Attachment ───────────────────────────────────────────────────────────────
export interface Attachment {
  id: string
  file_name: string
  file_path: string
  file_size?: number
  content_type?: string
  is_image: boolean
  uploaded_by: string
  created_at: string
}

// ─── Tag ──────────────────────────────────────────────────────────────────────
export interface Tag {
  id: string
  name: string
  color?: string | null
}

// ─── Version ──────────────────────────────────────────────────────────────────
export interface ArticleVersion {
  id: string
  version_number: number
  language: string
  title: string
  content: string
  change_summary?: string | null
  changed_by: string
  changed_by_name?: string | null
  created_at: string
}

// ─── Author ───────────────────────────────────────────────────────────────────
export interface ArticleAuthor {
  id: string
  name: string
}

// ─── Article (full) ───────────────────────────────────────────────────────────
export interface Article {
  id: string
  category_id?: string | null
  category?: Category | null
  author_id: string
  author?: ArticleAuthor | null
  slug: string
  status: ArticleStatus
  visibility: ArticleVisibility
  default_language: string
  reference_url?: string | null
  sort_order: number
  view_count: number
  helpful_yes: number
  helpful_no: number
  published_at?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at: string
  translations: ArticleTranslation[]
  tags: Tag[]
  attachments: Attachment[]
  version_count: number
}

// ─── Article (list) ───────────────────────────────────────────────────────────
export interface ArticleListItem {
  id: string
  category_id?: string | null
  slug: string
  status: ArticleStatus
  visibility: ArticleVisibility
  default_language: string
  view_count: number
  helpful_yes: number
  helpful_no: number
  published_at?: string | null
  created_at: string
  updated_at: string
  author?: ArticleAuthor | null
  tags: Tag[]
  title: string
  excerpt?: string | null
}

export interface PaginatedArticles {
  items: ArticleListItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

// ─── Article create / update ──────────────────────────────────────────────────
export interface ArticleCreate {
  category_id?: string | null
  slug: string
  status?: ArticleStatus
  visibility?: ArticleVisibility
  default_language?: string
  reference_url?: string
  sort_order?: number
  tag_ids?: string[]
  translations: TranslationInput[]
  change_summary?: string
}

export interface ArticleUpdate extends Partial<ArticleCreate> {}

// ─── Search ───────────────────────────────────────────────────────────────────
export interface SearchHit {
  article_id: string
  slug: string
  language: string
  title: string
  headline: string            // HTML with <mark> highlights
  rank: number
  status: ArticleStatus
  visibility: ArticleVisibility
  category_id?: string | null
  category_name?: string | null
  published_at?: string | null
}

export interface SearchResult {
  query: string
  hits: SearchHit[]
  total: number
  took_ms: number
}

// ─── Ticket link ──────────────────────────────────────────────────────────────
export interface TicketLink {
  id: string
  ticket_id: string
  article_id: string
  link_type: LinkType
  linked_by: string
  created_at: string
}

export interface TicketArticleLink {
  link_id: string
  link_type: LinkType
  article_id: string
  slug: string
  status: ArticleStatus
  visibility: ArticleVisibility
  title: string
  linked_at: string
}

// ─── Feedback ─────────────────────────────────────────────────────────────────
export interface FeedbackCreate {
  is_helpful: boolean
  comment?: string
}

// ─── List filters ─────────────────────────────────────────────────────────────
export interface ArticleFilters {
  category_id?: string
  status?: ArticleStatus | ''
  tag_id?: string
  language?: string
  page?: number
  page_size?: number
}

export interface SearchParams {
  q: string
  language?: string
  category_id?: string
  status?: string
  limit?: number
  offset?: number
}

// ─── Status / visibility meta ─────────────────────────────────────────────────
export const STATUS_META: Record<ArticleStatus, { label: string; cls: string }> = {
  draft:     { label: 'Draft',     cls: 'bg-slate-400/15 text-slate-400 border border-slate-400/30' },
  review:    { label: 'Review',    cls: 'bg-amber-400/15 text-amber-400 border border-amber-400/30' },
  approved:  { label: 'Approved',  cls: 'bg-blue-400/15 text-blue-400 border border-blue-400/30' },
  published: { label: 'Published', cls: 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30' },
  archived:  { label: 'Archived',  cls: 'bg-rose-400/15 text-rose-400 border border-rose-400/30' },
}

export const VISIBILITY_META: Record<ArticleVisibility, { label: string; cls: string }> = {
  public:            { label: 'Public',            cls: 'bg-indigo-400/15 text-indigo-400 border border-indigo-400/30' },
  internal:          { label: 'Internal',          cls: 'bg-amber-400/15 text-amber-400 border border-amber-400/30' },
  agent_only:        { label: 'Agent Only',        cls: 'bg-violet-400/15 text-violet-400 border border-violet-400/30' },
  customer_specific: { label: 'Customer Specific', cls: 'bg-teal-400/15 text-teal-400 border border-teal-400/30' },
}
