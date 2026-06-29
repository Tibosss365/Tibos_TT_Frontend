// Helpers for rendering email-sourced rich text (ticket descriptions, etc.)
// safely and cleanly — email HTML often carries <style> blocks, MS-Office
// conditional comments, @font-face noise and an "external email" caution
// banner that must not leak into the app.

// External-email warning banners added by mail gateways — removed on render.
const CAUTION_RE = /this is an external email|caution[\s\S]{0,40}suspicious|external email and has a suspicious/i

/** Does this string contain HTML markup (tags or comments)? */
export function looksLikeHtml(s) {
  if (!s) return false
  return /<\/?[a-z][\s\S]*>/i.test(s) || /<!--/.test(s)
}

/**
 * Clean email HTML for display: strip unsafe/noise markup, remove the external
 * -email caution banner, and collapse big empty gaps — while keeping the
 * formatted structure (bold, lists, paragraphs, the reply trail).
 */
export function cleanEmailHtml(html) {
  if (!html) return ''
  let s = html
    .replace(/<!--[\s\S]*?-->/g, '')                 // HTML comments (MS junk)
    .replace(/<style[\s\S]*?<\/style>/gi, '')        // style blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')      // scripts (XSS)
    .replace(/<head[\s\S]*?<\/head>/gi, '')          // head
    .replace(/<\/?(html|body|meta|link|title)[^>]*>/gi, '') // doc wrappers
    .replace(/<\/?o:[^>]*>/gi, '')                   // MS Office <o:p> tags
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')          // on*="..." handlers
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')          // on*='...' handlers
    .replace(/\sclass\s*=\s*"Mso[^"]*"/gi, '')       // MsoNormal etc.

  // DOM-based cleanup (browser only) — caution banner + empty-gap collapse.
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(s, 'text/html')

      // 1) Remove the external-email caution banner: a small block that carries
      //    the warning text (kept short so we never nuke the whole message).
      doc.querySelectorAll('table, div, p, blockquote, td, tr').forEach((el) => {
        const t = (el.textContent || '').replace(/\s+/g, ' ').trim()
        if (t && t.length < 400 && CAUTION_RE.test(t)) el.remove()
      })

      // 2) Collapse big vertical gaps — drop blank paragraphs/divs (no text,
      //    no image) that only exist to add empty space.
      doc.querySelectorAll('p, div').forEach((el) => {
        if (el.querySelector('img')) return
        if (!el.textContent.replace(/ /g, ' ').trim()) el.remove()
      })

      s = doc.body.innerHTML
    } catch { /* fall back to the string-cleaned version */ }
  }

  // Collapse 3+ consecutive line breaks into one.
  s = s.replace(/(?:\s*<br\s*\/?>\s*){3,}/gi, '<br/><br/>')
  return s.trim()
}
