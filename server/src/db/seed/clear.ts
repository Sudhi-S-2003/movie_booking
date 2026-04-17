import { User } from '../../models/user.model.js';
import { Movie } from '../../models/movie.model.js';
import { Theatre } from '../../models/theatre.model.js';
import { Screen } from '../../models/screen.model.js';
import { Showtime } from '../../models/showtime.model.js';
import { SeatReservation } from '../../models/seatReservation.model.js';
import { Review } from '../../models/review.model.js';
import { Watchlist } from '../../models/watchlist.model.js';
import { Issue, IssueMessage } from '../../models/issue.model.js';
import { Hashtag } from '../../models/hashtag.model.js';
import { Post } from '../../models/post.model.js';
import { PostLike } from '../../models/postLike.model.js';
import { HashtagFollow } from '../../models/hashtagFollow.model.js';
import { UserFollow } from '../../models/userFollow.model.js';
import { Bookmark } from '../../models/bookmark.model.js';
import mongoose from 'mongoose';
import { Comment } from '../../models/comment.model.js';
import { CommentLike } from '../../models/commentLike.model.js';
import { Conversation, ChatMessage, ChatReadCursor, ConversationParticipant } from '../../models/chat.model.js';
import { ConversationInvite, ConversationJoinRequest } from '../../models/chatInvite.model.js';
import { log } from './helpers.js';

export const clearDatabase = async () => {
  log('🗑️', 'Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Movie.deleteMany({}),
    Theatre.deleteMany({}),
    Screen.deleteMany({}),
    Showtime.deleteMany({}),
    SeatReservation.deleteMany({}),
    Review.deleteMany({}),
    Watchlist.deleteMany({}),
    Issue.deleteMany({}),
    IssueMessage.deleteMany({}),
    Hashtag.deleteMany({}),
    Post.deleteMany({}),
    PostLike.deleteMany({}),
    HashtagFollow.deleteMany({}),
    UserFollow.deleteMany({}),
    Bookmark.deleteMany({}),
    Comment.deleteMany({}),
    CommentLike.deleteMany({}),
    Conversation.deleteMany({}),
    ChatMessage.deleteMany({}),
    ChatReadCursor.deleteMany({}),
    ConversationParticipant.deleteMany({}),
    ConversationInvite.deleteMany({}),
    ConversationJoinRequest.deleteMany({}),
  ]);
  // Drop indexes to avoid stale unique-key conflicts on re-seed
  const db = mongoose.connection.db;
  if (db) {
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      try {
        await db.collection(col.name).dropIndexes();
      } catch {
        /* some system indexes can't be dropped — ignore */
      }
    }
  }

  log('✅', 'Database cleared');
};
