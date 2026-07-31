/**
 * CustomFieldsRenderer — renders a form or read-only view for custom fields.
 *
 * Props:
 *   fields        (CustomField[])  — custom field definitions from backend
 *   values        (object)         — { [field_id]: value }
 *   onChange      (fn)             — called with (fieldId, newValue) — omit for read-only
 *   readOnly      (bool)           — if true, renders display values instead of inputs
 */
export default function CustomFieldsRenderer({
  fields = [],
  values = {},
  onChange,
  readOnly = false,
}) {
  if (!fields.length) return null

  const handleChange = (fieldId, value) => {
    if (onChange) onChange(fieldId, value)
  }

  const renderInput = (field) => {
    const val = values[field.id] ?? (field.field_type === 'checkbox' ? false : '')

    if (readOnly) {
      if (field.field_type === 'checkbox') {
        return <span className="text-sm text-gray-700 dark:text-gray-300">{val ? '✅ Yes' : '—'}</span>
      }
      return <span className="text-sm text-gray-700 dark:text-gray-300">{val || '—'}</span>
    }

    switch (field.field_type) {
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!val}
              onChange={e => handleChange(field.id, e.target.checked)}
              className="h-4 w-4 text-indigo-600 rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{field.name}</span>
          </label>
        )

      case 'number':
        return (
          <input
            type="number"
            value={val}
            onChange={e => handleChange(field.id, e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={val ? String(val).slice(0, 10) : ''}
            onChange={e => handleChange(field.id, e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        )

      case 'dropdown':
        return (
          <select
            value={val}
            onChange={e => handleChange(field.id, e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">— Select —</option>
            {(field.options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )

      case 'url':
        return (
          <input
            type="url"
            value={val}
            onChange={e => handleChange(field.id, e.target.value)}
            placeholder="https://"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        )

      default: // text
        return (
          <input
            type="text"
            value={val}
            onChange={e => handleChange(field.id, e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        )
    }
  }

  return (
    <div className="space-y-4">
      {fields.map(field => (
        <div key={field.id}>
          {field.field_type !== 'checkbox' && (
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {field.name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          {renderInput(field)}
        </div>
      ))}
    </div>
  )
}
