'use client';

import { useRef, useEffect, useState } from 'react';
import ModelSelector from './ModelSelector';
import FileUpload from './FileUpload';
import MessageBubble from './MessageBubble';

const COMMANDS = [
  { name: '/search', description: 'Search Google Web results' },
  { name: '/news', description: 'Search Google News articles' },
  { name: '/scholar', description: 'Search Google Scholar academic papers' },
];

export default function ChatArea({
  conversationId,
  messages,
  isLoading,
  model,
  availableModels,
  onModelChange,
  onSend,
  onToggleSystemPrompt,
  onToggleSearch,
  showSystemPrompt,
  showSearch,
  pendingFiles,
  onUploadFile,
  onRemovePendingFile,
  onToggleSidebar,
  showSidebar,
}) {
  const [input, setInput] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const showDropdown = input.startsWith('/') && !input.includes(' ');
  const filteredCommands = COMMANDS.filter((cmd) =>
    cmd.name.startsWith(input.toLowerCase())
  );

  // Reset selected command index if input changes
  useEffect(() => {
    setSelectedCommandIndex(0);
  }, [input]);

  // Auto-scroll to bottom of chat when messages array updates
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle textarea autosizing
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSelectCommand = (cmdName) => {
    setInput(cmdName + ' ');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!input.trim() && pendingFiles.length === 0) return;
    if (isLoading) return;

    onSend(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (showDropdown && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectCommand(filteredCommands[selectedCommandIndex].name);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setInput('');
        return;
      }
    }

    // Submit on Enter key press without Shift key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="chat-area">
      {/* Top Bar Navigation */}
      <header className="top-bar">
        <div className="top-bar-left">
          <button
            className="icon-btn sidebar-toggle-btn"
            onClick={onToggleSidebar}
            title={showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
            style={{ marginRight: '4px' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
          <ModelSelector model={model} onChange={onModelChange} models={availableModels} />
        </div>
        <div className="top-bar-right">
          {conversationId && messages.length > 0 && (
            <a
              href={`/api/export/${conversationId}`}
              download
              className="icon-btn"
              title="Export Conversation as Markdown (.md)"
              style={{ textDecoration: 'none' }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
          )}
          <button
            className={`icon-btn ${showSearch ? 'active' : ''}`}
            onClick={onToggleSearch}
            title="Google Web Search"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <button
            className={`icon-btn ${showSystemPrompt ? 'active' : ''}`}
            onClick={onToggleSystemPrompt}
            title="Toggle System Prompt Panel"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Messages Window */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat-state">
            <h1>Private AI Chat</h1>
            <p>Your conversations stay private — on your machine, with the model you choose.</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Select a model, modify the system prompt, or upload documents to get started.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}

        {/* Streaming/Loading State Indicator */}
        {isLoading && (
          <div className="message-row model">
            <div className="message-bubble">
              <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form Panel */}
      <div className="input-panel">
        <form onSubmit={handleSubmit} className="input-container">
          {/* Slash Commands Dropdown */}
          {showDropdown && filteredCommands.length > 0 && (
            <div className="command-dropdown">
              {filteredCommands.map((cmd, idx) => (
                <div
                  key={cmd.name}
                  className={`command-item ${idx === selectedCommandIndex ? 'selected' : ''}`}
                  onClick={() => handleSelectCommand(cmd.name)}
                >
                  <span className="command-name">{cmd.name}</span>
                  <span className="command-desc">{cmd.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* File attachment chips in input box */}
          {pendingFiles.length > 0 && (
            <div className="pending-files-row">
              {pendingFiles.map((file, index) => (
                <div key={index} className="pending-file-chip">
                  <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>{file.name}</span>
                  <button
                    type="button"
                    className="pending-file-remove"
                    onClick={() => onRemovePendingFile(index)}
                    title="Remove file attachment"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="input-row">
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type message here..."
              rows={1}
              disabled={isLoading}
            />

            <div className="input-actions">
              <FileUpload onUpload={onUploadFile} />
              <button
                type="submit"
                className="icon-btn"
                disabled={(!input.trim() && pendingFiles.length === 0) || isLoading}
                title="Send Message"
                style={{
                  backgroundColor: input.trim() || pendingFiles.length > 0 ? 'var(--accent-primary)' : 'transparent',
                  color: input.trim() || pendingFiles.length > 0 ? '#ffffff' : 'var(--text-secondary)',
                  borderColor: input.trim() || pendingFiles.length > 0 ? 'var(--accent-primary)' : 'var(--border-color)',
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
