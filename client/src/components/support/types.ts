
export type DeliveryStatus = "sent" | "delivered" | "read";

export interface IssueMessage {
  _id: string;
  text: string;
  senderId?: string | null;
  senderRole?: "Admin" | "User" | "TheatreOwner" | "Guest" | string;
  senderName: string;
  isYou?: boolean;
  deliveryStatus?: DeliveryStatus;
  _status?: "sending" | "failed";
  replyTo?: {
    messageId: string;
    senderName: string;
    text: string;
  };
  createdAt: string;
}

export interface ReceiptsUpdate {
  issueId: string;
  userId: string;
  messageIds: string[];
}

export interface IssueMetadata {
  linkedTheatreId?: { _id: string; name: string } | string;
  linkedMovieId?: { _id: string; title: string } | string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface Issue {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  metadata?: IssueMetadata;
  userId?: string | null;
  unreadCount?: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}
