import type { Socket } from 'socket.io-client';
import { createSocket } from './connection.js';

export type SocketEventHandler<T = any> = (payload: T) => void;

/**
 * How long to hold the underlying socket open after the last consumer calls
 * `disconnect()`. Covers React StrictMode double-mount and quick route
 * toggles so we don't churn the connection.
 */
const DISCONNECT_GRACE_MS = 2_000;

/**
 * Base class for per-namespace socket services.
 *
 * Responsibilities beyond plain socket.io-client:
 *  - Ref-counted connect/disconnect with a grace period for brief remounts.
 *  - Fires `onReconnect` callbacks on every post-initial `connect` — callers
 *    use them to rejoin rooms and refetch anything that may have shifted
 *    while we were offline.
 *  - Listens to the window's `online` and `visibilitychange` events and
 *    pokes a disconnected socket to reconnect immediately, bypassing
 *    socket.io's backoff timer after a long tab sleep / lost Wi-Fi.
 */
export abstract class EmitterSocket {
  protected readonly socket: Socket;

  private readonly listeners = new Map<string, Set<SocketEventHandler>>();
  private onReconnectCallbacks: (() => void)[] = [];

  // Ref-count so multiple hooks can share one socket without killing it.
  private connectCount = 0;
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Track whether we've seen the first successful connect yet; only
  // subsequent connects count as "reconnect" for callback purposes.
  private everConnected = false;

  // Cleanup bag for global listeners attached in the constructor.
  private readonly teardown: Array<() => void> = [];

  protected constructor(namespace: string, authenticated = false) {
    this.socket = createSocket(namespace, authenticated);

    this.socket.on('connect', () => {
      const wasReconnect = this.everConnected;
      this.everConnected = true;
      if (wasReconnect) {
        // Fire rejoin/refetch callbacks on every reconnection, regardless of
        // whether the socket.io server enabled state-recovery. Double-fetch
        // is cheap; missing events is a silent bug.
        this.onReconnectCallbacks.forEach((cb) => {
          try { cb(); } catch (err) { console.error(`[Socket ${namespace}] reconnect cb:`, err); }
        });
      }
    });

    this.socket.on('disconnect', (reason: Socket.DisconnectReason) => {
      // "io server disconnect" means the server intentionally kicked us
      // (e.g. during a deploy or auth revocation). socket.io's default
      // reconnection logic does NOT retry in that case — we force it.
      if (reason === 'io server disconnect' && this.connectCount > 0) {
        // Small delay lets the server finish whatever it's doing.
        setTimeout(() => {
          if (this.connectCount > 0 && !this.socket.connected) this.socket.connect();
        }, 1_000);
      }
    });

    this.socket.on('connect_error', (err) => {
      console.warn(`[Socket ${namespace}] connect_error:`, err.message);
    });

    // Global listeners: poke the socket when the environment signals that
    // connectivity may have been restored. socket.io's own backoff timer
    // often waits longer than the user is willing to.
    this.teardown.push(onWindow('online', () => this.pokeReconnect()));
    this.teardown.push(onWindow('focus',  () => this.pokeReconnect()));
    this.teardown.push(onDocument('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.pokeReconnect();
    }));
  }

  // ── Connection lifecycle ─────────────────────────────────────────────────

  connect() {
    this.connectCount++;
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
    if (!this.socket.connected) this.socket.connect();
  }

  disconnect() {
    this.connectCount = Math.max(0, this.connectCount - 1);
    if (this.connectCount > 0) return;

    // Defer the real disconnect so a quick remount doesn't destroy the socket.
    if (this.disconnectTimer) clearTimeout(this.disconnectTimer);
    this.disconnectTimer = setTimeout(() => {
      if (this.connectCount === 0 && this.socket.connected) {
        this.socket.disconnect();
      }
      this.disconnectTimer = null;
    }, DISCONNECT_GRACE_MS);
  }

  /** Force an immediate reconnect attempt when we know the network is up again. */
  private pokeReconnect() {
    if (this.connectCount === 0) return;
    if (this.socket.connected) return;
    // Clear any pending reconnect timer inside socket.io-client so it tries NOW.
    this.socket.connect();
  }

  // ── Event pub/sub ────────────────────────────────────────────────────────

  on<T = any>(event: string, callback: SocketEventHandler<T>): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(callback as SocketEventHandler);
    return () => { bucket!.delete(callback as SocketEventHandler); };
  }

  /** Register a callback invoked on every post-initial socket reconnect. */
  onReconnect(callback: () => void): () => void {
    this.onReconnectCallbacks.push(callback);
    return () => {
      this.onReconnectCallbacks = this.onReconnectCallbacks.filter((cb) => cb !== callback);
    };
  }

  /** Is the socket currently connected? */
  get connected(): boolean {
    return this.socket.connected;
  }

  protected forward(event: string) {
    this.socket.on(event, (payload: unknown) => this.fanOut(event, payload));
  }

  private fanOut(event: string, payload: unknown) {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    bucket.forEach((cb) => cb(payload));
  }

  /** Teardown when the app is unloading (tests / HMR). */
  dispose() {
    this.teardown.splice(0).forEach((fn) => fn());
    if (this.disconnectTimer) clearTimeout(this.disconnectTimer);
    this.socket.disconnect();
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const onWindow = (event: string, fn: () => void): (() => void) => {
  window.addEventListener(event, fn);
  return () => window.removeEventListener(event, fn);
};

const onDocument = (event: string, fn: () => void): (() => void) => {
  document.addEventListener(event, fn);
  return () => document.removeEventListener(event, fn);
};
