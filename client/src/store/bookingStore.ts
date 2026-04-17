import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SeatSelection {
  id: string; 
  price: number;
}

interface BookingState {
  selectedCity: string | null;
  searchQuery: string;
  selectedSeats: SeatSelection[];
  currentShowtimeId: string | null;
  activeReservationIds: string[];
  seatReservationMap: Record<string, string>;
  setCity: (city: string) => void;
  setSearchQuery: (query: string) => void;
  toggleSeat: (seatId: string, price: number) => void;
  addReservationId: (id: string, seatId?: string) => void;
  removeReservationId: (id: string) => void;
  getReservationIdBySeat: (seatId: string) => string | undefined;
  clearSelection: () => void;
  setShowtime: (showtimeId: string) => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      selectedCity: 'Mumbai',
      searchQuery: '',
      selectedSeats: [],
      currentShowtimeId: null,
      activeReservationIds: [],
      seatReservationMap: {},
      setCity: (city) => set({ selectedCity: city }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setShowtime: (showtimeId) => set((state) => {
        if (state.currentShowtimeId === showtimeId) {
          return state;
        }
        return {
          currentShowtimeId: showtimeId,
          selectedSeats: [],
          activeReservationIds: [],
          seatReservationMap: {},
        };
      }),
      addReservationId: (id, seatId) => set((state) => ({
        activeReservationIds: [...state.activeReservationIds, id],
        seatReservationMap: seatId
          ? { ...state.seatReservationMap, [seatId]: id }
          : state.seatReservationMap,
      })),
      removeReservationId: (id) => set((state) => {
        const newMap = { ...state.seatReservationMap };
        for (const [seat, resId] of Object.entries(newMap)) {
          if (resId === id) { delete newMap[seat]; break; }
        }
        return {
          activeReservationIds: state.activeReservationIds.filter(rid => rid !== id),
          seatReservationMap: newMap,
        };
      }),
      getReservationIdBySeat: (seatId) => get().seatReservationMap[seatId],
      toggleSeat: (seatId, price) => set((state) => {
        const exists = state.selectedSeats.find(s => s.id === seatId);
        if (exists) {
          const resId = state.seatReservationMap[seatId];
          const { [seatId]: _, ...restMap } = state.seatReservationMap;
          return {
            selectedSeats: state.selectedSeats.filter(s => s.id !== seatId),
            activeReservationIds: resId
              ? state.activeReservationIds.filter(rid => rid !== resId)
              : state.activeReservationIds,
            seatReservationMap: restMap,
          };
        }
        if (state.selectedSeats.length >= 10) return state; 
        return { selectedSeats: [...state.selectedSeats, { id: seatId, price }] };
      }),
      clearSelection: () => set({
        selectedSeats: [],
        activeReservationIds: [],
        seatReservationMap: {},
      }),
    }),
    {
      name: 'cinema-connect-booking',
    }
  )
);
