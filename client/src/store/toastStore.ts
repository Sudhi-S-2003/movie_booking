import { create } from 'zustand';

export interface AppToast {
  id: number | string;
  message: string;
  type: 'success' | 'error' | 'info' | 'loading';
}

interface ToastStore {
  toasts: AppToast[];
  addToast: (toast: Omit<AppToast, 'id'> & { id?: number | string }) => void;
  updateToast: (id: number | string, toast: Partial<AppToast>) => void;
  removeToast: (id: number | string) => void;
}

const timeouts = new Map<number | string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  addToast: (toast) => {
    // Generate a unique ID if not provided
    const id = toast.id || (Date.now() + Math.floor(Math.random() * 1000));
    set((state) => ({ toasts: [...state.toasts, { ...toast, id } as AppToast] }));
    
    // Auto-remove after 4 seconds for non-loading toasts
    if (toast.type !== 'loading') {
      const timeout = setTimeout(() => get().removeToast(id), 4000);
      timeouts.set(id, timeout);
    }
  },
  updateToast: (id, updatedToast) => {
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, ...updatedToast } : t)),
    }));

    // If updated to a non-loading state, set a new dismiss timeout
    if (updatedToast.type && updatedToast.type !== 'loading') {
      if (timeouts.has(id)) {
        clearTimeout(timeouts.get(id));
      }
      const timeout = setTimeout(() => get().removeToast(id), 4000);
      timeouts.set(id, timeout);
    }
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    if (timeouts.has(id)) {
      clearTimeout(timeouts.get(id));
      timeouts.delete(id);
    }
  },
}));
