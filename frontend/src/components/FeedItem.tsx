import { useState, useEffect } from 'react';
import type { Item } from '../types';
import './FeedItem.css';

import { apiFetch } from '../utils';

interface FeedItemProps {
  item: Item;
}

export default function FeedItem({ item: initialItem }: FeedItemProps) {
  const [item, setItem] = useState(initialItem);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setItem(initialItem);
  }, [initialItem]);

  const toggleStar = () => {
    updateItem({ ...item, starred: !item.starred });
  };

  const updateItem = (newItem: Item) => {
    setLoading(true);
    // Optimistic update
    const previousItem = item;
    setItem(newItem);

    apiFetch(`/api/item/${newItem._id}`, {
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

  const loadFullContent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    apiFetch(`/api/item/${item._id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch full content');
        return res.json();
      })
      .then((data) => {
        setItem({ ...item, ...data });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching full content:', err);
        setLoading(false);
      });
  };

  return (
    <li className={`feed-item ${item.read ? 'read' : 'unread'} ${loading ? 'loading' : ''}`}>
      <div className="item-header">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="item-title">
          {item.title || '(No Title)'}
        </a>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleStar();
          }}
          className={`star-btn ${item.starred ? 'is-starred' : 'is-unstarred'}`}
          title={item.starred ? 'Unstar' : 'Star'}
        >
          ★
        </button>
      </div>
      <div className="dateline">
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          {new Date(item.publish_date).toLocaleDateString()}
          {item.feed_title && ` - ${item.feed_title}`}
        </a>
        <div className="item-actions" style={{ display: 'inline-block', float: 'right' }}>
          {!item.full_content && (
            <button onClick={loadFullContent} className="scrape-btn" title="Load Full Content">
              text
            </button>
          )}
        </div>
      </div>
      {(item.full_content || item.description) && (
        <div
          className="item-description"
          dangerouslySetInnerHTML={{ __html: item.full_content || item.description }}
        />
      )}
    </li>
  );
}
