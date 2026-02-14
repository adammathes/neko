import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Feed, Category } from '../types';
import './FeedList.css';

export default function FeedList() {
    const [feeds, setFeeds] = useState<Feed[]>([]);
    const [tags, setTags] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    useEffect(() => {
        Promise.all([
            fetch('/api/feed/').then(res => {
                if (!res.ok) throw new Error('Failed to fetch feeds');
                return res.json();
            }),
            fetch('/api/tag').then(res => {
                if (!res.ok) throw new Error('Failed to fetch tags');
                return res.json();
            })
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

    return (
        <div className="feed-list">
            <div className="search-section">
                <form onSubmit={handleSearch} className="search-form">
                    <input
                        type="search"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </form>
            </div>
            <div className="filter-section">
                <ul className="filter-list">
                    <li><Link to="/?filter=unread">Unread</Link></li>
                    <li><Link to="/?filter=all">All</Link></li>
                    <li><Link to="/?filter=starred">Starred</Link></li>
                </ul>
            </div>
            <div className="feed-section">
                <h2>Feeds</h2>
                {feeds.length === 0 ? (
                    <p>No feeds found.</p>
                ) : (
                    <ul className="feed-list-items">
                        {feeds.map((feed) => (
                            <li key={feed._id} className="sidebar-feed-item">
                                <Link to={`/feed/${feed._id}`} className="feed-title">
                                    {feed.title || feed.url}
                                </Link>
                                {feed.category && <span className="feed-category">{feed.category}</span>}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {tags && tags.length > 0 && (
                <div className="tag-section">
                    <h2>Tags</h2>
                    <ul className="tag-list-items">
                        {tags.map((tag) => (
                            <li key={tag.title} className="tag-item">
                                <Link to={`/tag/${encodeURIComponent(tag.title)}`} className="tag-link">
                                    {tag.title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
