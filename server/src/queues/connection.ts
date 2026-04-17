/**
 * Shared Redis/IORedis connection for BullMQ queues and workers.
 *
 * All queues and workers import from here so there's exactly one
 * connection configuration. Falls back gracefully if Redis is down
 * (notifications degrade, app keeps running).
 */
import IORedis from 'ioredis';
import type { Redis } from 'ioredis';
import { env } from '../env.js';

let connection: Redis | null = null;
let connectionFailed = false;

export const getRedisConnection = (): Redis | null => {
  if (connectionFailed) return null;
  if (connection) return connection;

  try {
    const RedisConstructor = (IORedis as any).default ?? IORedis;
    connection = new RedisConstructor(env.REDIS_URL, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck:     false,
      retryStrategy:        (times: number) => Math.min(times * 200, 5000),
    }) as Redis;

    connection.on('error', (err: Error) => {
      console.warn('[Redis] Connection error:', err.message);
    });

    connection.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    return connection;
  } catch (e: any) {
    console.warn('[Redis] Failed to create connection:', e?.message);
    connectionFailed = true;
    return null;
  }
};

/** Check if Redis is available. */
export const isRedisAvailable = (): boolean =>
  connection !== null && connection.status === 'ready';
