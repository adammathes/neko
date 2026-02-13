import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
                            <Link to={`/feed/${feed._id}`} className="feed-title">
                                {feed.title || feed.url}
                            </Link>
                            {feed.category && <span className="feed-category">{feed.category}</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
