import type { Namespace } from 'socket.io';
import { socketAuthMiddleware } from '../socketAuth.middleware.js';

/**
 * Booking channel — real-time seat lock/release within showtime rooms.
 *
 * Authenticated via JWT. Unauthenticated clients are rejected before they
 * can manipulate seat-lock state.
 */
export const registerBookingHandlers = (namespace: Namespace) => {
  namespace.use(socketAuthMiddleware);

  namespace.on('connection', (socket) => {
    console.log('🔌 [BOOKING] Client connected:', socket.id);

    socket.on('join_showtime', (showtimeId: string) => {
      socket.join(showtimeId);
      console.log(`👤 [BOOKING] ${socket.id} joined showtime: ${showtimeId}`);
    });

    socket.on('leave_showtime', (showtimeId: string) => {
      socket.leave(showtimeId);
      console.log(`👤 [BOOKING] ${socket.id} left showtime: ${showtimeId}`);
    });

    socket.on('lock_seat', ({ showtimeId, seatId }: { showtimeId: string; seatId: string }) => {
      socket.to(showtimeId).emit('seat_locked', { seatId, status: 'locked' });
    });

    socket.on('release_seat', ({ showtimeId, seatId }: { showtimeId: string; seatId: string }) => {
      socket.to(showtimeId).emit('seat_released', { seatId });
    });

    socket.on('disconnect', () => {
      console.log('🔌 [BOOKING] Client disconnected:', socket.id);
    });
  });
};
