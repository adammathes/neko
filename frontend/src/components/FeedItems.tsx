import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { Item } from '../types';
import FeedItem from './FeedItem';
import './FeedItems.css';
import { apiFetch } from '../utils';

export default function FeedItems() {
  const { feedId, tagName } = useParams<{ feedId: string; tagName: string }>();
  const [searchParams] = useSearchParams();
  const filterFn = searchParams.get('filter') || 'unread';

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const fetchItems = (maxId?: string) => {
    if (maxId) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setItems([]);
    }
    setError('');

    let url = '/api/stream';
    const params = new URLSearchParams();

    if (feedId) {
      if (feedId.includes(',')) {
        params.append('feed_ids', feedId);
      } else {
        params.append('feed_id', feedId);
      }
    } else if (tagName) {
      params.append('tag', tagName);
    }

    if (maxId) {
      params.append('max_id', maxId);
    }

    // Apply filters
    const searchQuery = searchParams.get('q');
    if (searchQuery) {
      params.append('q', searchQuery);
    }

    if (filterFn === 'all') {
      params.append('read_filter', 'all');
    } else if (filterFn === 'starred') {
      params.append('starred', 'true');
      params.append('read_filter', 'all');
    } else {
      // default to unread
      if (!searchQuery) {
        params.append('read_filter', 'unread');
      }
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    apiFetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch items');
        }
        return res.json();
      })
      .then((data) => {
        if (maxId) {
          setItems((prev) => [...prev, ...data]);
        } else {
          setItems(data);
        }
        setHasMore(data.length > 0);
        setLoading(false);
        setLoadingMore(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
        setLoadingMore(false);
      });
  };

  useEffect(() => {
    fetchItems();
    setSelectedIndex(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedId, tagName, filterFn, searchParams]);


  const scrollToItem = (index: number) => {
    const element = document.getElementById(`item-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  };

  const markAsRead = (item: Item) => {
    const updatedItem = { ...item, read: true };
    // Optimistic update
    setItems((prevItems) => prevItems.map((i) => (i._id === item._id ? updatedItem : i)));

    apiFetch(`/api/item/${item._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true, starred: item.starred }),
    }).catch((err) => console.error('Failed to mark read', err));
  };

  const toggleStar = (item: Item) => {
    const updatedItem = { ...item, starred: !item.starred };
    // Optimistic update
    setItems((prevItems) => prevItems.map((i) => (i._id === item._id ? updatedItem : i)));

    apiFetch(`/api/item/${item._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: item.read, starred: !item.starred }),
    }).catch((err) => console.error('Failed to toggle star', err));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (items.length === 0) return;

      if (e.key === 'j') {
        setSelectedIndex((prev) => {
          const nextIndex = Math.min(prev + 1, items.length - 1);
          if (nextIndex !== prev) {
            const item = items[nextIndex];
            if (!item.read) {
              markAsRead(item);
            }
            scrollToItem(nextIndex);
          }

          // If we're now on the last item and there are more items to load,
          // trigger loading them so the next 'j' press will work
          if (nextIndex === items.length - 1 && hasMore && !loadingMore) {
            fetchItems(String(items[items.length - 1]._id));
          }

          return nextIndex;
        });
      } else if (e.key === 'k') {
        setSelectedIndex((prev) => {
          const nextIndex = Math.max(prev - 1, 0);
          if (nextIndex !== prev) {
            scrollToItem(nextIndex);
          }
          return nextIndex;
        });
      } else if (e.key === 's') {
        setSelectedIndex((currentIndex) => {
          if (currentIndex >= 0 && currentIndex < items.length) {
            toggleStar(items[currentIndex]);
          }
          return currentIndex;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, hasMore, loadingMore]);



  useEffect(() => {
    // Observer for marking items as read
    const itemObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If item is not intersecting and is above the viewport, it's been scrolled past
          if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index) && index >= 0 && index < items.length) {
              const item = items[index];
              if (!item.read) {
                markAsRead(item);
              }
            }
          }
        });
      },
      { root: null, threshold: 0 }
    );

    // Observer for infinite scroll (less aggressive, triggers earlier)
    const sentinelObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !loadingMore && hasMore && items.length > 0) {
            fetchItems(String(items[items.length - 1]._id));
          }
        });
      },
      { root: null, threshold: 0, rootMargin: '100px' }
    );

    items.forEach((_, index) => {
      const el = document.getElementById(`item-${index}`);
      if (el) itemObserver.observe(el);
    });

    const sentinel = document.getElementById('load-more-sentinel');
    if (sentinel) sentinelObserver.observe(sentinel);

    return () => {
      itemObserver.disconnect();
      sentinelObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, loadingMore, hasMore]);

  if (loading) return <div className="feed-items-loading">Loading items...</div>;
  if (error) return <div className="feed-items-error">Error: {error}</div>;

  return (
    <div className="feed-items">
      {items.length === 0 ? (
        <p>No items found.</p>
      ) : (
        <ul className="item-list">
          {items.map((item, index) => (
            <div
              id={`item-${index}`}
              key={item._id}
              data-index={index}
              data-selected={index === selectedIndex}
              onClick={() => setSelectedIndex(index)}
            >
              <FeedItem item={item} />
            </div>
          ))}
          {hasMore && (
            <li id="load-more-sentinel" className="loading-more">
              {loadingMore ? 'Loading more...' : ''}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
