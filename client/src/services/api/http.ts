// ─────────────────────────────────────────────────────────────────────────────
// Typed HTTP client
//
// Thin wrapper around axios that:
//   1. Attaches the auth bearer token on every request
//   2. Centralizes 401 handling (logout + redirect)
//   3. Unwraps the server's `{ success, ...payload }` envelope so callers
//      receive just the payload — e.g. `const { movies } = await http.get(...)`
//   4. Converts failure envelopes into thrown `ApiError`s with typed fields
//
// Every domain service (movies.api.ts, bookings.api.ts, ...) should import
// `http` from here and NEVER touch axios directly.
// ─────────────────────────────────────────────────────────────────────────────

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { useAuthStore } from '../../store/authStore.js';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';


/** Structured error thrown whenever a request fails (network or server-side). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(message: string, status: number, code = 'UNKNOWN', fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (fieldErrors) this.fieldErrors = fieldErrors;
  }
}

/** Options we pass through to axios on every call. */
export interface RequestOptions {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

const axiosClient: AxiosInstance = axios.create({
  baseURL: API_URL,
});

axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * We skip the auto-redirect to /login when the user is on a signed-URL
 * chat page (`/chat/:id?signature=...`). Those pages authenticate via the
 * URL signature, not via JWT — a stray 401 on an unrelated background
 * call (e.g. the auth store containing a stale token from a previous
 * session) must not navigate the iframe off the chat widget.
 */
const isSignedChatContext = (): boolean => {
  if (typeof window === 'undefined') return false;
  const { pathname, search } = window.location;
  if (!pathname.startsWith('/chat/')) return false;
  return new URLSearchParams(search).has('signature');
};

axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string> }>) => {
    if (error.response?.status === 401) {
      if (isSignedChatContext()) {
        // Guest flow — don't touch the auth store, don't redirect the iframe.
        return Promise.reject(error);
      }
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Drop `undefined` values from an options object before handing it to axios.
 * Needed for `exactOptionalPropertyTypes` compatibility in service call sites.
 */
const cleanConfig = (opts?: RequestOptions): AxiosRequestConfig => {
  if (!opts) return {};
  const config: AxiosRequestConfig = {};
  if (opts.params !== undefined) config.params = opts.params;
  if (opts.headers !== undefined) config.headers = opts.headers;
  if (opts.signal !== undefined) config.signal = opts.signal;
  return config;
};

/**
 * Unwrap a server response envelope, throwing an ApiError on non-success.
 *
 * The server convention is `res.json({ success: true, ...payload })`, so the
 * full response body is shaped like `{ success: boolean, <keys> }`. We strip
 * `success` and return the rest as the typed payload.
 */
const unwrap = <T>(response: AxiosResponse<Record<string, unknown>>): T => {
  const body = response.data;
  if (body && body['success'] === false) {
    throw new ApiError(
      (body['message'] as string) ?? 'Request failed',
      response.status,
      'API_ERROR',
      body['errors'] as Record<string, string> | undefined,
    );
  }
  // Strip the envelope flag so callers get just the payload keys.
  if (body && typeof body === 'object' && 'success' in body) {
    const { success: _ignored, ...payload } = body;
    return payload as T;
  }
  return body as T;
};

/** Normalize axios errors into ApiError so callers can `catch (e: ApiError)`. */
const toApiError = (err: unknown): ApiError => {
  if (err instanceof ApiError) return err;
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 0;
    const body = err.response?.data as
      | { message?: string; errors?: Record<string, string> }
      | undefined;
    return new ApiError(
      body?.message ?? err.message ?? 'Network error',
      status,
      err.code ?? 'NETWORK_ERROR',
      body?.errors,
    );
  }
  if (err instanceof Error) return new ApiError(err.message, 0, 'UNKNOWN');
  return new ApiError('Unknown error', 0, 'UNKNOWN');
};

const run = async <T>(fn: () => Promise<AxiosResponse<Record<string, unknown>>>): Promise<T> => {
  try {
    const res = await fn();
    return unwrap<T>(res);
  } catch (err) {
    throw toApiError(err);
  }
};

/** The singleton typed HTTP client. All domain services call through this. */
export const http = {
  get:    <T>(url: string, opts?: RequestOptions) =>
    run<T>(() => axiosClient.get(url, cleanConfig(opts))),

  post:   <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    run<T>(() => axiosClient.post(url, body, cleanConfig(opts))),

  put:    <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    run<T>(() => axiosClient.put(url, body, cleanConfig(opts))),

  patch:  <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    run<T>(() => axiosClient.patch(url, body, cleanConfig(opts))),

  delete: <T>(url: string, opts?: RequestOptions) =>
    run<T>(() => axiosClient.delete(url, cleanConfig(opts))),
};
