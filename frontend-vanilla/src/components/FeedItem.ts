import type { Item } from '../types';

// NOTE: The "text" scrape button (data-action="scrape") was removed from the
// template. The backend endpoint and scrapeItem() handler in main.ts are still
// intact if we want to bring it back with proper styling later.

export function createFeedItem(item: Item): string {
  const date = new Date(item.publish_date).toLocaleDateString();
  return `
    <li class="feed-item ${item.read ? 'read' : 'unread'}" data-id="${item._id}">
      <div class="item-header">
        <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="item-title" data-action="open">
          ${item.title || '(No Title)'}
        </a>
        <button class="star-btn ${item.starred ? 'is-starred' : 'is-unstarred'}" title="${item.starred ? 'Unstar' : 'Star'}" data-action="toggle-star">
          ★
        </button>
      </div>
      <div class="dateline">
        <a href="${item.url}" target="_blank" rel="noopener noreferrer">
          ${date}
          ${item.feed_title ? ` - ${item.feed_title}` : ''}
        </a>
      </div>
      ${(item.full_content || item.description) ? `
        <div class="item-description">
          ${item.full_content || item.description}
        </div>
      ` : ''}
    </li>
  `;
}
