export interface CodeShareChunk {
  _id: string;
  codeShareId: string;
  prevChunkId?: string;
  nextChunkId?: string;
  content: string;
  createdAt: string;
}

export interface CodeShare {
  _id: string;
  createdBy: string;
  title: string;
  totalLength: number;
  firstChunkId?: string;
  lastChunkId?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CodeShareResponse {
  code: string;
  hasMore: boolean;
  nextChunkId?: string;
  title?: string;
  totalLength: number;
}
