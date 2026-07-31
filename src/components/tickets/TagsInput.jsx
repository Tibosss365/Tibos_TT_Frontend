/**
 * TagsInput — chip-style tag input that manages a list of string tags.
 *
 * Props:
 *   tags       (string[]) — current tag list
 *   onChange   (fn)       — called with new tag array
 *   placeholder (string)  — input placeholder
 *   maxTags    (number)   — maximum number of tags (default 20)
 *   disabled   (bool)
 */
import { useState } from 'react'

export default function TagsInput({
  tags = [],
  onChange,
  placeholder = 'Add tag…',
  maxTags = 20,
  disabled = false,
}) {
  const [inputVal, setInputVal] = useState('')

  const addTag = (raw) => {
    const tag = raw.trim().toLowerCase()
    if (!tag) return
    if (tags.includes(tag)) { setInputVal(''); return }
    if (tags.length >= maxTags) return
    onChange([...tags, tag])
    setInputVal('')
  }

  const removeTag = (tag) => {
    onChange(tags.filter(t => t !== tag))
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputVal)
    } else if (e.key === 'Backspace' && !inputVal && tags.length) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div
      className={`flex flex-wrap gap-1.5 p-2 border rounded-lg bg-white dark:bg-gray-800 min-h-[38px] focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : 'border-gray-300 dark:border-gray-600'}`}
    >
      {tags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-indigo-900 leading-none ml-0.5"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {!disabled && tags.length < maxTags && (
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => addTag(inputVal)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] outline-none text-sm text-gray-700 dark:text-gray-300 bg-transparent"
        />
      )}
    </div>
  )
}
