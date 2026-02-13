import { useState } from 'react';
import type { Item } from '../types';
import './FeedItem.css';

interface FeedItemProps {
    item: Item;
}

export default function FeedItem({ item: initialItem }: FeedItemProps) {
    const [item, setItem] = useState(initialItem);
    const [loading, setLoading] = useState(false);


    const toggleStar = () => {
        updateItem({ ...item, starred: !item.starred });
    };

    const updateItem = (newItem: Item) => {
        setLoading(true);
        // Optimistic update
        const previousItem = item;
        setItem(newItem);

        fetch(`/api/item/${newItem._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                _id: newItem._id,
                read: newItem.read,
                starred: newItem.starred,
            }),
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Failed to update item');
                }
                return res.json();
            })
            .then(() => {
                // Confirm with server response if needed, but for now we trust the optimistic update
                // or we could setItem(updated) if the server returns the full object
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error updating item:', err);
                // Revert on error
                setItem(previousItem);
                setLoading(false);
            });
    };

    return (
        <li className={`feed-item ${item.read ? 'read' : 'unread'} ${loading ? 'loading' : ''}`}>
            <div className="item-header">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="item-title">
                    {item.title || '(No Title)'}
                </a>
            </div>
            <div className="dateline">
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                    {new Date(item.publish_date).toLocaleDateString()}
                    {item.feed_title && ` - ${item.feed_title}`}
                </a>
                <div className="item-actions" style={{ display: 'inline-block', float: 'right' }}>
                    <button
                        onClick={toggleStar}
                        className={`action-btn ${item.starred ? 'is-starred' : 'is-unstarred'}`}
                        title={item.starred ? "Unstar" : "Star"}
                    >
                        {item.starred ? 'unstar' : 'star'}
                    </button>
                </div>
            </div>
            {item.description && (
                <div className="item-description" dangerouslySetInnerHTML={{ __html: item.description }} />
            )}
        </li>
    );
}
