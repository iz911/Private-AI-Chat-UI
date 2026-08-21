'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import SystemPromptPanel from './SystemPromptPanel';
import SearchPanel from './SearchPanel';

export default function ChatApp() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [model, setModel] = useState('gemini-flash-latest');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);

  // Fetch conversations, prompts, and the backend's model list on initial load
  useEffect(() => {
    fetchConversations();
    fetchPrompts();
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (res.ok) {
        setAvailableModels(data.models || []);
        // On first load there's no conversation yet, so adopt the backend's
        // preferred model (important when the backend isn't Gemini).
        if (data.default && !activeConversation) {
          setModel(data.default);
        }
      }
    } catch (err) {
      console.error('Error fetching models:', err);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  const fetchPrompts = async () => {
    try {
      const res = await fetch('/api/prompts');
      const data = await res.json();
      if (res.ok) {
        setSavedPrompts(data.prompts || []);
      }
    } catch (err) {
      console.error('Error fetching saved prompts:', err);
    }
  };

  // Load conversation details and messages when selected
  const handleSelectConversation = async (id) => {
    setIsLoading(false);
    try {
      // 1. Fetch details of the conversation
      const convRes = await fetch(`/api/conversations/${id}`);
      const convData = await convRes.json();
      if (!convRes.ok) throw new Error(convData.error);

      const conv = convData.conversation;
      setActiveConversation(conv);
      setModel(conv.model || 'gemini-flash-latest');
      setSystemPrompt(conv.system_prompt || '');
      setPendingFiles([]);

      // 2. Fetch messages belonging to conversation
      const msgRes = await fetch(`/api/messages/${id}`);
      const msgData = await msgRes.json();
      if (!msgRes.ok) throw new Error(msgData.error);

      setMessages(msgData.messages || []);
    } catch (err) {
      console.error('Error loading conversation:', err);
      alert(`Could not load conversation: ${err.message}`);
    }
  };

  const handleNewChat = () => {
    setActiveConversation(null);
    setMessages([]);
    setModel('gemini-flash-latest');
    setSystemPrompt('');
    setPendingFiles([]);
  };

  const handleDeleteConversation = async (id) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversation && activeConversation.id === id) {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  };

  const handleModelChange = async (newModel) => {
    setModel(newModel);
    if (activeConversation) {
      try {
        const res = await fetch(`/api/conversations/${activeConversation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: newModel }),
        });
        if (res.ok) {
          const data = await res.json();
          setActiveConversation(data.conversation);
          // Refresh list to update model label in list if shown
          setConversations(prev =>
            prev.map(c => c.id === activeConversation.id ? data.conversation : c)
          );
        }
      } catch (err) {
        console.error('Error updating model in DB:', err);
      }
    }
  };

  const handleSystemPromptChange = async (newPrompt) => {
    setSystemPrompt(newPrompt);
    if (activeConversation) {
      try {
        const res = await fetch(`/api/conversations/${activeConversation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemPrompt: newPrompt }),
        });
        if (res.ok) {
          const data = await res.json();
          setActiveConversation(data.conversation);
        }
      } catch (err) {
        console.error('Error updating system prompt in DB:', err);
      }
    }
  };

  const handleSaveNewPrompt = async (name, content) => {
    const res = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    setSavedPrompts((prev) => [data.prompt, ...prev]);
    return data.prompt;
  };

  const handleUploadFile = (fileData) => {
    setPendingFiles((prev) => [...prev, fileData]);
  };

  const handleRemovePendingFile = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (text) => {
    setIsLoading(true);

    // Optimistically render User Message bubble
    const tempUserMsgId = Math.random().toString();
    const formattedUserMsg = {
      id: tempUserMsgId,
      role: 'user',
      content: pendingFiles.length > 0
        ? `${pendingFiles.map(f => `[FILE: ${f.name}]\n${f.extractedText}\n\n`).join('')}--- USER MESSAGE ---\n${text}`
        : text,
      files: pendingFiles.map(f => ({ name: f.name, mimeType: f.mimeType, size: f.size })),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, formattedUserMsg]);
    const filesToSend = [...pendingFiles];
    setPendingFiles([]); // clear chips

    // Setup an empty AI message to stream contents into
    const tempAiMsgId = 'ai-temp';
    const streamingAiMsg = {
      id: tempAiMsgId,
      role: 'model',
      content: '',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, streamingAiMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: activeConversation?.id || null,
          message: text,
          model,
          systemPrompt,
          files: filesToSend,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamDone = false;
      let buffer = '';
      let activeId = activeConversation?.id;

      while (!streamDone) {
        const { value, done: readerDone } = await reader.read();
        streamDone = readerDone;

        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Hold the last incomplete line
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              const jsonStr = line.trim().slice(6);
              try {
                const data = JSON.parse(jsonStr);

                if (data.type === 'meta') {
                  activeId = data.conversationId;
                  // If we didn't have an active conversation, it means one was just created.
                  if (!activeConversation) {
                    const newConv = {
                      id: activeId,
                      title: 'New Chat',
                      model,
                      system_prompt: systemPrompt,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    };
                    setActiveConversation(newConv);
                  }
                } else if (data.type === 'chunk' && data.text) {
                  // Append streamed text chunk to model message content
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === tempAiMsgId
                        ? { ...msg, content: msg.content + data.text }
                        : msg
                    )
                  );
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (parseErr) {
                // Ignore parsing errors of incomplete payloads
              }
            }
          }
        }
      }

      // Finalize messages by loading full history from the API to replace temporary IDs
      if (activeId) {
        const msgRes = await fetch(`/api/messages/${activeId}`);
        const msgData = await msgRes.json();
        if (msgRes.ok) {
          setMessages(msgData.messages || []);
        }
        // Refresh conversations list to update sidebar (title, timestamp)
        fetchConversations();

        // Also update activeConversation in state so it has the database state
        const convRes = await fetch(`/api/conversations/${activeId}`);
        const convData = await convRes.json();
        if (convRes.ok) {
          setActiveConversation(convData.conversation);
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      // Remove temp bubble and show alert
      setMessages((prev) => prev.filter((msg) => msg.id !== tempAiMsgId));
      alert(`Chat Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameConversation = async (id, newTitle) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? data.conversation : c))
        );
        if (activeConversation && activeConversation.id === id) {
          setActiveConversation(data.conversation);
        }
      }
    } catch (err) {
      console.error('Error renaming conversation:', err);
    }
  };

  const handleInjectSearchResults = (contextText) => {
    // Call send message directly with the search context
    handleSend(contextText);
  };

  return (
    <div className="app-container">
      <Sidebar
        conversations={conversations}
        activeId={activeConversation?.id}
        savedPrompts={savedPrompts}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onSelectPromptTemplate={(content) => handleSystemPromptChange(content)}
        isCollapsed={!showSidebar}
      />

      <ChatArea
        conversationId={activeConversation?.id}
        messages={messages}
        isLoading={isLoading}
        model={model}
        availableModels={availableModels}
        onModelChange={handleModelChange}
        onSend={handleSend}
        onToggleSystemPrompt={() => setShowSystemPrompt(!showSystemPrompt)}
        onToggleSearch={() => setShowSearch(!showSearch)}
        showSystemPrompt={showSystemPrompt}
        showSearch={showSearch}
        pendingFiles={pendingFiles}
        onUploadFile={handleUploadFile}
        onRemovePendingFile={handleRemovePendingFile}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        showSidebar={showSidebar}
      />

      {showSystemPrompt && (
        <SystemPromptPanel
          systemPrompt={systemPrompt}
          savedPrompts={savedPrompts}
          onChange={handleSystemPromptChange}
          onSaveNewPrompt={handleSaveNewPrompt}
          onClose={() => setShowSystemPrompt(false)}
        />
      )}

      {showSearch && (
        <SearchPanel
          onInject={handleInjectSearchResults}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}
