import { useRef, useCallback, useEffect } from 'react'
import {
  Bold, Italic, Underline, List, ListOrdered,
  Link, Image, AlignLeft, AlignCenter, AlignRight, Code,
} from 'lucide-react'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  className?: string
}

interface ToolbarBtnProps {
  icon: React.ReactNode
  title: string
  action: () => void
  active?: boolean
}

function ToolbarBtn({ icon, title, action, active }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); action() }}
      className={`p-1.5 rounded-md transition-all ${
        active
          ? 'bg-indigo-500/20 text-indigo-400'
          : 't-muted hover:t-main hover:bg-white/5'
      }`}
    >
      {icon}
    </button>
  )
}

export function RichTextEditor({ value, onChange, placeholder = 'Write your message…', minHeight = 200, className = '' }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)

  // Sync incoming value on mount only
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) exec('createLink', url)
  }

  const insertImage = () => {
    const url = prompt('Enter image URL:')
    if (url) exec('insertImage', url)
  }

  const toolbarGroups = [
    [
      { icon: <Bold size={13} />,      title: 'Bold',          action: () => exec('bold') },
      { icon: <Italic size={13} />,    title: 'Italic',        action: () => exec('italic') },
      { icon: <Underline size={13} />, title: 'Underline',     action: () => exec('underline') },
      { icon: <Code size={13} />,      title: 'Inline Code',   action: () => exec('formatBlock', 'pre') },
    ],
    [
      { icon: <AlignLeft size={13} />,   title: 'Align Left',   action: () => exec('justifyLeft') },
      { icon: <AlignCenter size={13} />, title: 'Align Center', action: () => exec('justifyCenter') },
      { icon: <AlignRight size={13} />,  title: 'Align Right',  action: () => exec('justifyRight') },
    ],
    [
      { icon: <List size={13} />,        title: 'Bullet List',   action: () => exec('insertUnorderedList') },
      { icon: <ListOrdered size={13} />, title: 'Numbered List', action: () => exec('insertOrderedList') },
    ],
    [
      { icon: <Link size={13} />,  title: 'Insert Link',  action: insertLink },
      { icon: <Image size={13} />, title: 'Insert Image', action: insertImage },
    ],
  ]

  return (
    <div className={`glass-input rounded-xl overflow-hidden flex flex-col ${className}`}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 flex-wrap"
        style={{ borderBottom: '1px solid var(--c-border)' }}
      >
        {toolbarGroups.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && <div className="w-px h-4 mx-1" style={{ background: 'var(--c-border)' }} />}
            {group.map((btn, bi) => (
              <ToolbarBtn key={bi} {...btn} />
            ))}
          </div>
        ))}
        {/* Font size quick picks */}
        <div className="w-px h-4 mx-1" style={{ background: 'var(--c-border)' }} />
        <select
          className="glass-input text-xs px-1.5 py-1 rounded-md t-main"
          onChange={(e) => exec('fontSize', e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Size</option>
          {[1,2,3,4,5,6].map((s) => (
            <option key={s} value={String(s)}>{s}</option>
          ))}
        </select>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className="flex-1 px-4 py-3 text-sm t-main outline-none leading-relaxed email-editor-content"
        style={{ minHeight, overflowY: 'auto' }}
      />

      <style>{`
        .email-editor-content:empty::before {
          content: attr(data-placeholder);
          color: var(--c-text-muted);
          pointer-events: none;
        }
        .email-editor-content a { color: #38bdf8; text-decoration: underline; }
        .email-editor-content pre { background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 0.375rem; font-size: 0.8em; }
        .email-body img { max-width: 100%; height: auto; }
        .email-body a { color: #38bdf8; }
        .email-body blockquote { border-left: 3px solid var(--c-border); padding-left: 1rem; color: var(--c-text-muted); margin: 0.5rem 0; }
      `}</style>
    </div>
  )
}
