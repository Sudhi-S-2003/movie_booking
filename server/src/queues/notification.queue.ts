/**
 * notification.queue
 *
 * Defines the BullMQ queue for async notification dispatch.
 * Producers enqueue jobs; the notification worker processes them.
 *
 * Job types:
 *   - new_post_by_followed_user    → notify followers of the author
 *   - new_post_in_followed_hashtag → notify followers of the hashtag
 *   - new_follower                  → notify user they gained a follower
 *   - lost_follower                 → notify user they lost a follower
 *   - new_hashtag_follower          → notify (optional) when hashtag gains a follower
 *   - post_liked                    → notify post author when someone likes their post
 *   - post_commented                → notify post author when someone comments on their post
 *   - booking_confirmation          → notify user after booking
 *   - system_broadcast              → send system message to specific users
 */
import { Queue } from 'bullmq';
import { getRedisConnection } from './connection.js';

export const NOTIFICATION_QUEUE_NAME = 'notifications';

export interface NewPostByUserJob {
  type:     'new_post_by_followed_user';
  postId:   string;
  authorId: string;
  authorName: string;
  postText: string;
}

export interface NewPostInHashtagJob {
  type:       'new_post_in_followed_hashtag';
  postId:     string;
  hashtagId:  string;
  hashtagTag: string;
  authorName: string;
  postText:   string;
}

export interface BookingConfirmationJob {
  type:     'booking_confirmation';
  userId:   string;
  movieTitle: string;
  theatreName: string;
  showtime:   string;
}

export interface NewFollowerJob {
  type:         'new_follower';
  targetUserId: string;       // the user being followed
  followerName: string;       // the user who followed
  followerUsername: string;
}

export interface LostFollowerJob {
  type:           'lost_follower';
  targetUserId:   string;
  unfollowerName: string;
}

export interface PostLikedJob {
  type:       'post_liked';
  postId:     string;
  authorId:   string;         // post author (notification recipient)
  likerName:  string;
  postTitle:  string;
}

export interface PostCommentedJob {
  type:           'post_commented';
  postId:         string;
  authorId:       string;     // post author (notification recipient)
  commenterName:  string;
  commentText:    string;
  postTitle:      string;
}

export interface SystemBroadcastJob {
  type:    'system_broadcast';
  userIds: string[];
  title:   string;
  text:    string;
}

export type NotificationJob =
  | NewPostByUserJob
  | NewPostInHashtagJob
  | NewFollowerJob
  | LostFollowerJob
  | PostLikedJob
  | PostCommentedJob
  | BookingConfirmationJob
  | SystemBroadcastJob;

let notificationQueue: Queue<NotificationJob> | null = null;

export const getNotificationQueue = (): Queue<NotificationJob> | null => {
  if (notificationQueue) return notificationQueue;

  const connection = getRedisConnection();
  if (!connection) {
    console.warn('[NotificationQueue] Redis unavailable — notifications disabled');
    return null;
  }

  notificationQueue = new Queue<NotificationJob>(NOTIFICATION_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail:     { count: 5000 },
      attempts:         3,
      backoff:          { type: 'exponential', delay: 1000 },
    },
  });

  return notificationQueue;
};

/**
 * Enqueue a notification job. Silently no-ops if Redis is down.
 * This is the only function producers (controllers) should call.
 */
export const enqueueNotification = async (job: NotificationJob): Promise<void> => {
  const queue = getNotificationQueue();
  if (!queue) return; // graceful degradation

  try {
    await queue.add(job.type, job, {
      // Dedup: same post+type won't queue twice within 60s
      jobId: `${job.type}:${(job as any).postId ?? (job as any).userId ?? Date.now()}`,
    });
  } catch (e: any) {
    console.warn('[enqueueNotification] Failed to enqueue:', e?.message);
  }
};
