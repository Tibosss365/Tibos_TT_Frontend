import { BookOpen, Edit2, ExternalLink, Eye, FileText, Image, Paperclip, Trash2 } from 'lucide-react'
import type { ArticleListItem } from '../../types/knowledge'
import { STATUS_META, VISIBILITY_META } from '../../types/knowledge'

interface Props {
  article: ArticleListItem
  onView: () => void
  onEdit?: () => void
  onDelete?: () => void
  canEdit?: boolean
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function ArticleCard({ article, onView, onEdit, onDelete, canEdit = false }: Props) {
  const statusMeta     = STATUS_META[article.status]
  const visibilityMeta = VISIBILITY_META[article.visibility]

  return (
    <div
      className="glass-card rounded-xl p-4 hover:shadow-glass-lg transition-all cursor-pointer group"
      onClick={onView}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <BookOpen size={16} className="text-indigo-400" />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusMeta.cls}`}>
                  {statusMeta.label}
                </span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${visibilityMeta.cls}`}>
                  {visibilityMeta.label}
                </span>
                {article.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium t-muted"
                    style={{ background: tag.color ? `${tag.color}22` : 'var(--c-hover)', color: tag.color ?? undefined }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold t-main mt-1.5 leading-snug group-hover:text-indigo-400 transition-colors">
                {article.title}
              </h3>

              {/* Excerpt */}
              {article.excerpt && (
                <p className="text-xs t-muted mt-1 line-clamp-2 leading-relaxed">{article.excerpt}</p>
              )}

              {/* Meta row */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] t-muted">
                  <Eye size={10} />
                  {article.view_count.toLocaleString()} views
                </span>
                <span className="flex items-center gap-1 text-[10px] t-muted">
                  By {article.author?.name ?? '—'} · {timeAgo(article.updated_at)}
                </span>
                {article.helpful_yes + article.helpful_no > 0 && (
                  <span className="text-[10px] text-emerald-400">
                    👍 {Math.round((article.helpful_yes / (article.helpful_yes + article.helpful_no)) * 100)}%
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            {canEdit && (
              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit?.() }}
                  className="p-2 rounded-lg t-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                  title="Edit"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete?.() }}
                  className="p-2 rounded-lg t-muted hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
