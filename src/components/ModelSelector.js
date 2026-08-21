'use client';

// Renders whatever models the active backend reports (see /api/models).
// `models` is an array of { id, label?, group? }. Gemini entries carry a `group`
// for <optgroup> headings; local models are usually a flat list.
export default function ModelSelector({ model, onChange, models = [] }) {
  const handleChange = (e) => onChange(e.target.value);

  // Fallback while the list is still loading (or a backend returned nothing):
  // keep the current value selectable so the control stays controlled.
  if (!models.length) {
    return (
      <select className="model-selector" value={model || ''} onChange={handleChange}>
        <option value={model || ''}>{model || 'Loading models…'}</option>
      </select>
    );
  }

  const ungrouped = models.filter((m) => !m.group);
  const grouped = models.filter((m) => m.group);
  const groupNames = [...new Set(grouped.map((m) => m.group))];

  return (
    <select className="model-selector" value={model || ''} onChange={handleChange}>
      {ungrouped.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label || m.id}
        </option>
      ))}
      {groupNames.map((name) => (
        <optgroup key={name} label={name}>
          {grouped
            .filter((m) => m.group === name)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.label || m.id}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
