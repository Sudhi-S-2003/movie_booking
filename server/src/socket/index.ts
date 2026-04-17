import { Server, Namespace } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { env } from '../env.js';
import { registerBookingHandlers } from './channels/booking.channel.js';
import { registerSupportMessagesHandlers } from './channels/support-messages.channel.js';
import { registerSupportListHandlers } from './channels/support-list.channel.js';
import { registerHashtagHandlers } from './channels/hashtag.channel.js';
import { registerChatMessagesHandlers } from './channels/chat-messages.channel.js';
import { registerChatListHandlers } from './channels/chat-list.channel.js';

let io: Server;
let bookingNamespace:         Namespace;
let supportMessagesNamespace: Namespace;
let supportListNamespace:     Namespace;
let hashtagNamespace:         Namespace;
let chatMessagesNamespace:    Namespace;
let chatListNamespace:        Namespace;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ── Namespaces ──
  bookingNamespace = io.of('/booking');
  registerBookingHandlers(bookingNamespace);

  // Support is split into TWO channels (see channel files for rationale):
  //   /support-messages → per-issue chat events (replies, receipts, status)
  //   /support-list     → user-scoped list events (unread counts, ticket updates)
  supportMessagesNamespace = io.of('/support-messages');
  registerSupportMessagesHandlers(supportMessagesNamespace);

  supportListNamespace = io.of('/support-list');
  registerSupportListHandlers(supportListNamespace);

  // Hashtag live feed
  hashtagNamespace = io.of('/hashtag');
  registerHashtagHandlers(hashtagNamespace);

  // General-purpose chat — split into two channels (same pattern as support):
  //   /chat-messages → per-conversation events (messages, typing, receipts)
  //   /chat-list     → user-scoped list events (unread badges, conversation updates)
  chatMessagesNamespace = io.of('/chat-messages');
  registerChatMessagesHandlers(chatMessagesNamespace);

  chatListNamespace = io.of('/chat-list');
  registerChatListHandlers(chatListNamespace);

  return io;
};

// --- Accessors ---

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

export const getBookingNamespace = () => {
  if (!bookingNamespace) throw new Error('Booking namespace not initialized!');
  return bookingNamespace;
};

export const getSupportMessagesNamespace = () => {
  if (!supportMessagesNamespace) throw new Error('Support-messages namespace not initialized!');
  return supportMessagesNamespace;
};

export const getSupportListNamespace = () => {
  if (!supportListNamespace) throw new Error('Support-list namespace not initialized!');
  return supportListNamespace;
};

export const getHashtagNamespace = () => {
  if (!hashtagNamespace) throw new Error('Hashtag namespace not initialized!');
  return hashtagNamespace;
};

export const getChatMessagesNamespace = () => {
  if (!chatMessagesNamespace) throw new Error('Chat-messages namespace not initialized!');
  return chatMessagesNamespace;
};

export const getChatListNamespace = () => {
  if (!chatListNamespace) throw new Error('Chat-list namespace not initialized!');
  return chatListNamespace;
};

