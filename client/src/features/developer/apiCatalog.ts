/**
 * Public API reference — the single source of truth rendered by ApiDocsPage.
 * Keep in sync with server routes:
 *   server/src/routes/apiKey.public.routes.ts      (chat)
 *   server/src/routes/apiService.public.routes.ts  (code share v1/v2)
 */

export type HttpMethod = 'GET' | 'POST' | 'DELETE';
export type AuthKind = 'apiKey' | 'signedLink';

export interface FieldDoc {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

export interface EndpointDoc {
  id: string;
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  auth: AuthKind;
  /** Signed-link endpoints: scope needed (write actions need a write link). */
  scope?: 'read' | 'write';
  query?: FieldDoc[];
  body?: FieldDoc[];
  exampleBody?: unknown;
  exampleResponse: unknown;
  notes?: string[];
}

export interface ServiceDoc {
  id: string;
  name: string;
  serviceKey: string;
  apiKeyCategory: string;
  summary: string;
  endpoints: EndpointDoc[];
}

const SIGNED_QUERY: FieldDoc[] = [
  { name: 'signature', type: 'string', required: true, description: 'From the signed link.' },
  { name: 'expiresAt', type: 'number', required: true, description: 'Expiry (Unix ms) from the signed link.' },
];
const SIGNED_SCOPE: FieldDoc = { name: 'scope', type: '"read" | "write"', required: true, description: 'Scope the link was signed with. It is part of the signature and cannot be changed.' };

export const API_SERVICES: ServiceDoc[] = [
  {
    id: 'chat',
    name: 'Chat',
    serviceKey: 'chat',
    apiKeyCategory: 'chat',
    summary: 'Create a conversation for one of your end users and embed it with a signed, expiring link. Messages are billed to the API key owner per token (≈4 characters).',
    endpoints: [
      {
        id: 'chat-create',
        method: 'POST',
        path: '/public/chat/conversation',
        title: 'Create (or reuse) a conversation',
        description: 'Creates a conversation for an external user, identified by email. Calling it again for the same email returns the existing conversation with a fresh link.',
        auth: 'apiKey',
        body: [
          { name: 'name', type: 'string', required: true, description: 'Display name of your end user.' },
          { name: 'email', type: 'string', required: true, description: 'Email of your end user (identifies the conversation).' },
          { name: 'expiryMinutes', type: 'number', description: 'Link lifetime in minutes. Default 5, max 10080 (7 days).' },
        ],
        exampleBody: { name: 'Jane Cooper', email: 'jane@example.com', expiryMinutes: 60 },
        exampleResponse: {
          success: true,
          data: {
            conversation: { _id: '6650c2…', type: 'api', externalUser: { name: 'Jane Cooper', email: 'jane@example.com' } },
            signedUrl: 'https://app.example.com/chat/6650c2…?signature=…&expiresAt=1716400000000',
            expiresAt: 1716400000000,
            existing: false,
          },
        },
      },
      {
        id: 'chat-signed-url',
        method: 'POST',
        path: '/public/chat/conversation/signed-url',
        title: 'Issue a new link for a conversation',
        description: 'Returns a fresh signed link for a conversation that this API key owner created. Returns 404 for anyone else’s conversation.',
        auth: 'apiKey',
        body: [
          { name: 'conversationId', type: 'string', required: true, description: 'ID returned when the conversation was created.' },
          { name: 'expiryMinutes', type: 'number', description: 'Link lifetime in minutes. Default 5, max 10080.' },
        ],
        exampleBody: { conversationId: '6650c2…', expiryMinutes: 30 },
        exampleResponse: { success: true, data: { signedUrl: 'https://app.example.com/chat/6650c2…?signature=…&expiresAt=…', expiresAt: 1716401800000 } },
      },
      {
        id: 'chat-guest-messages',
        method: 'GET',
        path: '/public/chat/conversation/:id/messages',
        title: 'Read messages (guest)',
        description: 'Used by the embedded chat page. Pages backwards with `before` (message id).',
        auth: 'signedLink',
        query: [...SIGNED_QUERY, { name: 'limit', type: 'number', description: 'Page size (max 50).' }, { name: 'before', type: 'string', description: 'Message id to page back from.' }],
        exampleResponse: { success: true, messages: [{ _id: '…', senderName: 'Jane Cooper', contentType: 'text', text: 'Hello!', createdAt: '2026-05-22T10:00:00.000Z' }], hasBefore: false },
      },
      {
        id: 'chat-guest-send',
        method: 'POST',
        path: '/public/chat/conversation/:id/messages',
        title: 'Send a message (guest)',
        description: 'Sends a message as the external user. Billed to the API key owner; returns 402 when their wallet or credit limit is exhausted.',
        auth: 'signedLink',
        query: SIGNED_QUERY,
        body: [
          { name: 'contentType', type: '"text" | "emoji" | …', required: true, description: 'Message type. Use "text" for plain messages (up to 1000 characters; longer text uses the long-text upload flow).' },
          { name: 'text', type: 'string', required: true, description: 'Message text.' },
        ],
        exampleBody: { contentType: 'text', text: 'Hi, I need help with my order.' },
        exampleResponse: { success: true, message: { _id: '…', text: 'Hi, I need help with my order.' }, billing: { cost: 5600, units: 8, balance: null } },
      },
      {
        id: 'chat-guest-availability',
        method: 'GET',
        path: '/public/chat/conversation/:id/subscription',
        title: 'Check if messaging is available (guest)',
        description: 'Tells the embedded page whether the owner can currently be billed. Never exposes the owner’s balance or prices.',
        auth: 'signedLink',
        query: SIGNED_QUERY,
        exampleResponse: { success: true, data: { canSend: true } },
      },
    ],
  },
  {
    id: 'code-share',
    name: 'Code Share',
    serviceKey: 'code-share',
    apiKeyCategory: 'code-share',
    summary: 'Share a single-file snippet through a signed link. Creating a snippet is billed per token of its content.',
    endpoints: [
      {
        id: 'cs-create',
        method: 'POST',
        path: '/public/api-service',
        title: 'Create a snippet',
        description: 'Creates the snippet and returns a write-scoped link for it.',
        auth: 'apiKey',
        body: [
          { name: 'category', type: '"code-share"', required: true, description: 'Must match the API key’s category.' },
          { name: 'title', type: 'string', required: true, description: 'Snippet title.' },
          { name: 'code', type: 'string', description: 'Initial content.' },
          { name: 'expiryMinutes', type: 'number', description: 'Snippet and link lifetime. Link max 7 days.' },
        ],
        exampleBody: { category: 'code-share', title: 'hello.js', code: "console.log('hi')", expiryMinutes: 60 },
        exampleResponse: { success: true, message: 'Resource created', data: { resourceId: '6650d1…', signedUrl: 'https://app.example.com/code-share/6650d1…?signature=…&expiresAt=…&category=code-share&scope=write', expiresAt: 1716400000000, signature: '…', scope: 'write' } },
      },
      {
        id: 'cs-signed-url',
        method: 'POST',
        path: '/public/api-service/signed-url',
        title: 'Issue a read or write link',
        description: 'Issue a read-only link to share publicly, or a write link for editors. Only the resource owner can issue links.',
        auth: 'apiKey',
        body: [
          { name: 'category', type: '"code-share" | "code-share-v2"', required: true, description: 'Resource category.' },
          { name: 'resourceId', type: 'string', required: true, description: 'ID returned at creation.' },
          { name: 'scope', type: '"read" | "write"', description: 'Default "write". Use "read" for viewers.' },
          { name: 'expiryMinutes', type: 'number', description: 'Default 15, max 10080.' },
        ],
        exampleBody: { category: 'code-share', resourceId: '6650d1…', scope: 'read', expiryMinutes: 1440 },
        exampleResponse: { success: true, data: { signedUrl: '…&scope=read', expiresAt: 1716486400000, signature: '…', scope: 'read' } },
      },
      {
        id: 'cs-read',
        method: 'GET',
        path: '/public/api-service/code-share/:id',
        title: 'Read a snippet',
        description: 'Content is returned in chunks; follow `nextChunkId` while `hasMore` is true.',
        auth: 'signedLink',
        scope: 'read',
        query: [...SIGNED_QUERY, SIGNED_SCOPE, { name: 'action', type: '"read"', description: 'Default.' }, { name: 'chunkId', type: 'string', description: 'Next chunk to load.' }],
        exampleResponse: { success: true, message: 'Success', data: { title: 'hello.js', totalLength: 17, code: "console.log('hi')", hasMore: false, nextChunkId: null } },
      },
      {
        id: 'cs-write',
        method: 'POST',
        path: '/public/api-service/code-share/:id',
        title: 'Update or delete a snippet',
        description: 'Write actions need a write-scoped link and must use POST. `update` with no `prevChunkId` starts a new version; send further chunks (≤35,000 chars) with the previous chunk’s id.',
        auth: 'signedLink',
        scope: 'write',
        query: [...SIGNED_QUERY, SIGNED_SCOPE],
        body: [
          { name: 'action', type: '"update" | "delete"', required: true, description: 'Operation.' },
          { name: 'title', type: 'string', description: 'update: new title.' },
          { name: 'code', type: 'string', description: 'update: chunk content.' },
          { name: 'prevChunkId', type: 'string | null', description: 'update: previous chunk, or null to start over.' },
        ],
        exampleBody: { action: 'update', title: 'hello.js', code: "console.log('updated')", prevChunkId: null },
        exampleResponse: { success: true, message: 'Snippet updated', data: { chunkId: '6650d9…', title: 'hello.js' } },
        notes: ['A read link returns 403 here; a GET with a write action returns 405.'],
      },
    ],
  },
  {
    id: 'code-share-v2',
    name: 'Code Workspaces',
    serviceKey: 'code-share-v2',
    apiKeyCategory: 'code-share-v2',
    summary: 'Multi-file workspaces with commits, history, diffs and ZIP download. Creating a workspace is billed per token of its files.',
    endpoints: [
      {
        id: 'v2-create',
        method: 'POST',
        path: '/public/api-service',
        title: 'Create a workspace',
        description: 'Creates the workspace with an initial commit and returns a write-scoped link.',
        auth: 'apiKey',
        body: [
          { name: 'category', type: '"code-share-v2"', required: true, description: 'Must match the API key’s category.' },
          { name: 'title', type: 'string', required: true, description: 'Workspace title.' },
          { name: 'files', type: '{ path: string; content: string }[]', required: true, description: 'Initial files.' },
          { name: 'expiryMinutes', type: 'number', description: 'Workspace and link lifetime.' },
        ],
        exampleBody: { category: 'code-share-v2', title: 'Demo', files: [{ path: 'index.html', content: '<h1>Hi</h1>' }, { path: 'src/app.js', content: "console.log('init')" }] },
        exampleResponse: { success: true, message: 'Resource created', data: { resourceId: '6650e4…', signedUrl: '…/code-share-v2/6650e4…?…&scope=write', expiresAt: 1716400000000, signature: '…', scope: 'write' } },
      },
      {
        id: 'v2-read',
        method: 'GET',
        path: '/public/api-service/code-share-v2/:id',
        title: 'Read workspace, files, history',
        description: 'Choose the operation with `action`. All of these work with a read link.',
        auth: 'signedLink',
        scope: 'read',
        query: [
          ...SIGNED_QUERY, SIGNED_SCOPE,
          { name: 'action', type: '"v2-read" | "v2-get-file" | "v2-history" | "v2-commit-details" | "v2-download-all"', required: true, description: 'Operation.' },
          { name: 'commitId', type: 'string', description: 'Check out a specific commit (default HEAD). Required for v2-commit-details.' },
          { name: 'path', type: 'string', description: 'v2-get-file: file path.' },
          { name: 'offset', type: 'number', description: 'v2-get-file: character offset for large files.' },
        ],
        exampleResponse: { success: true, message: 'Success', data: { title: 'Demo', files: [{ path: 'index.html', size: 11 }], commits: [{ _id: '…', message: 'Initial commit' }] } },
      },
      {
        id: 'v2-commit',
        method: 'POST',
        path: '/public/api-service/code-share-v2/:id',
        title: 'Commit changes',
        description: 'Records a commit. Needs a write link and POST.',
        auth: 'signedLink',
        scope: 'write',
        query: [...SIGNED_QUERY, SIGNED_SCOPE],
        body: [
          { name: 'action', type: '"v2-commit"', required: true, description: 'Operation.' },
          { name: 'message', type: 'string', required: true, description: 'Commit message.' },
          { name: 'changes', type: '{ path; type: "add" | "modify" | "delete" | "rename" | "create-folder" | "delete-folder"; content? }[]', required: true, description: 'File changes in this commit.' },
        ],
        exampleBody: { action: 'v2-commit', message: 'Update title', changes: [{ path: 'index.html', type: 'modify', content: '<h1>Hello</h1>' }] },
        exampleResponse: { success: true, message: 'Commit created successfully', data: { commitId: '…', message: 'Update title' } },
      },
    ],
  },
];

export const ERROR_CODES: { status: number; code: string; meaning: string }[] = [
  { status: 400, code: 'VALIDATION_ERROR / BAD_REQUEST', meaning: 'Invalid or missing fields; `details.fieldErrors` lists them.' },
  { status: 401, code: 'UNAUTHORIZED', meaning: 'Missing/invalid API key or secret, or an invalid/expired signed link.' },
  { status: 402, code: 'INSUFFICIENT_FUNDS', meaning: 'Prepaid wallet balance or postpaid credit limit exhausted.' },
  { status: 403, code: 'SERVICE_NOT_ENABLED / FORBIDDEN', meaning: 'Service not enabled for the account, key used for another category, or a read link used for a write.' },
  { status: 404, code: 'NOT_FOUND', meaning: 'Resource does not exist or does not belong to you.' },
  { status: 405, code: '—', meaning: 'Write action sent with GET.' },
  { status: 429, code: 'RATE_LIMITED', meaning: 'Too many requests; retry after the `Retry-After` header.' },
];
