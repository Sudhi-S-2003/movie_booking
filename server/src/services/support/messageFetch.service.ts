// ─────────────────────────────────────────────────────────────────────────────
// support/messageFetch.service
//
// Thin wrapper around the shared generic message-fetch factory, bound to the
// IssueMessage model and 'issueId' as the partition key.
// ─────────────────────────────────────────────────────────────────────────────

import { IssueMessage } from '../../models/issue.model.js';
import {
  createMessageFetchService,
} from '../shared/messageFetch.service.js';

export type { FetchPageResult } from '../shared/messageFetch.service.js';
export { buildCursor, parseCursor } from '../shared/messageFetch.service.js';

const issueFetcher = createMessageFetchService(IssueMessage, 'issueId');

export const loadLatest     = issueFetcher.loadLatest;
export const loadOlder      = issueFetcher.loadOlder;
export const loadNewer      = issueFetcher.loadNewer;
export const loadAround     = issueFetcher.loadAround;
export const loadWithAnchor = issueFetcher.loadWithAnchor;
