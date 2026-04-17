import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Issue, IssueMessage, IssueReadCursor } from '../models/issue.model.js';
import {
  getSupportMessagesNamespace,
  getSupportListNamespace,
} from '../socket/index.js';
import {
  emitNewReply,
  emitStatusChange,
  emitReceipts,
} from '../socket/channels/support-messages.channel.js';
import {
  emitUnreadChanged,
  emitIssueListUpdated,
} from '../socket/channels/support-list.channel.js';
import { markIssueMessagesRead, markSentReplyRead } from '../services/support/issueReadCursor.service.js';
import {
  loadLatest,
  loadOlder,
  loadNewer,
  loadAround,
  loadWithAnchor,
  type FetchPageResult,
} from '../services/support/messageFetch.service.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { parsePage, buildPageEnvelope, PAGINATION } from '../utils/pagination.js';

/**
 * Decorate raw messages with `isYou` and `deliveryStatus` for the wire.
 *
 * Read state is derived entirely from IssueReadCursor rows: a message is
 * "read" iff there exists a non-sender cursor for this issue whose
 * lastReadAt has advanced past the message's createdAt. One indexed query
 * per page covers any number of messages — no per-message receipts table.
 *
 * Self-cursors are intentionally ignored: the sender having "read" their
 * own message says nothing about whether the recipient saw it.
 */
const decorateMessages = async (rawMessages: any[], currentUserId?: string) => {
  if (rawMessages.length === 0) return [];

  const issueId = rawMessages[0].issueId;
  const cursors = await IssueReadCursor.find(
    { issueId },
    { userId: 1, lastReadAt: 1 },
  ).lean();

  return rawMessages.map((m) => {
    const senderId = m.senderId?.toString();
    const isRead = cursors.some(
      (c: any) =>
        c.userId.toString() !== senderId &&
        c.lastReadAt >= m.createdAt,
    );
    return {
      ...m,
      isYou: currentUserId ? senderId === currentUserId : false,
      deliveryStatus: isRead ? 'read' : 'sent',
    };
  });
};

