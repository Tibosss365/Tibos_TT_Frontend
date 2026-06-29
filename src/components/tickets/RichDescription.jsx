import { useRef, useEffect } from 'react'
import { cleanEmailHtml } from '../../utils/htmlContent'

// Decode quoted-printable (common in .eml bodies): soft line-breaks + =XX hex.
function qpDecode(s) {
  return s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

// Best-effort extraction of an email body from a dropped .eml / .txt / .html file.
function extractEmailBody(raw) {
  let text = raw
  if (/content-transfer-encoding:\s*quoted-printable/i.test(raw)) text = qpDecode(raw)
  const htmlMatch = text.match(/<html[\s\S]*?<\/html>/i) || text.match(/<body[\s\S]*?<\/body>/i)
  if (htmlMatch) return cleanEmailHtml(htmlMatch[0])
  // Plain text: drop the MIME headers (up to first blank line) and keep line breaks.
  const idx = text.search(/\r?\n\r?\n/)
  const body = idx >= 0 ? text.slice(idx) : text
  return body.split(/\r?\n/).map(l => (l.trim() ? l.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '')).join('<br>')
}

/**
 * Rich, paste-aware description field. Paste an email (keeps formatting), or
 * drop a .eml/.txt/.html file — the conversation trail is preserved as HTML.
 * Plain typing works normally. Emits cleaned HTML (or '' when empty).
 */
export function RichDescription({ value, onChange, placeholder = '', className = '', invalid = false }) {
  const ref = useRef(null)

  // Sync external value (template fill, file drop) without disturbing the caret
  // while typing — only writes when the value genuinely differs.
  useEffect(() => {
    const el = ref.current
    if (el && (value || '') !== el.innerHTML) el.innerHTML = value || ''
  }, [value])

  const emit = () => {
    const el = ref.current
    if (!el) return
    const text = (el.textContent || '').trim()
    onChange(text ? el.innerHTML : '')
  }

  const handlePaste = (e) => {
    const html = e.clipboardData?.getData('text/html')
    if (html) {
      e.preventDefault()
      const clean = cleanEmailHtml(html)
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand('insertHTML', false, clean)
      emit()
    } else {
      // plain text — let the browser insert, then capture
      setTimeout(emit, 0)
    }
  }

  const handleDrop = async (e) => {
    const file = e.dataTransfer?.files?.[0]
    if (!file) return
    if (/\.(eml|txt|html?)$/i.test(file.name)) {
      e.preventDefault()
      try {
        const body = extractEmailBody(await file.text())
        if (ref.current) { ref.current.innerHTML = body; emit() }
      } catch { /* ignore unreadable files */ }
    }
    // .msg (Outlook binary) can't be parsed in the browser — user should paste instead.
  }

  return (
    <div
      ref={ref}
      contentEditable
      role="textbox"
      aria-multiline="true"
      onInput={emit}
      onBlur={emit}
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      data-placeholder={placeholder}
      suppressContentEditableWarning
      className={`email-body rt-editable glass-input w-full text-sm leading-relaxed overflow-y-auto ${invalid ? 'border-rose-500' : ''} ${className}`}
      style={{ minHeight: '140px', maxHeight: '360px' }}
    />
  )
}
