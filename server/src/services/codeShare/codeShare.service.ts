import mongoose from 'mongoose';
import { CodeShare } from '../../models/codeShare.model.js';
import { CodeShareChunk } from '../../models/codeShareChunk.model.js';

export interface CodeShareData {
  title: string;
  code: string;
  expiresAt?: Date | undefined;
}

export interface ApiActionContext {
  resourceId?: string | undefined;
  action: string;
  body: any;
  query: any;
  userId: string;
  apiKeyId?: string | undefined;
}

export interface PaginationParams {
  chunkId?: string | undefined;
}

export interface AppendChunkParams {
  codeShareId: string;
  prevChunkId: string | null;
  content: string;
}

/**
 * Unified action handler for CodeShare
 */
export const handleCodeShareAction = async (ctx: ApiActionContext): Promise<{ ok: boolean; message?: string; data?: any }> => {
  const { resourceId, action, body, query } = ctx;

  switch (action) {
    case 'read': {
      if (!resourceId) throw new Error('Resource ID required');
      const chunkId = query.chunkId as string | undefined;
      const data = await getCodeShare(resourceId, { chunkId });
      if (!data) throw new Error('Code share not found');
      return { ok: true, data };
    }

    case 'update': {
      if (!resourceId) throw new Error('Resource ID required');
      const { title, code, prevChunkId } = body;

      // If prevChunkId is null, it's the start of a new version
      if (!prevChunkId) {
        await clearCodeShareChunks(resourceId);
        if (title) {
          await CodeShare.findByIdAndUpdate(resourceId, { $set: { title } });
        }
      }

      let chunkId = null;
      if (code) {
        const MAX_CHUNK_SIZE = 35000;
        if (code.length > MAX_CHUNK_SIZE) {
          throw new Error(`Chunk size exceeds maximum limit of ${MAX_CHUNK_SIZE} characters`);
        }

        const chunk = await appendChunk({
          codeShareId: resourceId,
          content: code,
          prevChunkId: prevChunkId || null
        });
        chunkId = chunk._id;
      }

      return {
        ok: true,
        message: 'Snippet updated',
        data: { chunkId, title }
      };
    }

    case 'delete': {
      if (!resourceId) throw new Error('Resource ID required');
      await deleteCodeShare(resourceId);
      return { ok: true, message: 'Code share deleted' };
    }

    default:
      throw new Error(`Action '${action}' not supported`);
  }
};

/**
 * Creates a new CodeShare resource
 */
export const createCodeShare = async (userId: string, data: CodeShareData): Promise<any> => {
  const { code, title, expiresAt } = data;

  const createData: any = {
    createdBy: new mongoose.Types.ObjectId(userId),
    totalLength: 0,
    title,
  };
  if (expiresAt) createData.expiresAt = expiresAt;

  const codeShare = await CodeShare.create(createData);

  if (code) {
    const CHUNK_SIZE = 30000;
    let lastId: string | null = null;
    for (let i = 0; i < code.length; i += CHUNK_SIZE) {
      const content = code.slice(i, i + CHUNK_SIZE);
      const chunk = await appendChunk({
        codeShareId: codeShare._id.toString(),
        content,
        prevChunkId: lastId,
      });
      lastId = chunk._id.toString();

      // If this is the first chunk, update the parent's firstChunkId
      if (i === 0) {
        await CodeShare.findByIdAndUpdate(codeShare._id, { $set: { firstChunkId: chunk._id } });
      }
    }
  }

  // Return the fully updated document
  return await CodeShare.findById(codeShare._id).lean();
};

/**
 * Retrieves a CodeShare and a specific chunk based on pagination
 */
export const getCodeShare = async (id: string, pagination?: PaginationParams): Promise<any> => {
  const doc = await CodeShare.findById(id).lean();
  if (!doc) return null;

  let chunkId = pagination?.chunkId || doc.firstChunkId;

  if (!chunkId) {
    return {
      title: doc.title,
      totalLength: doc.totalLength,
      createdAt: doc.createdAt,
      code: '',
      hasMore: false,
      nextChunkId: null
    };
  }

  const chunk = await CodeShareChunk.findById(chunkId).lean();
  if (!chunk) {
    return {
      title: doc.title,
      totalLength: doc.totalLength,
      createdAt: doc.createdAt,
      code: '',
      hasMore: false,
      nextChunkId: null
    };
  }

  return {
    title: doc.title,
    totalLength: doc.totalLength,
    createdAt: doc.createdAt,
    code: chunk.content,
    nextChunkId: chunk.nextChunkId,
    hasMore: !!chunk.nextChunkId,
  };
};

/**
 * Appends a new chunk to a CodeShare
 */
export const appendChunk = async (params: AppendChunkParams): Promise<any> => {
  const { codeShareId, prevChunkId, content } = params;
  const csId = new mongoose.Types.ObjectId(codeShareId);

  const chunkData: any = {
    content,
    codeShareId: csId,
    prevChunkId: prevChunkId ? new mongoose.Types.ObjectId(prevChunkId) : null
  };

  const chunk = await CodeShareChunk.create(chunkData);

  // If there's a previous chunk, update its 'nextChunkId' to point to this new chunk
  if (prevChunkId) {
    await CodeShareChunk.findByIdAndUpdate(prevChunkId, {
      $set: { nextChunkId: chunk._id }
    });
  }

  // Update the CodeShare metadata
  const updateQuery: any = {
    $set: { lastChunkId: chunk._id },
    $inc: { totalLength: content.length }
  };

  // If this is the very first chunk being added
  if (!prevChunkId) {
    updateQuery.$set.firstChunkId = chunk._id;
  }

  await CodeShare.findByIdAndUpdate(csId, updateQuery);

  return chunk;
};

/**
 * Deletes all chunks for a CodeShare and resets its metadata
 */
export const clearCodeShareChunks = async (codeShareId: string) => {
  const csId = new mongoose.Types.ObjectId(codeShareId);
  await CodeShareChunk.deleteMany({ codeShareId: csId });
  await CodeShare.findByIdAndUpdate(csId, {
    $set: { firstChunkId: null, lastChunkId: null, totalLength: 0 }
  });
};

/**
 * Deletes a CodeShare and all its chunks
 */
export const deleteCodeShare = async (id: string) => {
  const csId = new mongoose.Types.ObjectId(id);
  await CodeShareChunk.deleteMany({ codeShareId: csId });
  return await CodeShare.findByIdAndDelete(csId).lean();
};
