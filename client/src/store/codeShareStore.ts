import { create } from 'zustand';
import { http } from '../services/api/http.js';
import { toast } from '../utils/toast.js';

interface CodeSharePage {
  title: string;
  code: string;
  totalLength: number;
  nextChunkId?: string;
  hasMore: boolean;
  createdAt: string;
}

interface CodeShareState {
  id: string | null;
  category: string | null;
  signature: string | null;
  expiresAt: string | null;
  
  // Data
  pages: CodeSharePage[];
  fullCode: string;
  meta: CodeSharePage | null;
  
  // Status
  isLoading: boolean;
  isFetchingNext: boolean;
  isSaving: boolean;
  isFetchingFull: boolean;
  uploadProgress: number;
  hasNextPage: boolean;
  nextChunkId: string | undefined;

  // Actions
  init: (params: { id: string; category: string; signature: string; expiresAt: string }) => Promise<void>;
  loadMore: () => Promise<void>;
  ensureFull: () => Promise<string>;
  save: (newCode: string) => Promise<void>;
  reset: () => void;
}

export const useCodeShareStore = create<CodeShareState>((set, get) => ({
  id: null,
  category: null,
  signature: null,
  expiresAt: null,
  pages: [],
  fullCode: '',
  meta: null,
  isLoading: false,
  isFetchingNext: false,
  isSaving: false,
  isFetchingFull: false,
  uploadProgress: 0,
  hasNextPage: false,
  nextChunkId: undefined,

  init: async ({ id, category, signature, expiresAt }) => {
    set({ id, category, signature, expiresAt, isLoading: true, pages: [], fullCode: '', meta: null });
    try {
      const res: any = await http.get(`/public/api-service/${category}/${id}`, { params: { signature, expiresAt } });
      set({ 
        meta: res.data, 
        fullCode: res.data.code, 
        hasNextPage: res.data.hasMore,
        nextChunkId: res.data.nextChunkId,
        isLoading: false 
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to load code share');
      set({ isLoading: false });
    }
  },

  loadMore: async () => {
    if (get().isFetchingNext || !get().nextChunkId) return;
    set({ isFetchingNext: true });
    try {
      const res: any = await http.get(`/public/api-service/${get().category}/${get().id}`, { 
        params: { 
          signature: get().signature, 
          expiresAt: get().expiresAt,
          chunkId: get().nextChunkId
        } 
      });
      set({
        fullCode: get().fullCode + res.data.code,
        hasNextPage: res.data.hasMore,
        nextChunkId: res.data.nextChunkId,
        isFetchingNext: false
      });
    } catch (err: any) {
      toast.error('Failed to load more chunks');
      set({ isFetchingNext: false });
    }
  },

  ensureFull: async () => {
    if (get().isFetchingFull) return get().fullCode;
    set({ isFetchingFull: true });
    try {
      while (get().hasNextPage) {
        await get().loadMore();
      }
      return get().fullCode;
    } finally {
      set({ isFetchingFull: false });
    }
  },

  save: async (newCode: string) => {
    const { id, category, signature, expiresAt, meta } = get();
    if (!id || !category) return;

    set({ isSaving: true, uploadProgress: 0 });
    try {
      const CHUNK_SIZE = 30000;
      const chunks = [];
      // Precise slicing to ensure zero data loss (no trimming)
      for (let i = 0; i < newCode.length; i += CHUNK_SIZE) {
        chunks.push(newCode.slice(i, i + CHUNK_SIZE));
      }

      const commonParams = { signature, expiresAt };
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
            if (i === 0) payload.title = meta?.title;

            const res: any = await http.post(`/public/api-service/${category}/${id}`, payload, { params: commonParams });
            lastChunkId = res.data.chunkId;
            success = true;
          } catch (err) {
            retryCount++;
            if (retryCount >= MAX_RETRIES) throw err;
            // Exponential backoff before retry
            await new Promise(r => setTimeout(r, 1000 * retryCount));
          }
        }
        
        set({ uploadProgress: Math.round(((i + 1) / chunks.length) * 100) });
      }

      toast.success('Snippet updated successfully');
      // Update local state instead of full re-init to keep the full code in memory
      set({ fullCode: newCode, isLoading: true });
      await get().init({ id, category, signature: signature!, expiresAt: expiresAt! });
      // We re-init to get the new totalLength/meta, but init resets fullCode.
      // So we must restore the fullCode if it was a large file.
      set({ fullCode: newCode }); 
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save changes');
    } finally {
      set({ isSaving: false, uploadProgress: 0 });
    }
  },

  reset: () => set({
    id: null,
    category: null,
    signature: null,
    expiresAt: null,
    pages: [],
    fullCode: '',
    meta: null,
    hasNextPage: false,
    nextChunkId: undefined
  })
}));
