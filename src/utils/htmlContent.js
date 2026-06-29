// Helpers for rendering email-sourced rich text (ticket descriptions, etc.)
// safely and cleanly — email HTML often carries <style> blocks, MS-Office
// conditional comments and @font-face noise that must not leak into the app.

/** Does this string contain HTML markup (tags or comments)? */
export function looksLikeHtml(s) {
  if (!s) return false
  return /<\/?[a-z][\s\S]*>/i.test(s) || /<!--/.test(s)
}

/**
 * Strip the parts of email HTML that shouldn't render or could be unsafe:
 * comments (incl. the MS-Office @font-face block), <style>/<script>/<head>,
 * and inline event handlers. The visible, formatted content is kept.
 */
export function cleanEmailHtml(html) {
  if (!html) return ''
  return html
    .replace(/<!--[\s\S]*?-->/g, '')                 // HTML comments (MS junk)
    .replace(/<style[\s\S]*?<\/style>/gi, '')        // style blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')      // scripts (XSS)
    .replace(/<head[\s\S]*?<\/head>/gi, '')          // head
    .replace(/<\/?(html|body|meta|link|title)[^>]*>/gi, '') // doc wrappers
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')          // on*="..." handlers
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')          // on*='...' handlers
    .replace(/\sclass\s*=\s*"Mso[^"]*"/gi, '')       // MsoNormal etc.
    .trim()
}
