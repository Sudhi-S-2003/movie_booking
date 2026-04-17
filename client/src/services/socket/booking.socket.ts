import { createSocket } from './connection.js';

class BookingSocketService {
  private socket = createSocket('/booking');
  private listeners: Set<() => void> = new Set();
  private seatStates: Record<string, string> = {};
  private snapshot: Record<string, string> = {};

  constructor() {
    this.socket.on('seat_locked', ({ seatId, status }: { seatId: string; status: string }) => {
      this.seatStates = { ...this.seatStates, [seatId]: status };
      this.snapshot = this.seatStates;
      this.notify();
    });

    this.socket.on('seat_released', ({ seatId }: { seatId: string }) => {
      const { [seatId]: _, ...rest } = this.seatStates;
      this.seatStates = rest;
      this.snapshot = this.seatStates;
      this.notify();
    });
  }

  connect() {
    if (!this.socket.connected) this.socket.connect();
  }

  disconnect() {
    this.socket.disconnect();
  }

  joinRoom(showtimeId: string) {
    this.socket.emit('join_showtime', showtimeId);
  }

  leaveRoom(showtimeId: string) {
    this.socket.emit('leave_showtime', showtimeId);
  }

  emitLock(showtimeId: string, seatId: string) {
    this.socket.emit('lock_seat', { showtimeId, seatId });
  }

  emitRelease(showtimeId: string, seatId: string) {
    this.socket.emit('release_seat', { showtimeId, seatId });
  }

  initializeSeats(reservations: { seatId: string; status: string }[]) {
    const newState: Record<string, string> = {};
    reservations.forEach(r => { newState[r.seatId] = r.status; });
    this.seatStates = newState;
    this.snapshot = this.seatStates;
    this.notify();
  }

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const bookingSocket = new BookingSocketService();
