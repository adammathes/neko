import type { Item } from '../types';

export function createFeedItem(item: Item, isSelected: boolean = false): string {
  const date = new Date(item.publish_date).toLocaleDateString();
  return `
    <li class="feed-item ${item.read ? 'read' : 'unread'} ${isSelected ? 'selected' : ''}" data-id="${item._id}">
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
        <div class="item-actions" style="display: inline-block; float: right;">
          ${!item.full_content ? `
            <button class="scrape-btn" title="Load Full Content" data-action="scrape">
              text
            </button>
          ` : ''}
        </div>
      </div>
      ${(item.full_content || item.description) ? `
        <div class="item-description">
          ${item.full_content || item.description}
        </div>
      ` : ''}
    </li>
  `;
}
