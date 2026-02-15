import { useState, memo } from 'react';
import type { Item } from '../types';
import './FeedItem.css';

import { apiFetch } from '../utils';

interface FeedItemProps {
  item: Item;
  onToggleStar?: (item: Item) => void;
  onUpdate?: (item: Item) => void;
}

const FeedItem = memo(function FeedItem({ item, onToggleStar, onUpdate }: FeedItemProps) {
  const [loading, setLoading] = useState(false);

  // We rely on props.item for data.
  // If we fetch full content, we notify the parent via onUpdate.

  const handleToggleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleStar) {
      onToggleStar(item);
    } else {
      // Fallback if no handler passed (backward compat or isolated usage)
      // But really we should rely on parent.
      // For now, let's keep the optimistic local update logic if we were standalone,
      // but since we are optimizing, we assume parent handles it.
    }
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
        // Merge the new data (full_content) into the item and notify parent
        const newItem = { ...item, ...data };
        if (onUpdate) {
          onUpdate(newItem);
        }
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
          onClick={handleToggleStar}
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
});

export default FeedItem;
