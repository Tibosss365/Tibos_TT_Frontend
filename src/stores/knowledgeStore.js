import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useKnowledgeStore = create(
  persist(
    (set) => ({
      articles: [],

      addArticle: (data) => {
        const now = new Date().toISOString()
        const article = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
        set(s => ({ articles: [article, ...s.articles] }))
        return article
      },

      updateArticle: (id, changes) => {
        set(s => ({
          articles: s.articles.map(a =>
            a.id === id ? { ...a, ...changes, updatedAt: new Date().toISOString() } : a
          ),
        }))
      },

      deleteArticle: (id) => {
        set(s => ({ articles: s.articles.filter(a => a.id !== id) }))
      },
    }),
    { name: 'helpdesk-knowledge' }
  )
)
