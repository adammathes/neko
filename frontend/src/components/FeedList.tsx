import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation, useParams } from 'react-router-dom';
import type { Feed, Category } from '../types';
import './FeedList.css';
import { apiFetch } from '../utils';

export default function FeedList({
  theme,
  setTheme,
  setSidebarVisible,
}: {
  theme: string;
  setTheme: (t: string) => void;
  setSidebarVisible: (visible: boolean) => void;
}) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [tags, setTags] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedsExpanded, setFeedsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { feedId, tagName } = useParams();

  const currentFilter =
    searchParams.get('filter') ||
    (location.pathname === '/' && !feedId && !tagName ? 'unread' : '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const toggleFeeds = () => {
    setFeedsExpanded(!feedsExpanded);
  };

  useEffect(() => {
    Promise.all([
      apiFetch('/api/feed/').then((res) => {
        if (!res.ok) throw new Error('Failed to fetch feeds');
        return res.json();
      }),
      apiFetch('/api/tag').then((res) => {
        if (!res.ok) throw new Error('Failed to fetch tags');
        return res.json();
      }),
    ])
      .then(([feedsData, tagsData]) => {
        setFeeds(feedsData);
        setTags(tagsData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="feed-list-loading">Loading feeds...</div>;
  if (error) return <div className="feed-list-error">Error: {error}</div>;

  const handleLogout = () => {
    apiFetch('/api/logout', { method: 'POST' }).then(() => (window.location.href = '/v2/login'));
  };

  return (
    <div className="feed-list">
      <h1 className="logo" onClick={() => setSidebarVisible(false)}>
        🐱
      </h1>

      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="search"
            placeholder="search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </form>
      </div>

      <div className="filter-section">
        <ul className="filter-list">
          <li className="unread_filter">
            <Link to="/?filter=unread" className={currentFilter === 'unread' ? 'active' : ''}>
              unread
            </Link>
          </li>
          <li className="all_filter">
            <Link to="/?filter=all" className={currentFilter === 'all' ? 'active' : ''}>
              all
            </Link>
          </li>
          <li className="starred_filter">
            <Link to="/?filter=starred" className={currentFilter === 'starred' ? 'active' : ''}>
              starred
            </Link>
          </li>
        </ul>
      </div>

      <div className="tag-section">
        <h4 onClick={() => { }} className="section-header">
          Tags
        </h4>
        <ul className="tag-list-items">
          {tags.map((tag) => (
            <li key={tag.title} className="tag-item">
              <Link
                to={`/tag/${encodeURIComponent(tag.title)}`}
                className={`tag-link ${tagName === tag.title ? 'active' : ''}`}
              >
                {tag.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="feed-section">
        <h4 onClick={toggleFeeds} className="section-header">
          Feeds
        </h4>
        {feedsExpanded &&
          (feeds.length === 0 ? (
            <p>No feeds found.</p>
          ) : (
            <ul className="feed-list-items">
              {feeds.map((feed) => (
                <li key={feed._id} className="sidebar-feed-item">
                  <Link
                    to={`/feed/${feed._id}`}
                    className={`feed-title ${feedId === String(feed._id) ? 'active' : ''}`}
                  >
                    {feed.title || feed.url}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
      </div>

      <div className="nav-section">
        <ul className="nav-list">
          <li>
            <Link to="/settings" className="nav-link">
              settings
            </Link>
          </li>
          <li>
            <button onClick={handleLogout} className="logout-link">
              logout
            </button>
          </li>
        </ul>
      </div>

      <div className="theme-section">
        <div className="theme-selector">
          <button
            onClick={() => setTheme('light')}
            className={theme === 'light' ? 'active' : ''}
            title="Light Theme"
          >
            ☀️
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={theme === 'dark' ? 'active' : ''}
            title="Dark Theme"
          >
            🌙
          </button>
        </div>
      </div>
    </div>
  );
}
