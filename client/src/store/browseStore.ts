import { create } from 'zustand';
import { moviesApi } from '../services/api/index.js';
import { theatresApi } from '../services/api/index.js';

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Movies ────────────────────────────────────────────────────────────────────

export interface MoviesFilters {
  status: string;
  genre: string;
  search: string;
}

const MOVIES_DEFAULTS: MoviesFilters = { status: 'now-showing', genre: '', search: '' };
const MOVIES_LIMIT = 20;

interface MoviesState {
  movies: any[];
  filters: MoviesFilters;
  page: number;
  pagination: Pagination | null;
  loading: boolean;

  setFilters: (f: Partial<MoviesFilters>) => void;
  setPage: (p: number) => void;
  resetFilters: () => void;
  fetch: () => Promise<void>;
}

export const useMoviesStore = create<MoviesState>((set, get) => ({
  movies: [],
  filters: MOVIES_DEFAULTS,
  page: 1,
  pagination: null,
  loading: false,

  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f }, page: 1 })),
  setPage: (p) => set({ page: p }),
  resetFilters: () => set({ filters: MOVIES_DEFAULTS, page: 1 }),

  fetch: async () => {
    set({ loading: true });
    const { filters, page } = get();
    try {
      const res = await moviesApi.list({
        status: filters.status || undefined,
        genre: filters.genre || undefined,
        q: filters.search || undefined,
        page,
        limit: MOVIES_LIMIT,
      } as any);
      set({ movies: res.movies, pagination: res.pagination as Pagination });
    } catch (err) {
      console.error('Failed to fetch movies:', err);
    } finally {
      set({ loading: false });
    }
  },
}));

// ── Theatres ──────────────────────────────────────────────────────────────────

export interface TheatresFilters {
  search: string;
}

const THEATRES_DEFAULTS: TheatresFilters = { search: '' };
const THEATRES_LIMIT = 12;

interface TheatresState {
  theatres: any[];
  filters: TheatresFilters;
  page: number;
  pagination: Pagination | null;
  loading: boolean;

  setFilters: (f: Partial<TheatresFilters>) => void;
  setPage: (p: number) => void;
  resetFilters: () => void;
  fetch: (city: string | null) => Promise<void>;
}

export const useTheatresStore = create<TheatresState>((set, get) => ({
  theatres: [],
  filters: THEATRES_DEFAULTS,
  page: 1,
  pagination: null,
  loading: false,

  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f }, page: 1 })),
  setPage: (p) => set({ page: p }),
  resetFilters: () => set({ filters: THEATRES_DEFAULTS, page: 1 }),

  fetch: async (city) => {
    set({ loading: true });
    const { filters, page } = get();
    try {
      const res = await theatresApi.list({
        city: city ?? undefined,
        q: filters.search || undefined,
        page,
        limit: THEATRES_LIMIT,
      });
      set({ theatres: res.theatres, pagination: res.pagination as Pagination });
    } catch (err) {
      console.error('Failed to fetch theatres:', err);
    } finally {
      set({ loading: false });
    }
  },
}));
