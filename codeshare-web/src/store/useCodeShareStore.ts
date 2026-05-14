import { create } from 'zustand';
import axios from 'axios';
import { CodeShare, CodeShareChunk, CodeShareResponse } from '../types/codeshare';

interface CodeShareState {
  // Data
  id: string | null;
  category: string | null;
  signature: string | null;
  expiresAt: string | null;
  
  meta: CodeShare | null;
  fullCode: string;
  chunks: CodeShareChunk[];
  
  // Status
  isLoading: boolean;
  isSaving: boolean;
  isFetchingNext: boolean;
  isEagerFetching: boolean;
  uploadProgress: number;
  hasNextPage: boolean;
  nextChunkId: string | undefined;

  // Actions
  init: (params: { id: string; category: string; signature: string; expiresAt: string }) => Promise<void>;
  appendChunk: (data: CodeShareResponse) => void;
  loadMore: () => Promise<void>;
  eagerFetchAll: () => Promise<void>;
  save: (newCode: string) => Promise<void>;
  reset: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/public/api-service';

export const useCodeShareStore = create<CodeShareState>((set, get) => ({
  id: null,
  category: null,
  signature: null,
  expiresAt: null,
  meta: null,
  fullCode: '',
  chunks: [],
  isLoading: false,
  isSaving: false,
  isFetchingNext: false,
  isEagerFetching: false,
  uploadProgress: 0,
  hasNextPage: false,
  nextChunkId: undefined,

  init: async ({ id, category, signature, expiresAt }) => {
    set({ id, category, signature, expiresAt, isLoading: true, fullCode: '', chunks: [], nextChunkId: undefined });
    try {
      const res = await axios.get(`${API_BASE}/${category}/${id}`, {
        params: { signature, expiresAt }
      });
      
      const data: CodeShareResponse = res.data.data;
      set({
        fullCode: data.code,
        hasNextPage: data.hasMore,
        nextChunkId: data.nextChunkId,
        isLoading: false
      });
    } catch (err) {
      console.error('Failed to init code share', err);
      set({ isLoading: false });
    }
  },

  appendChunk: (data) => {
    set((state) => ({
      fullCode: state.fullCode + data.code,
      hasNextPage: data.hasMore,
      nextChunkId: data.nextChunkId
    }));
  },

  loadMore: async () => {
    const { id, category, signature, expiresAt, nextChunkId, isFetchingNext } = get();
    if (isFetchingNext || !nextChunkId) return;

    set({ isFetchingNext: true });
    try {
      const res = await axios.get(`${API_BASE}/${category}/${id}`, {
        params: { signature, expiresAt, chunkId: nextChunkId }
      });
      
      const data: CodeShareResponse = res.data.data;
      get().appendChunk(data);
    } catch (err) {
      console.error('Failed to load more chunks', err);
    } finally {
      set({ isFetchingNext: false });
    }
  },

  eagerFetchAll: async () => {
    if (get().isEagerFetching) return;
    set({ isEagerFetching: true });
    try {
      while (get().hasNextPage) {
        await get().loadMore();
      }
    } finally {
      set({ isEagerFetching: false });
    }
  },

  save: async (newCode: string) => {
    const { id, category, signature, expiresAt } = get();
    if (!id || !category) return;

    set({ isSaving: true, uploadProgress: 0 });
    
    try {
      // Logic for Web Worker will be integrated here
      // For now, simple chunked upload logic
      const CHUNK_SIZE = 30000;
      const chunks = [];
      for (let i = 0; i < newCode.length; i += CHUNK_SIZE) {
        chunks.push(newCode.slice(i, i + CHUNK_SIZE));
      }

      let lastChunkId = null;
      for (let i = 0; i < chunks.length; i++) {
        let retryCount = 0;
        const MAX_RETRIES = 3;
        let success = false;

        while (retryCount < MAX_RETRIES && !success) {
          try {
            const payload: any = {
              action: 'update',
              code: chunks[i],
              prevChunkId: lastChunkId
            };
            
            const res = await axios.post(`${API_BASE}/${category}/${id}`, payload, {
              params: { signature, expiresAt }
            });
            
            lastChunkId = res.data.data.chunkId;
            success = true;
          } catch (err) {
            retryCount++;
            if (retryCount >= MAX_RETRIES) throw err;
            await new Promise(r => setTimeout(r, 1000 * retryCount));
          }
        }
        set({ uploadProgress: Math.round(((i + 1) / chunks.length) * 100) });
      }
      
      set({ fullCode: newCode });
    } catch (err) {
      console.error('Failed to save code share', err);
    } finally {
      set({ isSaving: false, uploadProgress: 0 });
    }
  },

  reset: () => set({
    id: null,
    category: null,
    signature: null,
    expiresAt: null,
    meta: null,
    fullCode: '',
    chunks: [],
    hasNextPage: false,
    nextChunkId: undefined
  })
}));
