import type { Feed } from '../types';

export function createFeedItem(feed: Feed, isActive: boolean): string {
    return `
    <li class="feed-item ${isActive ? 'active' : ''}" data-id="${feed._id}">
      <a href="/v3/feed/${feed._id}" class="feed-link" onclick="event.preventDefault(); window.app.navigate('/feed/${feed._id}')">
        ${feed.title || feed.url}
      </a>
    </li>
  `;
}
