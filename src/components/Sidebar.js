'use client';

import { useState } from 'react';

export default function Sidebar({
  conversations,
  activeId,
  savedPrompts,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onSelectPromptTemplate,
  isCollapsed,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const startEditing = (e, conv) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title || 'New Chat');
  };

  const handleSaveRename = (id) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      handleSaveRename(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };
  // Helper to format timestamps to relative time strings
  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (isNaN(date.getTime())) return '';
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button className="new-chat-btn" onClick={onNewChat} title="Start a brand new chat session">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Chat
      </button>

      <div className="conv-list">
        {conversations.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '16px', textAlign: 'center' }}>
            No conversations yet.
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conv-item ${conv.id === activeId ? 'active' : ''}`}
              onClick={() => onSelectConversation(conv.id)}
            >
              {editingId === conv.id ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleSaveRename(conv.id)}
                  onKeyDown={(e) => handleKeyDown(e, conv.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="conv-rename-input"
                  autoFocus
                />
              ) : (
                <>
                  <div className="conv-title" title={conv.title}>
                    {conv.title || 'New Chat'}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '6px' }}>
                    {formatTime(conv.updated_at)}
                  </span>
                  <button
                    className="conv-edit-btn"
                    onClick={(e) => startEditing(e, conv)}
                    title="Rename Chat"
                  >
                    ✎
                  </button>
                  <button
                    className="conv-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent selecting the chat when deleting
                      if (confirm('Delete this conversation permanently?')) {
                        onDeleteConversation(conv.id);
                      }
                    }}
                    title="Delete Chat"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div className="sidebar-section">
        <h3>Saved System Prompts</h3>
        <div className="sidebar-prompt-list">
          {savedPrompts.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '4px' }}>
              None saved yet.
            </div>
          ) : (
            savedPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="sidebar-prompt-item"
                onClick={() => onSelectPromptTemplate(prompt.content)}
                title={prompt.content}
              >
                {prompt.name}
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
