import { useToastStore } from '../store/toastStore.js';

export const toast = {
  loading: (message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(7);
    useToastStore.getState().addToast({ id, message, type: 'loading' });
    return id;
  },
  success: (message: string, id?: string | number) => {
    if (id) useToastStore.getState().updateToast(id, { message, type: 'success' });
    else useToastStore.getState().addToast({ message, type: 'success' });
  },
  error: (message: string, id?: string | number) => {
    if (id) useToastStore.getState().updateToast(id, { message, type: 'error' });
    else useToastStore.getState().addToast({ message, type: 'error' });
  },
  info: (message: string, id?: string | number) => {
    if (id) useToastStore.getState().updateToast(id, { message, type: 'info' });
    else useToastStore.getState().addToast({ message, type: 'info' });
  },
  promise: async <T>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    }
  ) => {
    const id = toast.loading(msgs.loading);
    try {
      const data = await promise;
      toast.success(
        typeof msgs.success === 'function' ? msgs.success(data) : msgs.success,
        id
      );
      return data;
    } catch (err) {
      toast.error(
        typeof msgs.error === 'function' ? msgs.error(err) : msgs.error,
        id
      );
      throw err;
    }
  }
};
