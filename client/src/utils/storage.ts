/**
 * Safe Browser Storage Utility
 *
 * Encapsulates sessionStorage and localStorage interactions. Provides safe try-catch wrappers
 * to prevent DOMException errors when third-party cookies or storage are blocked (e.g., in private/incognito tabs).
 */

const isStorageSupported = (type: 'sessionStorage' | 'localStorage'): boolean => {
  try {
    const storage = window[type];
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return false;
  }
};

const inMemorySession: Record<string, string> = {};
const inMemoryLocal: Record<string, string> = {};

export const safeSession = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined' && isStorageSupported('sessionStorage')) {
      try {
        return sessionStorage.getItem(key);
      } catch (e) {
        // Fallback to memory
      }
    }
    return inMemorySession[key] ?? null;
  },

  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined' && isStorageSupported('sessionStorage')) {
      try {
        sessionStorage.setItem(key, value);
        return;
      } catch (e) {
        // Fallback to memory
      }
    }
    inMemorySession[key] = value;
  },

  removeItem: (key: string): void => {
    if (typeof window !== 'undefined' && isStorageSupported('sessionStorage')) {
      try {
        sessionStorage.removeItem(key);
        return;
      } catch (e) {
        // Fallback to memory
      }
    }
    delete inMemorySession[key];
  }
};

export const safeLocal = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined' && isStorageSupported('localStorage')) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        // Fallback to memory
      }
    }
    return inMemoryLocal[key] ?? null;
  },

  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined' && isStorageSupported('localStorage')) {
      try {
        localStorage.setItem(key, value);
        return;
      } catch (e) {
        // Fallback to memory
      }
    }
    inMemoryLocal[key] = value;
  },

  removeItem: (key: string): void => {
    if (typeof window !== 'undefined' && isStorageSupported('localStorage')) {
      try {
        localStorage.removeItem(key);
        return;
      } catch (e) {
        // Fallback to memory
      }
    }
    delete inMemoryLocal[key];
  }
};