export const createIssue = async (req: Request, res: Response) => {
  try {
    const { category, title, description, priority, metadata, guestInfo } = req.body;
    const user = (req as any).user;
    
    const issueData: any = {
      category,
      title,
      description,
      priority,
      metadata,
    };

    if (user) {
      issueData.userId = user.id;
      issueData.role = user.role === 'theatre_owner' ? 'TheatreOwner' : 'User';
      issueData.isGuest = false;
    } else if (guestInfo && guestInfo.name && guestInfo.email) {
      issueData.guestInfo = guestInfo;
      issueData.role = 'Guest';
      issueData.isGuest = true;
    } else {
      return res.status(400).json({ success: false, message: 'User or Guest info required' });
    }

    const issue = await Issue.create(issueData);
    res.status(201).json({ success: true, issue });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getMyIssues = async (req: Request, res: Response) => {
  try {
    const pageParams = parsePage(req);
    const { limit, skip } = pageParams;

    const user = (req as any).user;
    const guestIssueIds = req.query.guestIssueIds ? (req.query.guestIssueIds as string).split(',') : [];

    let query: any = {};
    if (user) {
      query.$or = [
        { userId: user.id },
        { _id: { $in: guestIssueIds } }
      ];
    } else if (guestIssueIds.length > 0) {
      query._id = { $in: guestIssueIds };
    } else {
      return res.status(200).json({ success: true, issues: [], pagination: { hasMore: false } });
    }

    const totalCount = await Issue.countDocuments(query);
    const issues = await Issue.find(query)
      .populate('metadata.linkedTheatreId', 'name city')
      .populate('metadata.linkedMovieId', 'title posterUrl')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      issues,
      pagination: buildPageEnvelope(totalCount, pageParams),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getAllIssues = async (req: Request, res: Response) => {
  try {
    const pageParams = parsePage(req);
    const { limit, skip } = pageParams;

    const totalCount = await Issue.countDocuments({});
    const issues = await Issue.find({})
      .populate('userId', 'name email role')
      .populate('metadata.linkedTheatreId', 'name city')
      .populate('metadata.linkedMovieId', 'title posterUrl')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      issues,
      pagination: buildPageEnvelope(totalCount, pageParams),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

/**
 * GET /issues/:id/messages
 *
 * Thin mode-dispatcher around `messageFetch.service`. Exactly one of these
 * query params should be set; if none are, we fetch the latest page.
 *
 *   ?before=<cursor>   → older page (paginate up)
 *   ?after=<cursor>    → newer page (paginate down, window refill)
 *   ?around=<msgId>    → centered window (jump-to-message)
 *   ?anchor=<msgId>    → "open with last-read hint" — server picks latest or
 *                        falls through to around() so the unread boundary is
 *                        always in the response
 *   (none)             → latest page
 *
 * All paths return the same response shape:
 *   { success, messages, hasBefore, hasAfter, beforeCursor, afterCursor, targetIndex? }
 *
 * Decoration (isYou + deliveryStatus) and the unread-cursor join are the
 * only pieces that touch the request user, so they live here in the controller.
 */
export const getIssueMessages = async (req: Request, res: Response) => {
  try {
    const issueId = req.params.id as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, PAGINATION.MAX_LIMIT);

    const before = req.query.before as string | undefined;
    const after  = req.query.after  as string | undefined;
    const around = req.query.around as string | undefined;
    const anchor = req.query.anchor as string | undefined;

    let result: FetchPageResult | null;
    if (before)      result = await loadOlder(issueId, before, limit);
    else if (after)  result = await loadNewer(issueId, after, limit);
    else if (around) result = await loadAround(issueId, around, limit);
    else if (anchor) result = await loadWithAnchor(issueId, anchor, limit);
    else             result = await loadLatest(issueId, limit);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Target message not found' });
    }

    const currentUserId = (req as any).user?.id;
    const messages = await decorateMessages(result.messages, currentUserId);

    return res.status(200).json({
      success:     true,
      messages,
      hasBefore:    result.hasBefore,
      hasAfter:    result.hasAfter,
      beforeCursor: result.beforeCursor,
      afterCursor: result.afterCursor,
      ...(result.targetIndex !== undefined && { targetIndex: result.targetIndex }),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const addReply = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { text, replyTo } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ success: false, message: 'Ticket not found' });

    // Validate access:
    const user = (req as any).user;
    const guestSessionId = req.headers['x-guest-session-id'] as string; // Optional: verify guest session

    const isOwner = user && issue.userId?.toString() === user.id;
    const isAdmin = user && user.role === 'admin';
    const isGuestOwner = issue.isGuest && guestSessionId === issue._id.toString(); // Simple matching for now

    if (!isOwner && !isAdmin && !isGuestOwner) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const msgData: any = {
      issueId: id as string,
      senderId: user?.id,
      senderName: user ? user.name : issue.guestInfo?.name || 'Guest',
      senderRole: isAdmin ? 'Admin' : (user ? (user.role === 'theatre_owner' ? 'TheatreOwner' : 'User') : 'Guest'),
      text,
    };
    if (replyTo?.messageId) {
      msgData.replyTo = {
        messageId: replyTo.messageId,
        senderName: replyTo.senderName,
        text: replyTo.text?.slice(0, 200),
      };
    }
    const newMessage = await IssueMessage.create(msgData);

    issue.status = 'IN_PROGRESS';
    await issue.save();

    const wirePayload = {
      ...newMessage.toObject(),
      deliveryStatus: 'sent' as const,
    };

    // Broadcast to all clients watching this issue (each client decides isYou locally)
    try {
      emitNewReply(getSupportMessagesNamespace(), id as string, wirePayload);
    } catch { /* socket not initialized in tests */ }

    // Tell the *other* party (issue owner) their list-side badge should bump.
    // Sender's own list view ignores this because the client filters by senderId.
    try {
      const recipientId = issue.userId?.toString();
      if (recipientId && recipientId !== user?.id) {
        emitUnreadChanged(getSupportListNamespace(), recipientId, {
          issueId: id as string,
          // delta-style hint; the client refetches the canonical map on receipt
          count: -1,
        });
        emitIssueListUpdated(getSupportListNamespace(), recipientId, {
          issueId: id as string,
          status: issue.status,
          lastActivityAt: new Date().toISOString(),
        });
      }
    } catch { /* socket optional */ }

    // Advance the sender's read cursor to their own message.
    // When a user sends a message they've obviously read everything up to it.
    if (user?.id) {
      markSentReplyRead({
        userId:           user.id,
        issueId:          id as string,
        messageId:        String(newMessage._id),
        messageCreatedAt: newMessage.createdAt,
      }).catch(() => {/* fire-and-forget */});
    }

    res.status(200).json({ success: true, message: { ...wirePayload, isYou: true } });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

/**
 * POST /issues/:id/messages/read
 * Body: { messageIds: string[] }
 *
 * Marks the given messages as read by the current user — purely by
 * advancing the IssueReadCursor to the latest non-self message in the
 * batch. No per-message receipts table; the cursor alone is enough
 * because reads are monotonic.
 *
 * Emits a 'receipts_update' socket event so the sender's UI can update the
 * tick indicator without polling.
 */
export const markMessagesRead = async (req: Request, res: Response) => {
  try {
    const id = req.params.id!;
    const { messageIds } = req.body as { messageIds: string[] };
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ success: false, message: 'Auth required' });
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(200).json({ success: true, updated: 0 });
    }

    // Fetch the messages so we can echo non-self ids back to senders for
    // the tick UI and feed them to the pointer-advance service.
    const messages = await IssueMessage.find(
      { _id: { $in: messageIds }, issueId: id },
      { senderId: 1 },
    ).lean();

    const nonSelfIds = messages
      .filter((m: any) => m.senderId?.toString() !== userId)
      .map((m: any) => m._id.toString());

    // Advance the per-user read cursor. Monotonic — never moves backward.
    const cursor = await markIssueMessagesRead({
      userId,
      issueId: id as string,
      messageIds: nonSelfIds,
    });

    // Notify other clients in the issue room so their tick UI updates.
    // Always emit when there are non-self messages — even if the cursor didn't
    // advance, the sender still needs per-message read status.
    if (nonSelfIds.length > 0) {
      try {
        emitReceipts(getSupportMessagesNamespace(), id as string, {
          userId,
          messageIds: nonSelfIds,
        });
      } catch { /* socket optional */ }
    }

    // Tell the actor's *own* other devices to clear/update the badge.
    if (cursor) {
      try {
        emitUnreadChanged(getSupportListNamespace(), userId, {
          issueId: id as string,
          count: 0,
          lastReadMessageId: (cursor as any).lastReadMessageId?.toString() ?? null,
        });
      } catch { /* socket optional */ }
    }

    res.status(200).json({ success: true, updated: nonSelfIds.length });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

/**
 * GET /issues/unread-counts
 * Returns a map of issueId → unread message count for the current user,
 * plus a parallel lastReadMap of issueId → last-read messageId for the
 * jump-to-backlog anchor.
 *
 * Derivation: for each accessible issue, the user's IssueReadCursor gives
 * us a per-issue cutoff timestamp; the unread count is the number of
 * messages from other senders with createdAt strictly after that cutoff
 * (or all foreign messages if no cursor exists yet).
 */
export const getUnreadCounts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(200).json({ success: true, counts: {}, lastReadMap: {} });

    const userObjId = new mongoose.Types.ObjectId(userId);
    const isAdmin = (req as any).user?.role === 'admin';
    const issueFilter = isAdmin ? {} : { userId: userObjId };
    const issues = await Issue.find(issueFilter, { _id: 1 }).lean();
    const issueIds = issues.map((i: any) => i._id);
    if (issueIds.length === 0) {
      return res.status(200).json({ success: true, counts: {}, lastReadMap: {} });
    }

    // One indexed query: this user's cursor for every accessible issue.
    const cursors = await IssueReadCursor.find(
      { userId: userObjId, issueId: { $in: issueIds } },
      { issueId: 1, lastReadAt: 1, lastReadMessageId: 1 },
    ).lean();

    // Single aggregation that joins each foreign message against my cursor
    // for that issue and counts only the ones past my cutoff. Cursor-less
    // issues fall through the $or as "everything is unread".
    const result = await IssueMessage.aggregate([
      { $match: { issueId: { $in: issueIds }, senderId: { $ne: userObjId } } },
      {
        $lookup: {
          from: 'issuereadcursors',
          let: { iid: '$issueId' },
          pipeline: [
            { $match: { $expr: { $and: [
              { $eq: ['$issueId', '$$iid'] },
              { $eq: ['$userId', userObjId] },
            ] } } },
            { $project: { lastReadAt: 1 } },
          ],
          as: 'cur',
        },
      },
      { $match: {
          $expr: {
            $or: [
              { $eq: [{ $size: '$cur' }, 0] },
              { $gt: ['$createdAt', { $arrayElemAt: ['$cur.lastReadAt', 0] }] },
            ],
          },
      } },
      { $group: { _id: '$issueId', count: { $sum: 1 } } },
    ]);

    const counts: Record<string, number> = {};
    for (const row of result) counts[row._id.toString()] = row.count;

    // Surface the last-read anchor for issues with unread messages so the
    // client can jump-to-backlog on open. Already-current threads don't
    // need an anchor.
    const lastReadMap: Record<string, string> = {};
    for (const c of cursors as any[]) {
      const idStr = c.issueId.toString();
      if (counts[idStr] && c.lastReadMessageId) {
        lastReadMap[idStr] = c.lastReadMessageId.toString();
      }
    }

    res.status(200).json({ success: true, counts, lastReadMap });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const updateIssueStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ success: false, message: 'Ticket not found' });

    // Authorization: Admin can change anything. User can only close/resolve their own if needed.
    // For now, let's allow admins full control, and users can only CLOSE their own.
    const isAdmin = req.user!.role === 'admin';
    const isOwner = issue.userId?.toString() === req.user!.id;

    if (!isAdmin && (!isOwner || status !== 'CLOSED')) {
      return res.status(403).json({ success: false, message: 'Unauthorized status transition' });
    }

    issue.status = status;
    await issue.save();

    // Broadcast status change to all clients watching this issue
    try {
      emitStatusChange(getSupportMessagesNamespace(), id as string, status);
    } catch { /* socket not initialized in tests */ }

    res.status(200).json({ success: true, message: `Ticket status updated to ${status}` });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
