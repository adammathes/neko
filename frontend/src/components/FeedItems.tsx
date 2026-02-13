import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Item } from '../types';
import './FeedItems.css';

export default function FeedItems() {
    const { feedId } = useParams<{ feedId: string }>();
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');

        const url = feedId
            ? `/api/stream?feed_id=${feedId}`
            : '/api/stream'; // Default or "all" view? For now let's assume we need a feedId or handle "all" logic later

        fetch(url)
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Failed to fetch items');
                }
                return res.json();
            })
            .then((data) => {
                setItems(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [feedId]);

    if (loading) return <div className="feed-items-loading">Loading items...</div>;
    if (error) return <div className="feed-items-error">Error: {error}</div>;

    return (
        <div className="feed-items">
            <h2>Items</h2>
            {/* TODO: Add Feed Title here if possible, maybe pass from location state or fetch feed details */}
            {items.length === 0 ? (
                <p>No items found.</p>
            ) : (
                <ul className="item-list">
                    {items.map((item) => (
                        <li key={item._id} className={`item ${item.read ? 'read' : 'unread'}`}>
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="item-title">
                                {item.title || '(No Title)'}
                            </a>
                            <div className="item-meta">
                                <span className="item-date">{new Date(item.publish_date).toLocaleDateString()}</span>
                                {item.feed_title && <span className="item-feed"> - {item.feed_title}</span>}
                            </div>
                            {item.description && (
                                <div className="item-description" dangerouslySetInnerHTML={{ __html: item.description }} />
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
