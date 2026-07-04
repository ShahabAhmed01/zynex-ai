/**
 * Storage — localStorage management for conversations
 */

const STORAGE_KEY = 'conversations';
const MAX_CONVERSATIONS = 50;

export function loadConversations() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveConversations(conversations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, MAX_CONVERSATIONS)));
}
