import { useCallback, useEffect, useRef, useState } from 'react';
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
  const itemsRef = useRef<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(loadingMore);
  const [hasMore, setHasMore] = useState(true);
  const hasMoreRef = useRef(hasMore);
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Sync refs
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const fetchItems = useCallback((maxId?: string) => {
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
  }, [feedId, tagName, filterFn, searchParams]);

  useEffect(() => {
    fetchItems();
    setSelectedIndex(-1);
  }, [fetchItems]);


  const scrollToItem = useCallback((index: number) => {
    const element = document.getElementById(`item-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, []);

  const markAsRead = useCallback((item: Item) => {
    const updatedItem = { ...item, read: true };
    setItems((prevItems) => prevItems.map((i) => (i._id === item._id ? updatedItem : i)));

    apiFetch(`/api/item/${item._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true, starred: item.starred }),
    }).catch((err) => console.error('Failed to mark read', err));
  }, []);

  const toggleStar = useCallback((item: Item) => {
    const updatedItem = { ...item, starred: !item.starred };
    setItems((prevItems) => prevItems.map((i) => (i._id === item._id ? updatedItem : i)));

    apiFetch(`/api/item/${item._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: item.read, starred: !item.starred }),
    }).catch((err) => console.error('Failed to toggle star', err));
  }, []);

  const handleUpdateItem = useCallback((updatedItem: Item) => {
    setItems((prevItems) => prevItems.map((i) => (i._id === updatedItem._id ? updatedItem : i)));
  }, []);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Use ref to get latest items without effect re-running
      const currentItems = itemsRef.current;
      if (currentItems.length === 0) return;

      if (e.key === 'j') {
        setSelectedIndex((prev) => {
          const nextIndex = Math.min(prev + 1, currentItems.length - 1);
          if (nextIndex !== prev) {
            const item = currentItems[nextIndex];
            if (!item.read) {
              markAsRead(item);
            }
            scrollToItem(nextIndex);
          }

          // Trigger load more if needed
          if (nextIndex === currentItems.length - 1 && hasMoreRef.current && !loadingMoreRef.current) {
            fetchItems(String(currentItems[currentItems.length - 1]._id));
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
          if (currentIndex >= 0 && currentIndex < currentItems.length) {
            toggleStar(currentItems[currentIndex]);
          }
          return currentIndex;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [markAsRead, scrollToItem, toggleStar, fetchItems]);


  // Stable Observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelObserverRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
            const index = Number(entry.target.getAttribute('data-index'));
            const currentItems = itemsRef.current;
            if (!isNaN(index) && index >= 0 && index < currentItems.length) {
              const item = currentItems[index];
              if (!item.read) {
                markAsRead(item);
              }
            }
          }
        });
      },
      { root: null, threshold: 0 }
    );

    const currentItems = itemsRef.current;
    currentItems.forEach((_, index) => {
      const el = document.getElementById(`item-${index}`);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [items.length, markAsRead]); // Only re-setup if item count changes


  useEffect(() => {
    if (sentinelObserverRef.current) sentinelObserverRef.current.disconnect();

    sentinelObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !loadingMoreRef.current && hasMoreRef.current && itemsRef.current.length > 0) {
            fetchItems(String(itemsRef.current[itemsRef.current.length - 1]._id));
          }
        });
      },
      { root: null, threshold: 0, rootMargin: '100px' }
    );

    const sentinel = document.getElementById('load-more-sentinel');
    if (sentinel) sentinelObserverRef.current.observe(sentinel);

    return () => sentinelObserverRef.current?.disconnect();
  }, [hasMore, fetchItems]); // removed loadingMore from deps, using ref inside. hasMore is needed for DOM presence.


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
              <FeedItem
                item={item}
                onToggleStar={() => toggleStar(item)}
                onUpdate={handleUpdateItem}
              />
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
