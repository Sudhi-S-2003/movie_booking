


export const toast = {
  success: (message: string) => {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type: 'success' } }));
  },
  error: (message: string) => {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type: 'error' } }));
  },
  info: (message: string) => {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type: 'info' } }));
  }
};
