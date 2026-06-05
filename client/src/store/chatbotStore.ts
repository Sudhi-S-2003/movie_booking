import { create } from 'zustand';
import { chatbotApi, type Chatbot, type ChatbotListParams } from '../services/api/chatbot.api.js';

interface ChatbotStoreState {
  chatbots: Chatbot[];
  totalPages: number;
  totalCount: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;

  currentChatbot: Chatbot | null;
  loadingCurrent: boolean;

  setPage: (page: number) => void;
  fetchChatbots: (params?: ChatbotListParams) => Promise<void>;
  fetchCurrentChatbot: (id: string) => Promise<void>;
  clearCurrentChatbot: () => void;
  updateCurrentChatbotLocally: (data: Partial<Chatbot>) => void;
  createChatbot: (data: Partial<Chatbot>) => Promise<Chatbot>;
  updateChatbotState: (id: string, data: Partial<Chatbot>) => void;
  deleteChatbotState: (id: string) => void;
}

export const useChatbotStore = create<ChatbotStoreState>((set, get) => ({
  chatbots: [],
  currentChatbot: null,
  loadingCurrent: false,
  totalPages: 1,
  totalCount: 0,
  page: 1,
  limit: 9,
  loading: false,
  error: null,

  setPage: (page) => set({ page }),

  fetchChatbots: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await chatbotApi.list({
        page: get().page,
        limit: get().limit,
        ...params,
      });
      set({
        chatbots: response.chatbots || [],
        totalPages: response.totalPages || 1,
        totalCount: response.total || 0,
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to fetch chatbots' });
      throw err;
    }
  },

  fetchCurrentChatbot: async (id: string) => {
    set({ loadingCurrent: true, error: null });
    try {
      const res = await chatbotApi.getById(id);
      set({ currentChatbot: res.chatbot, loadingCurrent: false });
    } catch (err: any) {
      set({ loadingCurrent: false, error: err.message || 'Failed to fetch chatbot details' });
      throw err;
    }
  },

  clearCurrentChatbot: () => {
    set({ currentChatbot: null });
  },

  updateCurrentChatbotLocally: (data) => {
    set((state) => ({
      currentChatbot: state.currentChatbot ? { ...state.currentChatbot, ...data } : null,
    }));
  },

  createChatbot: async (data) => {
    const response = await chatbotApi.create(data);
    const newChatbot = {
      ...response.chatbot,
      keywordCount: 0,
      templateCount: 0,
      flowStepCount: 0,
      menuCount: 0,
      formFieldCount: 0,
    };
    set((state) => ({
      chatbots: [newChatbot, ...state.chatbots],
      totalCount: state.totalCount + 1,
    }));
    return newChatbot;
  },

  updateChatbotState: (id, data) => {
    set((state) => ({
      chatbots: state.chatbots.map(bot => bot._id === id ? { ...bot, ...data } : bot)
    }));
  },

  deleteChatbotState: (id) => {
    set((state) => ({
      chatbots: state.chatbots.filter(bot => bot._id !== id),
      totalCount: state.totalCount > 0 ? state.totalCount - 1 : 0,
    }));
  }
}));
