'use client';

import { useState } from 'react';

export default function SearchPanel({ onInject, onClose }) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('search'); // 'search' | 'news' | 'scholar'
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          type: searchType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.results);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during search');
    } finally {
      setSearching(false);
    }
  };

  const handleInjectAll = () => {
    if (!results) return;

    let formattedContext = `Here are the Google ${searchType === 'scholar' ? 'Scholar' : searchType === 'news' ? 'News' : 'Web'} search results for "${query}":\n\n`;

    const items = results.organic || results.news || results.scholar || [];

    if (items.length === 0) {
      formattedContext += `No results found.`;
    } else {
      items.forEach((item, idx) => {
        const title = item.title || 'No Title';
        const link = item.link || '#';
        const snippet = item.snippet || item.publicationInfo || 'No Description';
        formattedContext += `${idx + 1}. [${title}](${link})\n   Snippet: ${snippet}\n\n`;
      });
    }

    formattedContext += `\nBased on the search results above, please synthesize this information to answer my research query or provide context for our discussion.`;

    onInject(formattedContext);
    onClose();
  };

  // Extract result items based on structure returned by Serper
  const getResultItems = () => {
    if (!results) return [];
    if (searchType === 'news') return results.news || [];
    // Scholar or Web standard search
    return results.organic || results.scholar || [];
  };

  const resultItems = getResultItems();

  return (
    <div className="search-panel">
      <div className="search-container">
        <div className="panel-header">
          <h2>Google Web Search (Serper API)</h2>
          <button className="icon-btn" onClick={onClose} title="Close search panel">
            ✕
          </button>
        </div>

        <form onSubmit={handleSearch} className="search-input-row">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="search-type-selector"
          >
            <option value="search">Web Search</option>
            <option value="news">News Search</option>
            <option value="scholar">Scholar Search</option>
          </select>
          <input
            type="text"
            className="search-bar"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type query to crawl Google..."
            autoFocus
          />
          <button type="submit" className="btn-primary" disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div className="search-results-list">
          {searching && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}

          {error && <div style={{ color: '#ef4444', padding: '10px' }}>Error: {error}</div>}

          {!searching && !error && results && resultItems.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', padding: '20px', textAlign: 'center' }}>
              No results found.
            </div>
          )}

          {!searching && !error && results && resultItems.length > 0 && (
            resultItems.map((item, idx) => (
              <div key={idx} className="search-result-item">
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
                {item.source && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                    ({item.source} - {item.date})
                  </span>
                )}
                {item.publicationInfo && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {item.publicationInfo}
                  </div>
                )}
                <div className="search-result-snippet">
                  {item.snippet}
                </div>
              </div>
            ))
          )}
        </div>

        {results && resultItems.length > 0 && (
          <div className="search-actions">
            <button className="btn-primary" onClick={handleInjectAll}>
              Inject Results into Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
