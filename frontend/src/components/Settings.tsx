import React, { useEffect, useState } from 'react';
import type { Feed } from '../types';
import './Settings.css';
import { apiFetch } from '../utils';

export default function Settings() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [importFile, setImportFile] = useState<File | null>(null);

  const fetchFeeds = () => {
    setLoading(true);
    apiFetch('/api/feed/')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch feeds');
        return res.json();
      })
      .then((data) => {
        setFeeds(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

  const handleAddFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl) return;

    setLoading(true);
    apiFetch('/api/feed/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newFeedUrl }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to add feed');
        return res.json();
      })
      .then(() => {
        setNewFeedUrl('');
        fetchFeeds();
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const handleDeleteFeed = (id: number) => {
    if (!globalThis.confirm('Are you sure you want to delete this feed?')) return;

    setLoading(true);
    apiFetch(`/api/feed/${id}`, {
      method: 'DELETE',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete feed');
        setFeeds(feeds.filter((f) => f._id !== id));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('format', 'opml');

    apiFetch('/api/import', {
      method: 'POST',
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to import feeds');
        return res.json();
      })
      .then(() => {
        setImportFile(null);
        fetchFeeds();
        alert('Import successful!');
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  return (
    <div className="settings-page">
      <h2>Settings</h2>

      <div className="add-feed-section">
        <h3>Add New Feed</h3>
        <form onSubmit={handleAddFeed} className="add-feed-form">
          <input
            type="url"
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            required
            className="feed-input"
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            Add Feed
          </button>
        </form>
      </div>

      <div className="import-export-section">
        <div className="import-section">
          <h3>Import Feeds (OPML)</h3>
          <form onSubmit={handleImport} className="import-form">
            <input
              type="file"
              accept=".opml,.xml,.txt"
              aria-label="Import Feeds"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="file-input"
              disabled={loading}
            />
            <button type="submit" disabled={!importFile || loading}>
              Import
            </button>
          </form>
        </div>

        <div className="export-section">
          <h3>Export Feeds</h3>
          <div className="export-buttons">
            <a href="/api/export/opml" className="export-btn">OPML</a>
            <a href="/api/export/text" className="export-btn">Text</a>
            <a href="/api/export/json" className="export-btn">JSON</a>
          </div>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="feed-list-section">
        <h3>Manage Feeds</h3>
        {loading && <p>Loading...</p>}
        <ul className="settings-feed-list">
          {feeds.map((feed) => (
            <li key={feed._id} className="settings-feed-item">
              <div className="feed-info">
                <span className="feed-title">{feed.title || '(No Title)'}</span>
                <span className="feed-url">{feed.url}</span>
              </div>
              <button
                onClick={() => handleDeleteFeed(feed._id)}
                className="delete-btn"
                disabled={loading}
                title="Delete Feed"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
