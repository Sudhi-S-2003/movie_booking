// ─────────────────────────────────────────────────────────────────────────────
// chatMessageFetch.service
//
// Thin wrapper around the shared generic message-fetch factory, bound to the
// ChatMessage model and 'conversationId' as the partition key.
// ─────────────────────────────────────────────────────────────────────────────

import { ChatMessage } from '../../models/chat.model.js';
import {
  createMessageFetchService,
} from '../shared/messageFetch.service.js';

const chatFetcher = createMessageFetchService(ChatMessage, 'conversationId');

export const loadLatest     = chatFetcher.loadLatest;
export const loadOlder      = chatFetcher.loadOlder;
export const loadNewer      = chatFetcher.loadNewer;
export const loadAround     = chatFetcher.loadAround;
export const loadWithAnchor = chatFetcher.loadWithAnchor;
