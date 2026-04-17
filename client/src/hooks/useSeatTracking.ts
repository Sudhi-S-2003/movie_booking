import { useSyncExternalStore } from 'react';
import { bookingSocket } from '../services/socket/index.js';

export const useSeatTracking = () => {
  const lockedSeats = useSyncExternalStore(
    (callback) => bookingSocket.subscribe(callback),
    () => bookingSocket.getSnapshot()
  );

  return {
    lockedSeats,
    emitLock: (showtimeId: string, seatId: string) => bookingSocket.emitLock(showtimeId, seatId),
    emitRelease: (showtimeId: string, seatId: string) => bookingSocket.emitRelease(showtimeId, seatId),
  };
};
