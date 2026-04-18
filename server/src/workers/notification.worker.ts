/**
 * notification.worker
 *
 * BullMQ worker that processes notification jobs asynchronously.
 * Failures don't affect the main app — jobs retry with exponential backoff.
 *
 * Responsibilities:
 *   1. new_post_by_followed_user    → notify followers of the author
 *   2. new_post_in_followed_hashtag → notify followers of the hashtag
 *   3. new_follower                 → notify user they gained a follower
 *   4. lost_follower                → notify user they lost a follower
 *   5. post_liked                   → notify post author when liked
 *   6. post_commented               → notify post author when commented
 *   7. booking_confirmation         → send booking receipt
 *   8. system_broadcast             → send bulk system messages
 */
import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../queues/connection.js';
import {
  NOTIFICATION_QUEUE_NAME,
  type NotificationJob,
  type NewPostByUserJob,
  type NewPostInHashtagJob,
  type NewFollowerJob,
  type LostFollowerJob,
  type PostLikedJob,
  type PostCommentedJob,
  type BookingConfirmationJob,
  type SystemBroadcastJob,
} from '../queues/notification.queue.js';
import { createSystemMessage } from '../services/chat/systemMessage.service.js';
import { UserFollow } from '../models/userFollow.model.js';
import { HashtagFollow } from '../models/hashtagFollow.model.js';

// ── Job Handlers ─────────────────────────────────────────────────────────────

const handleNewPostByUser = async (data: NewPostByUserJob) => {
  const followers = await UserFollow.find({ followingId: data.authorId })
    .select('followerId')
    .lean();

  const followerIds = followers.map((f: any) => String(f.followerId));
  if (followerIds.length === 0) return;

  const preview = data.postText.slice(0, 80);
  const title = `${data.authorName}'s Posts`;

  await Promise.allSettled(
    followerIds.map((uid) =>
      createSystemMessage(
        uid,
        title,
        `${data.authorName} published a new post: "${preview}${data.postText.length > 80 ? '...' : ''}"`,
      ),
    ),
  );

  console.log(`[NotifyWorker] Notified ${followerIds.length} followers of user ${data.authorName}`);
};

const handleNewPostInHashtag = async (data: NewPostInHashtagJob) => {
  const followers = await HashtagFollow.find({ hashtagId: data.hashtagId })
    .select('userId')
    .lean();

  const followerIds = followers.map((f: any) => String(f.userId));
  if (followerIds.length === 0) return;

  const preview = data.postText.slice(0, 80);
  const title = `#${data.hashtagTag}`;

  await Promise.allSettled(
    followerIds.map((uid) =>
      createSystemMessage(
        uid,
        title,
        `${data.authorName} posted in #${data.hashtagTag}: "${preview}${data.postText.length > 80 ? '...' : ''}"`,
      ),
    ),
  );

  console.log(`[NotifyWorker] Notified ${followerIds.length} followers of #${data.hashtagTag}`);
};

const handleNewFollower = async (data: NewFollowerJob) => {
  await createSystemMessage(
    data.targetUserId,
    'Followers',
    `${data.followerName} (@${data.followerUsername}) started following you.`,
  );
  console.log(`[NotifyWorker] Sent new-follower notification to ${data.targetUserId}`);
};

const handleLostFollower = async (data: LostFollowerJob) => {
  await createSystemMessage(
    data.targetUserId,
    'Followers',
    `${data.unfollowerName} unfollowed you.`,
  );
  console.log(`[NotifyWorker] Sent lost-follower notification to ${data.targetUserId}`);
};

const handlePostLiked = async (data: PostLikedJob) => {
  await createSystemMessage(
    data.authorId,
    'Post Activity',
    `${data.likerName} liked your post "${data.postTitle}".`,
  );
  console.log(`[NotifyWorker] Sent post-liked notification to ${data.authorId}`);
};

const handlePostCommented = async (data: PostCommentedJob) => {
  const preview = data.commentText.slice(0, 60);
  await createSystemMessage(
    data.authorId,
    'Post Activity',
    `${data.commenterName} commented on "${data.postTitle}": "${preview}${data.commentText.length > 60 ? '...' : ''}"`,
  );
  console.log(`[NotifyWorker] Sent post-commented notification to ${data.authorId}`);
};

const handleBookingConfirmation = async (data: BookingConfirmationJob) => {
  await createSystemMessage(
    data.userId,
    'Booking Confirmations',
    `Your booking is confirmed! ${data.movieTitle} at ${data.theatreName}, ${data.showtime}. Enjoy the show!`,
  );
  console.log(`[NotifyWorker] Sent booking confirmation to ${data.userId}`);
};

const handleSystemBroadcast = async (data: SystemBroadcastJob) => {
  await Promise.allSettled(
    data.userIds.map((uid) => createSystemMessage(uid, data.title, data.text)),
  );
  console.log(`[NotifyWorker] Broadcast "${data.title}" to ${data.userIds.length} users`);
};

// ── Worker Setup ─────────────────────────────────────────────────────────────

const processJob = async (job: Job<NotificationJob>) => {
  const { data } = job;

  switch (data.type) {
    case 'new_post_by_followed_user':
      return handleNewPostByUser(data);
    case 'new_post_in_followed_hashtag':
      return handleNewPostInHashtag(data);
    case 'new_follower':
      return handleNewFollower(data);
    case 'lost_follower':
      return handleLostFollower(data);
    case 'post_liked':
      return handlePostLiked(data);
    case 'post_commented':
      return handlePostCommented(data);
    case 'booking_confirmation':
      return handleBookingConfirmation(data);
    case 'system_broadcast':
      return handleSystemBroadcast(data);
    default:
      console.warn(`[NotifyWorker] Unknown job type: ${(data as any).type}`);
  }
};

let worker: Worker<NotificationJob> | null = null;

export const startNotificationWorker = () => {
  const connection = getRedisConnection();
  if (!connection) {
    console.warn('[NotifyWorker] Redis unavailable — worker not started');
    return;
  }

  worker = new Worker<NotificationJob>(
    NOTIFICATION_QUEUE_NAME,
    processJob,
    {
      connection,
      concurrency: 5,
      limiter: { max: 50, duration: 1000 },
    },
  );

  worker.on('completed', (job) => {
    console.log(`[NotifyWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[NotifyWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[NotifyWorker] Worker error:', err.message);
  });

  console.log('[NotifyWorker] Notification worker started');
};

export const stopNotificationWorker = async () => {
  if (worker) {
    await worker.close();
    console.log('[NotifyWorker] Worker stopped');
  }
};
