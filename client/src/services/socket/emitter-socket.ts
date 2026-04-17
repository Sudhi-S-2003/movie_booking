import type { Socket } from 'socket.io-client';
import { createSocket } from './connection.js';


export type SocketEventHandler<T = any> = (payload: T) => void;

export abstract class EmitterSocket {
  protected readonly socket: Socket;
  private readonly listeners = new Map<string, Set<SocketEventHandler>>();
  private connectCount = 0;          // ref-count for connect/disconnect
  private onReconnectCallbacks: (() => void)[] = [];

  protected constructor(namespace: string, authenticated = false) {
    this.socket = createSocket(namespace, authenticated);

    // Re-run all registered reconnect callbacks when socket reconnects
    this.socket.on('connect', () => {
      // skip the very first connect — it's not a *re*connect
      if (this.socket.recovered) return;
      // On reconnect: re-join rooms, refetch data
      this.onReconnectCallbacks.forEach((cb) => cb());
    });

    this.socket.on('connect_error', (err) => {
      console.warn(`[Socket ${namespace}] connect_error:`, err.message);
    });
  }

  connect() {
    this.connectCount++;
    if (!this.socket.connected) this.socket.connect();
  }

  disconnect() {
    this.connectCount = Math.max(0, this.connectCount - 1);
    // Only truly disconnect when no consumers remain
    if (this.connectCount === 0) {
      this.socket.disconnect();
    }
  }

  on<T = any>(event: string, callback: SocketEventHandler<T>): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(callback as SocketEventHandler);
    return () => { bucket!.delete(callback as SocketEventHandler); };
  }

  /**
   * Register a callback that runs on every socket reconnect.
   * Returns an unsubscribe function.
   */
  onReconnect(callback: () => void): () => void {
    this.onReconnectCallbacks.push(callback);
    return () => {
      this.onReconnectCallbacks = this.onReconnectCallbacks.filter((cb) => cb !== callback);
    };
  }

  protected forward(event: string) {
    this.socket.on(event, (payload: any) => this.fanOut(event, payload));
  }

  private fanOut(event: string, payload: any) {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    bucket.forEach((cb) => cb(payload));
  }
}
