import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Item } from '../types';
import FeedItem from './FeedItem';
import './FeedItems.css';

export default function FeedItems() {
    const { feedId, tagName } = useParams<{ feedId: string; tagName: string }>();
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');

        let url = '/api/stream';
        if (feedId) {
            url = `/api/stream?feed_id=${feedId}`;
        } else if (tagName) {
            url = `/api/stream?tag=${encodeURIComponent(tagName)}`;
        }

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
    }, [feedId, tagName]);

    if (loading) return <div className="feed-items-loading">Loading items...</div>;
    if (error) return <div className="feed-items-error">Error: {error}</div>;

    return (
        <div className="feed-items">
            <h2>{tagName ? `Tag: ${tagName}` : 'Items'}</h2>
            {items.length === 0 ? (
                <p>No items found.</p>
            ) : (
                <ul className="item-list">
                    {items.map((item) => (
                        <FeedItem key={item._id} item={item} />
                    ))}
                </ul>
            )}
        </div>
    );
}
