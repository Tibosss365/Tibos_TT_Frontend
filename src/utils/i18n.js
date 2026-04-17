/**
 * Lightweight i18n utility for the Ticketing Tool.
 *
 * useT()  – React hook; components re-render when language changes.
 * t(key)  – Plain function; use in callbacks, outside components.
 */
import { useAdminStore }         from '../stores/adminStore'
import { translations, LANGUAGES } from '../locales/translations'

/** React hook — use inside components. Returns a translate function. */
export function useT() {
  const lang = useAdminStore(s => s.systemSettings?.language || 'en')
  return function t(key) {
    return translations[lang]?.[key] ?? translations.en?.[key] ?? key
  }
}

/** Plain function — use outside React (event handlers, utilities, callbacks). */
export function t(key) {
  const lang = useAdminStore.getState().systemSettings?.language || 'en'
  return translations[lang]?.[key] ?? translations.en?.[key] ?? key
}

/** React hook — returns 'ltr' | 'rtl' for the active language. */
export function useTextDir() {
  const lang = useAdminStore(s => s.systemSettings?.language || 'en')
  return LANGUAGES.find(l => l.code === lang)?.dir || 'ltr'
}
