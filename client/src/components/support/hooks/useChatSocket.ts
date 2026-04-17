import { useEffect } from "react";
import { supportMessagesSocket } from "../../../services/socket/index.js";
import type { IssueMessage, ReceiptsUpdate } from "../types.js";
import type { MessagesAction } from "../messageState/messagesReducer.js";


export interface UseChatSocketArgs {
  issueId: string | null;
  currentUserId?: string;
  dispatch: React.Dispatch<MessagesAction>;
  onIncoming?: (msg: IssueMessage) => void;
  onStatusChanged?: (status: string) => void;
}

export function useChatSocket({
  issueId,
  currentUserId,
  dispatch,
  onIncoming,
  onStatusChanged,
}: UseChatSocketArgs) {
  useEffect(() => {
    if (!issueId) return;

    supportMessagesSocket.connect();
    supportMessagesSocket.joinIssue(issueId);

    const unsubs = [
      supportMessagesSocket.on("new_reply", (raw: IssueMessage) => {
        const msg: IssueMessage = {
          ...raw,
          isYou: currentUserId ? raw.senderId === currentUserId : false,
        };
        dispatch({ type: "SOCKET_NEW", message: msg });
        onIncoming?.(msg);
      }),

      supportMessagesSocket.on(
        "receipts_update",
        (data: ReceiptsUpdate) => {
          if (data.issueId !== issueId) return;
          if (data.userId === currentUserId) return; // skip own receipts
          dispatch({ type: "RECEIPTS_UPDATE", messageIds: data.messageIds });
        },
      ),

      supportMessagesSocket.on(
        "status_changed",
        (data: { issueId: string; status: string }) => {
          if (data.issueId !== issueId) return;
          onStatusChanged?.(data.status);
        },
      ),
    ];

    return () => {
      unsubs.forEach((u) => u());
      supportMessagesSocket.leaveIssue(issueId);
      supportMessagesSocket.disconnect(); // ref-counted
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId, currentUserId, dispatch]);
}
