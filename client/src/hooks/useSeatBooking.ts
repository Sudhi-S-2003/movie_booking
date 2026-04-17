import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookingStore } from '../store/bookingStore.js';
import { useAuthStore } from '../store/authStore.js';
import { useSeatTracking } from './useSeatTracking.js';
import { useBookingSession } from '../providers/BookingSessionProvider.js';
import { bookingSocket } from '../services/socket/index.js';
import { bookingsApi } from '../services/api/index.js';
import { SeatStatus } from '../constants/enums.js';
import { normalizeTier, PRICE_MAP } from '../components/booking/constants.js';

interface TierSection {
  tier: string;
  rows: any[];
  price: number;
}

export const useSeatBooking = () => {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const {
    selectedSeats,
    toggleSeat,
    clearSelection,
    addReservationId,
    setShowtime: setGlobalShowtime,
  } = useBookingStore();
  const { lockedSeats, emitLock, emitRelease } = useSeatTracking();
  const { showtime, setShowtime: setProviderShowtime } = useBookingSession();

  const [timeLeft, setTimeLeft] = useState(600);
  const [zoom, setZoom] = useState(1);
  const [seatCount, setSeatCount] = useState<number | null>(null);
  const seatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bookingSocket.connect();

    if (showtimeId) {
      bookingSocket.joinRoom(showtimeId);
      setGlobalShowtime(showtimeId);

      if (!showtime) {
        bookingsApi.getShowtimeDetails(showtimeId).then(res => {
          setProviderShowtime(res.showtime);
          bookingSocket.initializeSeats(res.reservations || []);
        });
      }
    }

    return () => {
      if (showtimeId) bookingSocket.leaveRoom(showtimeId);
      bookingSocket.disconnect();
    };
  }, [showtimeId, setGlobalShowtime, showtime, setProviderShowtime]);

  useEffect(() => {
    if (selectedSeats.length === 0) {
      setTimeLeft(600);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearSelection();
          return 600;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedSeats.length, clearSelection]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const totalPrice = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + seat.price, 0),
    [selectedSeats]
  );

  const getSeatInfo = useCallback((seatId: string) => {
    const screen = showtime?.screenId;
    let tier = 'standard';
    if (screen?.layout) {
      for (const row of screen.layout) {
        if (row.type !== 'row') continue;
        for (const col of row.columns) {
          if (col.type === 'seat' && `${row.name}-${col.name}` === seatId) {
            tier = normalizeTier(col.priceGroup);
            return { tier, price: PRICE_MAP[tier] || 150 };
          }
        }
      }
    }
    return { tier, price: PRICE_MAP[tier] || 150 };
  }, [showtime]);

  const findConsecutiveSeats = useCallback((clickedSeatId: string, count: number): string[] => {
    const screen = showtime?.screenId;
    if (!screen?.layout) return [clickedSeatId];

    const [rowName] = clickedSeatId.split('-');
    const row = screen.layout.find((r: any) => r.type === 'row' && r.name === rowName);
    if (!row) return [clickedSeatId];

    const allSeats: string[] = [];
    for (const col of row.columns) {
      if (col.type !== 'seat') continue;
      const sid = `${rowName}-${col.name}`;
      const status = lockedSeats[sid];
      const isBooked = status === SeatStatus.BOOKED;
      const isLockedByOther = status === SeatStatus.LOCKED && !selectedSeats.some(s => s.id === sid);
      if (!isBooked && !isLockedByOther) {
        allSeats.push(sid);
      }
    }

    const clickedIdx = allSeats.indexOf(clickedSeatId);
    if (clickedIdx === -1) return [clickedSeatId];

    let bestWindow: string[] = [];
    for (let start = Math.max(0, clickedIdx - count + 1); start <= clickedIdx; start++) {
      const end = start + count;
      if (end > allSeats.length) continue;
      const window = allSeats.slice(start, end);
      let consecutive = true;
      for (let i = 1; i < window.length; i++) {
        const prevColIdx = row.columns.findIndex((c: any) => c.type === 'seat' && `${rowName}-${c.name}` === window[i - 1]);
        const currColIdx = row.columns.findIndex((c: any) => c.type === 'seat' && `${rowName}-${c.name}` === window[i]);
        let hasGap = false;
        for (let j = prevColIdx + 1; j < currColIdx; j++) {
          if (row.columns[j].type === 'seat') { hasGap = true; break; }
        }
        if (hasGap) { consecutive = false; break; }
      }
      if (consecutive) { bestWindow = window; break; }
    }

    return bestWindow.length > 0 ? bestWindow : [clickedSeatId];
  }, [showtime, lockedSeats, selectedSeats]);

  const lockSeatOnServer = useCallback(async (sid: string) => {
    if (!showtimeId || !isAuthenticated) return;
    const { price } = getSeatInfo(sid);
    try {
      const res = await bookingsApi.lockSeats(showtimeId, [sid], [price]);
      const reservation = res.reservations?.[0] ?? res.reservation;
      if (reservation) {
        addReservationId(reservation._id, sid);
      }
    } catch (e) {
      console.error('Failed to lock seat', sid);
    }
  }, [showtimeId, isAuthenticated, getSeatInfo, addReservationId]);

  const lockSeatsOnServer = useCallback(async (sids: string[]) => {
    if (!showtimeId || !isAuthenticated || sids.length === 0) return;
    const prices = sids.map(sid => getSeatInfo(sid).price);
    try {
      const res = await bookingsApi.lockSeats(showtimeId, sids, prices);
      const reservations = res.reservations || [res.reservation];
      reservations.forEach((r: any, i: number) => {
        addReservationId(r._id, sids[i]);
      });
    } catch (e) {
      console.error('Failed to bulk lock seats', sids);
    }
  }, [showtimeId, isAuthenticated, getSeatInfo, addReservationId]);

  const unlockSeatOnServer = useCallback(async (sid: string) => {
    if (!showtimeId || !isAuthenticated) return;
    try {
      await bookingsApi.unlockSeats(showtimeId, [sid]);
    } catch (e) {
      console.error('Failed to unlock seat', sid);
    }
  }, [showtimeId, isAuthenticated]);

  const unlockSeatsOnServer = useCallback(async (sids: string[]) => {
    if (!showtimeId || !isAuthenticated || sids.length === 0) return;
    try {
      await bookingsApi.unlockSeats(showtimeId, sids);
    } catch (e) {
      console.error('Failed to bulk unlock seats', sids);
    }
  }, [showtimeId, isAuthenticated]);

  const MAX_SEATS = 10;

  const handleSeatClick = useCallback(async (seatId: string) => {
    if (!showtimeId) return;
    const isSelected = selectedSeats.some(s => s.id === seatId);
    const { price } = getSeatInfo(seatId);
    const maxAllowed = seatCount ?? MAX_SEATS;

    if (seatCount !== null && !isSelected) {
      const seatsToSelect = findConsecutiveSeats(seatId, seatCount);
      const prevSeats = [...selectedSeats];

      if (prevSeats.length > 0) {
        clearSelection();
        prevSeats.forEach(prev => emitRelease(showtimeId, prev.id));
        unlockSeatsOnServer(prevSeats.map(p => p.id));
      }

      seatsToSelect.forEach(sid => {
        const info = getSeatInfo(sid);
        emitLock(showtimeId, sid);
        toggleSeat(sid, info.price);
      });
      lockSeatsOnServer(seatsToSelect);
      return;
    }

    if (!isSelected) {
      if (selectedSeats.length >= maxAllowed) return;

      emitLock(showtimeId, seatId);
      toggleSeat(seatId, price);
      lockSeatOnServer(seatId);
    } else {
      emitRelease(showtimeId, seatId);
      toggleSeat(seatId, price);
      unlockSeatOnServer(seatId);
    }
  }, [showtimeId, selectedSeats, getSeatInfo, seatCount, findConsecutiveSeats, clearSelection, emitLock, emitRelease, toggleSeat, lockSeatOnServer, lockSeatsOnServer, unlockSeatOnServer, unlockSeatsOnServer]);

  const tierSections = useMemo<TierSection[]>(() => {
    if (!showtime?.screenId?.layout) return [];

    const layout = showtime.screenId.layout;
    const sections: TierSection[] = [];
    let currentTier: string | null = null;
    let currentRows: any[] = [];

    layout.forEach((row: any) => {
      if (row.type === 'space') {
        if (currentRows.length > 0 && currentTier) {
          sections.push({ tier: currentTier, rows: currentRows, price: PRICE_MAP[currentTier] || 150 });
          currentRows = [];
          currentTier = null;
        }
        currentRows = [];
        return;
      }

      const seatCols = (row.columns || []).filter((c: any) => c.type === 'seat');
      if (seatCols.length === 0) return;

      const rowTier = normalizeTier(seatCols[0]?.priceGroup);

      if (rowTier !== currentTier) {
        if (currentRows.length > 0 && currentTier) {
          sections.push({ tier: currentTier, rows: currentRows, price: PRICE_MAP[currentTier] || 150 });
        }
        currentTier = rowTier;
        currentRows = [row];
      } else {
        currentRows.push(row);
      }
    });

    if (currentRows.length > 0 && currentTier) {
      sections.push({ tier: currentTier, rows: currentRows, price: PRICE_MAP[currentTier] || 150 });
    }

    return sections;
  }, [showtime]);

  const releaseAllSeats = useCallback(async () => {
    if (!showtimeId) return;
    const seats = useBookingStore.getState().selectedSeats;
    if (seats.length === 0) return;
    seats.forEach(seat => emitRelease(showtimeId, seat.id));
    try {
      await bookingsApi.unlockSeats(showtimeId, seats.map(s => s.id));
    } catch {}
  }, [showtimeId, emitRelease]);

  const handleClear = useCallback(async () => {
    await releaseAllSeats();
    clearSelection();
  }, [releaseAllSeats, clearSelection]);


  const handleSeatCountChange = useCallback((n: number) => {
    if (seatCount === n) {
      setSeatCount(null);
      return;
    }
    if (selectedSeats.length > n) handleClear();
    setSeatCount(n);
  }, [seatCount, selectedSeats.length, handleClear]);

  const proceedToCheckout = useCallback(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/booking/${showtimeId}` } });
      return;
    }
    navigate('/checkout');
  }, [isAuthenticated, navigate, showtimeId]);

  return {
    showtimeId,
    showtime,
    selectedSeats,
    lockedSeats,
    timeLeft,
    zoom,
    seatCount,
    totalPrice,
    tierSections,
    seatScrollRef,
    setZoom,
    setSeatCount,
    formatTime,
    handleSeatClick,
    handleSeatCountChange,
    handleClear,
    proceedToCheckout,
    navigate,
  };
};
