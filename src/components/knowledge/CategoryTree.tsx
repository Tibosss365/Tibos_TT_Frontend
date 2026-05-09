import { useState } from 'react'
import { ChevronRight, FolderOpen, Folder, Hash } from 'lucide-react'
import type { Category } from '../../types/knowledge'

interface Props {
  categories: Category[]
  selectedId?: string | null
  onSelect: (id: string | null) => void
  language?: string
}

interface NodeProps {
  cat: Category
  depth: number
  selectedId?: string | null
  onSelect: (id: string | null) => void
  language: string
}

function getCatName(cat: Category, language: string): string {
  return (
    cat.translations.find((t) => t.language === language)?.name ??
    cat.translations[0]?.name ??
    cat.slug
  )
}

function CategoryNode({ cat, depth, selectedId, onSelect, language }: NodeProps) {
  const [open, setOpen] = useState(depth === 0)
  const hasChildren = cat.children.length > 0
  const isSelected = selectedId === cat.id
  const name = getCatName(cat, language)

  return (
    <div>
      <button
        onClick={() => { onSelect(isSelected ? null : cat.id); if (hasChildren) setOpen((o) => !o) }}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all text-xs font-medium ${
          isSelected
            ? 'bg-indigo-500/15 text-indigo-400'
            : 't-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5'
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {hasChildren ? (
          <ChevronRight
            size={12}
            className={`flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
            onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
          />
        ) : (
          <Hash size={10} className="flex-shrink-0 opacity-50" />
        )}
        {hasChildren
          ? open ? <FolderOpen size={13} className="flex-shrink-0" /> : <Folder size={13} className="flex-shrink-0" />
          : null}
        <span className="flex-1 truncate">{name}</span>
        {cat.article_count > 0 && (
          <span className="text-[10px] opacity-50 ml-1">{cat.article_count}</span>
        )}
      </button>

      {hasChildren && open && (
        <div>
          {cat.children.map((child) => (
            <CategoryNode
              key={child.id}
              cat={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              language={language}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CategoryTree({ categories, selectedId, onSelect, language = 'en' }: Props) {
  if (!categories.length) return null

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => onSelect(null)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs font-medium transition-all ${
          !selectedId ? 'bg-indigo-500/15 text-indigo-400' : 't-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5'
        }`}
      >
        <FolderOpen size={13} className="flex-shrink-0" />
        All Categories
      </button>
      {categories.map((cat) => (
        <CategoryNode
          key={cat.id}
          cat={cat}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
          language={language}
        />
      ))}
    </div>
  )
}
