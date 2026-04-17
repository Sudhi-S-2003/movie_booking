import { EmitterSocket } from '../emitter-socket.js';

/**
 * Support messages socket — per-issue chat events.
 * JWT-authenticated: server identifies user from token.
 *
 * Events: new_reply, receipts_update, status_changed
 *
 * On reconnect: automatically re-joins the current issue room.
 */
class SupportMessagesSocketService extends EmitterSocket {
  private currentIssueId: string | null = null;

  constructor() {
    super('/support-messages', true); // authenticated
    this.forward('new_reply');
    this.forward('receipts_update');
    this.forward('status_changed');

    // Re-join issue room after reconnect
    this.onReconnect(() => {
      if (this.currentIssueId) {
        this.socket.emit('join_issue', this.currentIssueId);
      }
    });
  }

  joinIssue(issueId: string) {
    if (this.currentIssueId && this.currentIssueId !== issueId) {
      this.leaveIssue(this.currentIssueId);
    }
    this.currentIssueId = issueId;
    this.socket.emit('join_issue', issueId);
  }

  leaveIssue(issueId: string) {
    this.socket.emit('leave_issue', issueId);
    if (this.currentIssueId === issueId) this.currentIssueId = null;
  }
}

export const supportMessagesSocket = new SupportMessagesSocketService();
