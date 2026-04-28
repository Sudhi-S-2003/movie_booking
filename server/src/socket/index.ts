import { Server, Namespace } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { env } from '../env.js';
import { registerBookingHandlers } from './channels/booking.channel.js';
import { registerSupportMessagesHandlers } from './channels/support-messages.channel.js';
import { registerSupportListHandlers } from './channels/support-list.channel.js';
import { registerHashtagHandlers } from './channels/hashtag.channel.js';
import { registerChatMessagesHandlers } from './channels/chat-messages.channel.js';
import { registerChatListHandlers } from './channels/chat-list.channel.js';
import { registerNotificationHandlers } from './channels/notification-push.channel.js';

let io: Server;
let bookingNamespace:         Namespace;
let supportMessagesNamespace: Namespace;
let supportListNamespace:     Namespace;
let hashtagNamespace:         Namespace;
let chatMessagesNamespace:    Namespace;
let chatListNamespace:        Namespace;
let notificationNamespace:    Namespace;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const setupNamespace = (ns: Namespace, registerHandlers: (ns: Namespace) => void) => {
    ns.on('connection', (socket) => {
      if (socket.data.userId) {
        socket.join(`user:${socket.data.userId}`);
      }
      if (socket.data.sessionId) {
        socket.join(`session:${socket.data.sessionId}`);
      }
    });
    registerHandlers(ns);
  };

  // ── Namespaces ──
  bookingNamespace = io.of('/booking');
  setupNamespace(bookingNamespace, registerBookingHandlers);

  supportMessagesNamespace = io.of('/support-messages');
  setupNamespace(supportMessagesNamespace, registerSupportMessagesHandlers);

  supportListNamespace = io.of('/support-list');
  setupNamespace(supportListNamespace, registerSupportListHandlers);

  hashtagNamespace = io.of('/hashtag');
  setupNamespace(hashtagNamespace, registerHashtagHandlers);

  chatMessagesNamespace = io.of('/chat-messages');
  setupNamespace(chatMessagesNamespace, registerChatMessagesHandlers);

  chatListNamespace = io.of('/chat-list');
  setupNamespace(chatListNamespace, registerChatListHandlers);

  notificationNamespace = io.of('/notification-push');
  setupNamespace(notificationNamespace, registerNotificationHandlers);

  return io;
};

// --- Accessors ---

export const disconnectSessionSockets = (sessionId: string) => {
  if (!io) return;
  const namespaces = [
    bookingNamespace, 
    supportMessagesNamespace, 
    supportListNamespace, 
    hashtagNamespace, 
    chatMessagesNamespace, 
    chatListNamespace, 
    notificationNamespace
  ];

  namespaces.forEach(ns => {
    if (ns) {
      ns.to(`session:${sessionId}`).disconnectSockets(true);
    }
  });
};

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

export const getNotificationNamespace = () => {
  if (!notificationNamespace) throw new Error('Notification namespace not initialized!');
  return notificationNamespace;
};

