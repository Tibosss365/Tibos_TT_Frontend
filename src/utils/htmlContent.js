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
  // Cleaning a long email (50k+ characters of nested markup) is expensive and the
  // modal re-renders on every keystroke, so remember results per input string.
  const hit = cleanCache.get(html)
  if (hit !== undefined) return hit
  const out = cleanEmailHtmlUncached(html)
  if (cleanCache.size >= CLEAN_CACHE_MAX) cleanCache.delete(cleanCache.keys().next().value)
  cleanCache.set(html, out)
  return out
}

const cleanCache = new Map()
const CLEAN_CACHE_MAX = 80

function cleanEmailHtmlUncached(html) {
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
      //    Most mails have no banner, so test the whole text once first; only then
      //    look for the small element that carries it (and never read the text of
      //    big wrappers — that made long mails slow).
      if (CAUTION_RE.test((doc.body.textContent || '').replace(/\s+/g, ' '))) {
        doc.querySelectorAll('table, div, p, blockquote, td, tr').forEach((el) => {
          if (el.getElementsByTagName('*').length > 400) return   // far too big to be a banner
          const t = (el.textContent || '').replace(/\s+/g, ' ').trim()
          if (t && t.length < 400 && CAUTION_RE.test(t)) el.remove()
        })
      }

      // 2) Collapse big vertical gaps — drop blank paragraphs/divs (no text,
      //    no image) that only exist to add empty space. One bottom-up pass.
      const prune = (node) => {
        if (node.nodeType === 3) return /\S/.test(node.nodeValue || '')
        if (node.nodeType !== 1) return false
        let has = node.tagName === 'IMG'
        for (const child of Array.from(node.childNodes)) if (prune(child)) has = true
        if (!has && (node.tagName === 'P' || node.tagName === 'DIV')) node.remove()
        return has
      }
      Array.from(doc.body.childNodes).forEach(prune)

      s = doc.body.innerHTML
    } catch { /* fall back to the string-cleaned version */ }
  }

  // Collapse 3+ consecutive line breaks into one.
  s = s.replace(/(?:\s*<br\s*\/?>\s*){3,}/gi, '<br/><br/>')
  return s.trim()
}

/**
 * Convert email HTML to clean, readable plain text — tags stripped, entities
 * decoded, block elements turned into line breaks. Used for the edit textarea
 * so agents edit readable text instead of raw markup.
 */
export function htmlToText(html) {
  if (!html) return ''
  if (!looksLikeHtml(html)) return html

  if (typeof DOMParser === 'undefined') {
    // Server/no-DOM fallback: crude tag strip + entity decode.
    return html
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ').replace(/&quot;/gi, '"').replace(/&#39;/g, "'")
      .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&')
      .replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()
  }

  const doc = new DOMParser().parseFromString(cleanEmailHtml(html), 'text/html')
  doc.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
  doc.querySelectorAll('p, div, tr, li, h1, h2, h3, h4, h5, h6')
     .forEach(el => el.append('\n'))
  const text = doc.body.textContent || ''
  return text.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()
}

// ── Quoted reply trail ───────────────────────────────────────────────────────
// Every reply carries the whole earlier conversation underneath it, so showing
// each email in full repeats the same history over and over (and makes long
// threads slow and hard to scroll). splitQuoted() returns just the part the
// sender actually wrote, or null when there is no separable quote.

const QUOTE_SELECTORS = [
  '#appendonsend',                              // Outlook on the web / new Outlook
  '#divRplyFwdMsg',                             // Outlook: "From: / Sent: / To:" header block
  '#OLK_SRC_BODY_SECTION',                      // Outlook for Mac
  '.gmail_quote', '.gmail_extra',               // Gmail
  '.yahoo_quoted',                              // Yahoo
  '[id^="mail-editor-reference-message-container"]', // Outlook mobile
  'blockquote[type="cite"]',                    // Apple Mail and others
].join(', ')

const ON_WROTE_RE = /^\s*On\s.{5,300}?\swrote:\s*$/i
const ORIGINAL_MSG_RE = /^\s*-{2,}\s*Original Message\s*-{2,}\s*$/i
const NO_DOM_SPLIT = new Map()

const textOf = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim()

function findQuoteStart(body) {
  const candidates = []
  const bySelector = body.querySelector(QUOTE_SELECTORS)
  if (bySelector) candidates.push(bySelector)

  // Plain "On Tue, 5 Nov 2026 at 10:15 Jane <j@x.com> wrote:" and "-----Original Message-----"
  // lines, and Outlook desktop's "From: … Sent: … To: … Subject: …" header.
  const blocks = body.querySelectorAll('p, div, span, b, td, font, a')
  for (const el of blocks) {
    if (el.getElementsByTagName('*').length > 40) continue
    const t = textOf(el)
    if (!t || t.length > 400) continue
    if (ON_WROTE_RE.test(t) || ORIGINAL_MSG_RE.test(t)) { candidates.push(el); break }
    if (/^From:\s/i.test(t) && /\sSent:\s/i.test(t) && /\s(To|Subject):\s/i.test(t) && t.length < 600) { candidates.push(el); break }
  }
  if (!candidates.length) return null
  // the earliest one in the document
  return candidates.reduce((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? a : b))
}

/**
 * @param {string} cleanHtml  output of cleanEmailHtml()
 * @returns {string|null}     the sender's own part, or null if nothing to fold away
 */
export function splitQuoted(cleanHtml) {
  if (!cleanHtml || typeof DOMParser === 'undefined') return null
  if (NO_DOM_SPLIT.has(cleanHtml)) return NO_DOM_SPLIT.get(cleanHtml)
  let result = null
  try {
    const doc = new DOMParser().parseFromString(cleanHtml, 'text/html')
    const body = doc.body
    const marker = findQuoteStart(body)
    if (marker) {
      // drop the marker's own divider line, everything after it, at every nesting level
      const prev = marker.previousElementSibling
      if (prev && prev.tagName === 'HR') prev.remove()
      let node = marker
      while (node && node !== body) {
        while (node.nextSibling) node.parentNode.removeChild(node.nextSibling)
        node = node.parentNode
      }
      marker.remove()
      const hasOwnContent = /\S/.test(body.textContent || '') || body.querySelector('img')
      const fresh = body.innerHTML.trim()
      if (hasOwnContent && fresh.length < cleanHtml.length) result = fresh
    }
  } catch { result = null }
  if (NO_DOM_SPLIT.size >= 80) NO_DOM_SPLIT.delete(NO_DOM_SPLIT.keys().next().value)
  NO_DOM_SPLIT.set(cleanHtml, result)
  return result
}
