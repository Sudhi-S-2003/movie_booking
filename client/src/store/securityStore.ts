import { create } from 'zustand';
import { authApi } from '../services/api/auth.api.js';
import { passkeyService } from '../services/passkey.service.js';

interface PasskeyItem {
  _id: string;
  friendlyName: string;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  createdAt: string;
}

interface SecurityState {
  passkeys: PasskeyItem[];
  loading: boolean;
  error: string | null;
  success: string | null;
  fetchPasskeys: () => Promise<void>;
  addPasskey: (friendlyName: string) => Promise<void>;
  deletePasskey: (id: string) => Promise<void>;
  clearMessages: () => void;
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  passkeys: [],
  loading: false,
  error: null,
  success: null,
  fetchPasskeys: async () => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.listPasskeys();
      set({ passkeys: res.passkeys, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to list passkeys', loading: false });
    }
  },
  addPasskey: async (friendlyName: string) => {
    set({ loading: true, error: null, success: null });
    try {
      await passkeyService.register(friendlyName);
      set({ success: `Passkey "${friendlyName}" registered successfully!`, loading: false });
      await get().fetchPasskeys();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Passkey registration failed';
      set({ error: msg, loading: false });
      throw err;
    }
  },
  deletePasskey: async (id: string) => {
    set({ loading: true, error: null, success: null });
    try {
      await authApi.deletePasskey(id);
      set({ success: 'Passkey removed successfully.', loading: false });
      await get().fetchPasskeys();
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete passkey', loading: false });
    }
  },
  clearMessages: () => set({ error: null, success: null })
}));
export default useSecurityStore;
