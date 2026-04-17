import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBookingStore } from '../store/bookingStore.js';
import { useAuthStore } from '../store/authStore.js';
import { bookingSocket } from '../services/socket/index.js';
import { bookingsApi } from '../services/api/index.js';

const BOOKING_ROUTES = ['/booking/', '/checkout'];

const isBookingRoute = (pathname: string) =>
  BOOKING_ROUTES.some(route => pathname.startsWith(route));

interface BookingSessionContextValue {
  showtime: any;
  setShowtime: (st: any) => void;
  releaseAllSeats: () => Promise<void>;
}

const BookingSessionContext = createContext<BookingSessionContextValue>({
  showtime: null,
  setShowtime: () => {},
  releaseAllSeats: async () => {},
});

export const useBookingSession = () => useContext(BookingSessionContext);

export const BookingSessionProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const prevPathnameRef = useRef(location.pathname);
  const wasInBookingRef = useRef(isBookingRoute(location.pathname));

  const [showtime, setShowtime] = useState<any>(null);

  const releaseAllSeats = useCallback(async () => {
    const { selectedSeats, currentShowtimeId } = useBookingStore.getState();
    if (!currentShowtimeId || selectedSeats.length === 0) return;

    selectedSeats.forEach(seat => {
      bookingSocket.emitRelease(currentShowtimeId, seat.id);
    });

    const token = useAuthStore.getState().token;
    if (token) {
      try {
        await bookingsApi.unlockSeats(currentShowtimeId, selectedSeats.map(s => s.id));
      } catch {}
    }

    useBookingStore.getState().clearSelection();
  }, []);

  useEffect(() => {
    const currentlyInBooking = isBookingRoute(location.pathname);
    const wasInBooking = wasInBookingRef.current;

    if (wasInBooking && !currentlyInBooking) {
      releaseAllSeats();
      setShowtime(null);
    }

    prevPathnameRef.current = location.pathname;
    wasInBookingRef.current = currentlyInBooking;
  }, [location.pathname, releaseAllSeats]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const { selectedSeats, currentShowtimeId } = useBookingStore.getState();
      if (!currentShowtimeId || selectedSeats.length === 0) return;

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = useAuthStore.getState().token;

      navigator.sendBeacon(
        `${apiUrl}/booking/unlock-beacon`,
        new Blob([JSON.stringify({
          showtimeId: currentShowtimeId,
          seatIds: selectedSeats.map(s => s.id),
          token,
        })], { type: 'application/json' })
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    return () => {
      const { selectedSeats, currentShowtimeId } = useBookingStore.getState();
      if (!currentShowtimeId || selectedSeats.length === 0) return;

      const token = useAuthStore.getState().token;
      if (token) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        fetch(`${apiUrl}/booking/unlock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            showtimeId: currentShowtimeId,
            seatIds: selectedSeats.map(s => s.id),
          }),
          keepalive: true,
        }).catch(() => {});
      }
      useBookingStore.getState().clearSelection();
    };
  }, []);

  return (
    <BookingSessionContext.Provider value={{ showtime, setShowtime, releaseAllSeats }}>
      {children}
    </BookingSessionContext.Provider>
  );
};
