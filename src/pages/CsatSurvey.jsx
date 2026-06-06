/**
 * CsatSurvey — public page (no auth required) accessible via /csat/:token
 *
 * Route: /csat/:token
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { BASE } from '../api/client'

const RATINGS = [
  { value: 5, label: 'Excellent', emoji: '😁', color: 'bg-green-500' },
  { value: 4, label: 'Good',      emoji: '😊', color: 'bg-lime-500' },
  { value: 3, label: 'OK',        emoji: '😐', color: 'bg-yellow-400' },
  { value: 2, label: 'Poor',      emoji: '😕', color: 'bg-orange-400' },
  { value: 1, label: 'Terrible',  emoji: '😡', color: 'bg-red-500' },
]

export default function CsatSurvey() {
  const { token } = useParams()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rating, setRating] = useState(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${BASE}/csat/${token}`)
        if (!res.ok) throw new Error('Survey not found or expired')
        const data = await res.json()
        setTicket(data)
        if (data.already_submitted) setSubmitted(true)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const handleSubmit = async () => {
    if (!rating) return
    setSubmitting(true)
    try {
      const res = await fetch(`${BASE}/csat/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment || null }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Submission failed')
      }
      setSubmitted(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading survey…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Survey Not Available</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Thank you for your feedback!</h2>
          <p className="text-gray-500">Your response has been recorded. We appreciate you taking the time.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">⭐</div>
          <h1 className="text-2xl font-bold text-gray-900">How did we do?</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Ticket: <strong className="text-indigo-600">{ticket?.ticket_display_id}</strong> — {ticket?.subject}
          </p>
        </div>

        {/* Rating buttons */}
        <div className="flex justify-center gap-3 mb-6">
          {RATINGS.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRating(r.value)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all
                ${rating === r.value
                  ? `${r.color} border-transparent text-white shadow-lg scale-105`
                  : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
            >
              <span className="text-2xl">{r.emoji}</span>
              <span className="text-xs font-medium">{r.label}</span>
            </button>
          ))}
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Any comments? (optional)
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Tell us more about your experience…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
        )}

        <button
          type="button"
          disabled={!rating || submitting}
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  )
}
