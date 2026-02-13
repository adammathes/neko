import { useEffect, useState } from 'react';
import type { Feed } from '../types';
import './FeedList.css';

export default function FeedList() {
    const [feeds, setFeeds] = useState<Feed[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/feed/')
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Failed to fetch feeds');
                }
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
    }, []);

    if (loading) return <div className="feed-list-loading">Loading feeds...</div>;
    if (error) return <div className="feed-list-error">Error: {error}</div>;

    return (
        <div className="feed-list">
            <h2>Feeds</h2>
            {feeds.length === 0 ? (
                <p>No feeds found.</p>
            ) : (
                <ul className="feed-list-items">
                    {feeds.map((feed) => (
                        <li key={feed._id} className="feed-item">
                            <a href={feed.web_url} target="_blank" rel="noopener noreferrer" className="feed-title">
                                {feed.title || feed.url}
                            </a>
                            {feed.category && <span className="feed-category">{feed.category}</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
