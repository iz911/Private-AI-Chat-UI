'use client';

import { useState } from 'react';

export default function SystemPromptPanel({
  systemPrompt,
  savedPrompts,
  onChange,
  onSaveNewPrompt,
  onClose,
}) {
  const [newPromptName, setNewPromptName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSelectPrompt = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;

    const selected = savedPrompts.find((p) => p.id === selectedId);
    if (selected) {
      onChange(selected.content);
    }
    // reset selection dropdown
    e.target.value = '';
  };

  const handleSavePrompt = async () => {
    if (!newPromptName.trim()) {
      alert('Please enter a name for the system prompt.');
      return;
    }
    if (!systemPrompt.trim()) {
      alert('Cannot save an empty system prompt.');
      return;
    }

    setSaving(true);
    try {
      await onSaveNewPrompt(newPromptName, systemPrompt);
      setNewPromptName('');
      alert('System prompt template saved successfully!');
    } catch (err) {
      console.error(err);
      alert(`Failed to save prompt: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="system-prompt-panel">
      <div className="panel-header">
        <h2>System Prompt</h2>
        <button className="icon-btn" onClick={onClose} title="Close panel">
          ✕
        </button>
      </div>

      <div className="panel-body">
        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Load Saved Template:
        </label>
        <select onChange={handleSelectPrompt} className="panel-select" defaultValue="">
          <option value="" disabled>-- Select a template --</option>
          {savedPrompts.map((prompt) => (
            <option key={prompt.id} value={prompt.id}>
              {prompt.name}
            </option>
          ))}
        </select>

        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '-8px' }}>
          Instruction Content:
        </label>
        <textarea
          className="prompt-textarea"
          value={systemPrompt}
          onChange={(e) => onChange(e.target.value)}
          placeholder="E.g., You are a strict academic reviewer. Evaluate my arguments for clarity, novelty, and rigor..."
        />

        <div className="save-prompt-box">
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Save Current as Template:
          </label>
          <input
            type="text"
            className="panel-input"
            value={newPromptName}
            onChange={(e) => setNewPromptName(e.target.value)}
            placeholder="Template name (e.g. Science Writer)"
          />
          <button
            className="btn-primary"
            onClick={handleSavePrompt}
            disabled={saving || !systemPrompt.trim() || !newPromptName.trim()}
          >
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
