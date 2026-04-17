import { EmitterSocket } from '../emitter-socket.js';

/**
 * Support list socket — user-scoped issue list events.
 * JWT-authenticated: server auto-joins the user's room from the token.
 * No client-sent userId needed (server uses socket.data.userId).
 *
 * Events: unread_changed, issue_updated
 */
class SupportListSocketService extends EmitterSocket {
  constructor() {
    super('/support-list', true); // authenticated
    this.forward('unread_changed');
    this.forward('issue_updated');
  }
}

export const supportListSocket = new SupportListSocketService();
