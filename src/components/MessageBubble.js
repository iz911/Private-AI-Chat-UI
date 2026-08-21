'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, memo } from 'react';

// Helper to copy code to clipboard (declared at module level to prevent re-creation on renders)
const CopyButton = ({ text }) => {
  const [copiedInner, setCopiedInner] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedInner(true);
      setTimeout(() => setCopiedInner(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };
  return (
    <button
      onClick={handleCopy}
      style={{
        position: 'absolute',
        top: '4px',
        right: '4px',
        backgroundColor: '#27272a',
        color: '#a1a1aa',
        border: '1px solid #3f3f46',
        borderRadius: '4px',
        fontSize: '0.75rem',
        padding: '2px 6px',
        cursor: 'pointer',
        zIndex: 1,
      }}
    >
      {copiedInner ? 'Copied!' : 'Copy'}
    </button>
  );
};

const MessageBubble = memo(function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  // Process user message content to hide massive extracted file text.
  // In the database, files are prepended as: "[FILE: name]\n<text>\n\n--- USER MESSAGE ---\nactual message"
  let displayContent = message.content;
  if (isUser) {
    const parts = displayContent.split('--- USER MESSAGE ---\n');
    if (parts.length > 1) {
      displayContent = parts[parts.length - 1];
    }
  }

  const handleCopyBubbleText = async () => {
    try {
      await navigator.clipboard.writeText(displayContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className={`message-row ${isUser ? 'user' : 'model'}`}>
      <div className="message-bubble">
        {/* Copy Bubble Button */}
        <button
          className="bubble-copy-btn"
          onClick={handleCopyBubbleText}
          title="Copy message content"
        >
          {copied ? (
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
        {/* Render file chips for user attachments */}
        {isUser && message.files && message.files.length > 0 && (
          <div className="pending-files-row" style={{ marginBottom: '8px' }}>
            {message.files.map((file, idx) => (
              <div key={idx} className="message-file-chip" style={{ margin: 0 }}>
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>{file.name}</span>
              </div>
            ))}
          </div>
        )}

        {isUser ? (
          // For user messages, preserve whitespace and linebreaks, keep formatting simple
          <div style={{ whiteSpace: 'pre-wrap' }}>{displayContent}</div>
        ) : (
          // For model messages, render markdown with tables, lists, code highlighting support
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre: ({ children, ...props }) => {
                // Extract inner text of code block for copy button
                let codeText = '';
                try {
                  codeText = children?.props?.children || '';
                } catch (e) {}

                return (
                  <pre style={{ position: 'relative' }} {...props}>
                    {codeText && <CopyButton text={codeText} />}
                    {children}
                  </pre>
                );
              },
            }}
          >
            {displayContent}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
});

export default MessageBubble;
