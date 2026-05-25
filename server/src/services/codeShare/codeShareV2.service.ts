import mongoose from 'mongoose';
import { CodeShareV2 } from '../../models/codeShareV2/codeShareV2.model.js';
import { CodeShareCommitV2 } from '../../models/codeShareV2/codeShareCommitV2.model.js';
import { CodeShareCommitChangeV2 } from '../../models/codeShareV2/codeShareCommitChangeV2.model.js';
import { CodeShareFileV2 } from '../../models/codeShareV2/codeShareFileV2.model.js';
import { CodeShareFolderV2 } from '../../models/codeShareV2/codeShareFolderV2.model.js';
import { computeLineDiff } from '../../utils/diff.util.js';

export interface CodeShareV2Data {
  title: string;
  files: { path: string; content: string }[];
  expiresAt?: Date | undefined;
}

export interface CommitChangeInput {
  path: string;
  type: 'add' | 'modify' | 'delete' | 'create-folder' | 'delete-folder';
  content?: string;
}

export interface ApiActionContextV2 {
  resourceId?: string;
  action: string;
  body: any;
  query: any;
  userId: string;
  apiKeyId?: string;
}

/**
 * Helper to get all parent folders for a path (e.g. "src/components/Button.tsx" -> ["src", "src/components"])
 */
function getAncestorPaths(itemPath: string): string[] {
  const parts = itemPath.split('/');
  const ancestors: string[] = [];
  let current = '';
  for (let i = 0; i < parts.length - 1; i++) {
    current = current ? `${current}/${parts[i]}` : parts[i]!;
    ancestors.push(current);
  }
  return ancestors;
}

/**
 * Unified action handler for CodeShare V2
 */
export const handleCodeShareV2Action = async (ctx: ApiActionContextV2): Promise<{ ok: boolean; message?: string; data?: any }> => {
  const { resourceId, action, body, query, userId } = ctx;

  switch (action) {
    case 'v2-read': {
      if (!resourceId) throw new Error('Resource ID required');
      
      const project = await CodeShareV2.findById(resourceId).lean();
      if (!project) throw new Error('Code share not found');

      // Load commit history
      const commits = await CodeShareCommitV2.find({ codeShareId: project._id })
        .sort({ createdAt: -1 })
        .lean();

      // Retrieve list of file paths & lengths (lazy load contents)
      let filesList: { path: string; totalLength: number; content?: string }[] = [];
      let foldersList: { path: string }[] = [];
      let activeCommitId = query.commitId as string | undefined || (project.headCommitId ? project.headCommitId.toString() : null);

      if (activeCommitId) {
        if (activeCommitId === project.headCommitId?.toString()) {
          // Load from active files and folders
          // Use aggregation to avoid loading large file content into server memory
          const activeDocs: any[] = await CodeShareFileV2.aggregate([
            { $match: { codeShareId: project._id } },
            {
              $project: {
                path: 1,
                totalLength: { $strLenCP: { $ifNull: ["$content", ""] } },
                content: {
                  $cond: {
                    if: { $lt: [{ $strLenCP: { $ifNull: ["$content", ""] } }, 30000] },
                    then: "$content",
                    else: "$$REMOVE"
                  }
                }
              }
            }
          ]);
          filesList = activeDocs.map(d => ({
            path: d.path,
            totalLength: d.totalLength,
            content: d.content
          }));

          const activeFolders = await CodeShareFolderV2.find({ codeShareId: project._id }).select('path').lean();
          foldersList = activeFolders.map(d => ({ path: d.path }));
        } else {
          // Reconstruct files at specific commit
          const reconstructed = await reconstructFilesAtCommit(resourceId, activeCommitId);
          filesList = reconstructed.map(f => ({
            path: f.path,
            totalLength: f.content.length,
            content: f.content.length < 30000 ? f.content : undefined
          }));

          // Reconstruct folders dynamically from the files' ancestor paths
          const folderPathsSet = new Set<string>();
          reconstructed.forEach(f => {
            getAncestorPaths(f.path).forEach(p => folderPathsSet.add(p));
          });
          foldersList = Array.from(folderPathsSet).map(p => ({ path: p }));
        }
      }

      return {
        ok: true,
        data: {
          project,
          files: filesList,
          folders: foldersList,
          commits: commits.map(c => ({
            _id: c._id,
            message: c.message,
            createdBy: c.createdBy,
            createdAt: c.createdAt,
            totalChanges: c.changes.length,
            totalAdditions: c.changes.reduce((sum, ch) => sum + ch.additions, 0),
            totalDeletions: c.changes.reduce((sum, ch) => sum + ch.deletions, 0),
          }))
        }
      };
    }

    case 'v2-get-file': {
      if (!resourceId) throw new Error('Resource ID required');
      const path = (query.path || body.path) as string;
      const commitId = (query.commitId || body.commitId) as string | undefined;
      const offset = Number(query.offset || body.offset || 0);

      if (!path) throw new Error('File path required');

      const project = await CodeShareV2.findById(resourceId).lean();
      if (!project) throw new Error('Code share not found');

      let fullContent = '';
      let activeCommitId = commitId || (project.headCommitId ? project.headCommitId.toString() : null);

      if (activeCommitId) {
        if (activeCommitId === project.headCommitId?.toString()) {
          const fileDoc = await CodeShareFileV2.findOne({ codeShareId: project._id, path }).lean();
          if (fileDoc) {
            fullContent = fileDoc.content;
          }
        } else {
          const reconstructed = await reconstructFilesAtCommit(resourceId, activeCommitId);
          const matched = reconstructed.find(f => f.path === path);
          if (matched) {
            fullContent = matched.content;
          }
        }
      }

      const CHUNK_SIZE = 30000;
      const contentSlice = fullContent.slice(offset, offset + CHUNK_SIZE);
      const totalLength = fullContent.length;

      return {
        ok: true,
        data: {
          path,
          content: contentSlice,
          offset,
          hasMore: offset + contentSlice.length < totalLength,
          nextOffset: offset + contentSlice.length,
          totalLength
        }
      };
    }

    case 'v2-commit': {
      if (!resourceId) throw new Error('Resource ID required');
      const { message, changes } = body;
      if (!message) throw new Error('Commit message is required');
      if (!changes || !Array.isArray(changes)) throw new Error('Changes array is required');

      const author = ctx.apiKeyId ? `API Key Owner` : `User (${userId.slice(-4)})`;
      
      const commit = await createCommitV2(resourceId, author, message, changes);

      return {
        ok: true,
        message: 'Commit created successfully',
        data: {
          commitId: commit._id,
          message: commit.message
        }
      };
    }

    case 'v2-history': {
      if (!resourceId) throw new Error('Resource ID required');
      const commits = await CodeShareCommitV2.find({ codeShareId: new mongoose.Types.ObjectId(resourceId) })
        .sort({ createdAt: -1 })
        .select('_id message createdBy createdAt')
        .lean();

      return {
        ok: true,
        data: commits
      };
    }

    case 'v2-commit-details': {
      const commitId = query.commitId || body.commitId;
      if (!commitId) throw new Error('Commit ID required');

      const commit: any = await CodeShareCommitV2.findById(commitId).lean();
      if (!commit) throw new Error('Commit not found');

      // Fetch the heavy details from the separated collection
      const detailChanges = await CodeShareCommitChangeV2.find({ commitId: commit._id }).lean();
      commit.changes = detailChanges;

      return {
        ok: true,
        data: commit
      };
    }

    case 'v2-download-all': {
      if (!resourceId) throw new Error('Resource ID required');
      const commitId = query.commitId || body.commitId;

      const project = await CodeShareV2.findById(resourceId).lean();
      if (!project) throw new Error('Code share not found');

      let filesList: { path: string; content: string }[] = [];
      let activeCommitId = commitId || (project.headCommitId ? project.headCommitId.toString() : null);

      if (activeCommitId) {
        if (activeCommitId === project.headCommitId?.toString()) {
          // Fetch all active files with content
          const fileDocs = await CodeShareFileV2.find({ codeShareId: project._id }).select('path content').lean();
          filesList = fileDocs.map(d => ({
            path: d.path,
            content: d.content || ''
          }));
        } else {
          // Reconstruct at commit
          const reconstructed = await reconstructFilesAtCommit(resourceId, activeCommitId);
          filesList = reconstructed.map(f => ({
            path: f.path,
            content: f.content || ''
          }));
        }
      }

      return {
        ok: true,
        data: {
          projectTitle: project.title,
          files: filesList
        }
      };
    }

    default:
      throw new Error(`Action '${action}' not supported in V2`);
  }
};

/**
 * Creates a new CodeShareV2 resource with initial files and folders
 */
export const createCodeShareV2 = async (userId: string, data: CodeShareV2Data): Promise<any> => {
  const { title, files, expiresAt } = data;

  const projectData: any = {
    createdBy: new mongoose.Types.ObjectId(userId),
    title,
  };
  if (expiresAt) {
    projectData.expiresAt = expiresAt;
  }

  const project: any = await CodeShareV2.create(projectData);
  const commitChanges: any[] = [];

  for (const f of files) {
    const lines = f.content.split(/\r?\n/).length;
    const diffLines = computeLineDiff('', f.content);

    // Ensure all parent directories exist
    const parentPaths = getAncestorPaths(f.path);
    for (const p of parentPaths) {
      const folderData: any = { codeShareId: project._id, path: p };
      if (expiresAt) folderData.expiresAt = expiresAt;
      await CodeShareFolderV2.updateOne(
        { codeShareId: project._id, path: p },
        { $setOnInsert: folderData },
        { upsert: true }
      );
    }

    const fileData: any = {
      codeShareId: project._id,
      path: f.path,
      content: f.content,
    };
    if (expiresAt) {
      fileData.expiresAt = expiresAt;
    }

    await CodeShareFileV2.create(fileData);

    commitChanges.push({
      path: f.path,
      type: 'add',
      content: f.content,
      additions: lines,
      deletions: 0,
      diff: JSON.stringify(diffLines),
    });
  }

  // Create lightweight commit changes summary for CodeShareCommitV2
  const commitSummaryChanges = commitChanges.map(c => ({
    path: c.path,
    type: c.type,
    additions: c.additions,
    deletions: c.deletions
  }));

  const commitData: any = {
    codeShareId: project._id,
    message: 'Initial commit',
    createdBy: 'System',
    changes: commitSummaryChanges,
  };
  if (expiresAt) {
    commitData.expiresAt = expiresAt;
  }

  const initialCommit: any = await CodeShareCommitV2.create(commitData);

  // Now create the heavy detail documents in CodeShareCommitChangeV2
  const commitDetailChanges = commitChanges.map(c => ({
    codeShareId: project._id,
    commitId: initialCommit._id,
    path: c.path,
    type: c.type,
    content: c.content,
    additions: c.additions,
    deletions: c.deletions,
    diff: c.diff,
    ...(expiresAt ? { expiresAt } : {})
  }));

  await CodeShareCommitChangeV2.insertMany(commitDetailChanges);

  project.headCommitId = initialCommit._id;
  await project.save();

  return project;
};

/**
 * Appends a new commit and updates the active files and folders
 */
export const createCommitV2 = async (
  codeShareId: string,
  createdBy: string,
  message: string,
  changes: CommitChangeInput[]
): Promise<any> => {
  const csId = new mongoose.Types.ObjectId(codeShareId);
  const project = await CodeShareV2.findById(csId);
  if (!project) throw new Error('Project not found');

  const expiresAt = project.expiresAt;
  const parentCommitId = project.headCommitId;
  const commitChanges: any[] = [];

  for (const change of changes) {
    let oldContent = '';
    let newContent = '';

    if (change.type === 'add') {
      newContent = change.content || '';
      
      // Ensure parents exist
      const parentPaths = getAncestorPaths(change.path);
      for (const p of parentPaths) {
        const folderData: any = { codeShareId: csId, path: p };
        if (expiresAt) folderData.expiresAt = expiresAt;
        await CodeShareFolderV2.updateOne(
          { codeShareId: csId, path: p },
          { $setOnInsert: folderData },
          { upsert: true }
        );
      }

      const fileData: any = {
        codeShareId: csId,
        path: change.path,
        content: newContent,
      };
      if (expiresAt) {
        fileData.expiresAt = expiresAt;
      }
      await CodeShareFileV2.create(fileData);

      const diffLines = computeLineDiff('', newContent);
      commitChanges.push({
        path: change.path,
        type: 'add',
        content: newContent,
        additions: diffLines.filter(line => line.type === 'added').length,
        deletions: 0,
        diff: JSON.stringify(diffLines),
      });

    } else if (change.type === 'modify') {
      newContent = change.content || '';
      
      const fileDoc = await CodeShareFileV2.findOne({ codeShareId: csId, path: change.path });
      if (!fileDoc) throw new Error(`File '${change.path}' not found to modify`);

      oldContent = fileDoc.content;
      fileDoc.content = newContent;
      await fileDoc.save();

      const diffLines = computeLineDiff(oldContent, newContent);
      commitChanges.push({
        path: change.path,
        type: 'modify',
        content: newContent,
        additions: diffLines.filter(line => line.type === 'added').length,
        deletions: diffLines.filter(line => line.type === 'removed').length,
        diff: JSON.stringify(diffLines),
      });

    } else if (change.type === 'delete') {
      const fileDoc = await CodeShareFileV2.findOne({ codeShareId: csId, path: change.path });
      if (fileDoc) {
        oldContent = fileDoc.content;
        await CodeShareFileV2.deleteOne({ _id: fileDoc._id });
      }

      const diffLines = computeLineDiff(oldContent, '');
      commitChanges.push({
        path: change.path,
        type: 'delete',
        additions: 0,
        deletions: diffLines.filter(line => line.type === 'removed').length,
        diff: JSON.stringify(diffLines),
      });

    } else if (change.type === 'create-folder') {
      // Direct folder creation
      const folderData: any = { codeShareId: csId, path: change.path };
      if (expiresAt) folderData.expiresAt = expiresAt;
      await CodeShareFolderV2.updateOne(
        { codeShareId: csId, path: change.path },
        { $setOnInsert: folderData },
        { upsert: true }
      );

      // Record in commit
      commitChanges.push({
        path: change.path,
        type: 'add', // treat as folder creation
        additions: 0,
        deletions: 0,
        diff: '[]',
      });

    } else if (change.type === 'delete-folder') {
      // Delete folder itself
      await CodeShareFolderV2.deleteMany({ codeShareId: csId, path: { $regex: `^${change.path}(/|$)` } });
      
      // Load all files inside that folder to record their deletions in the commit
      const matchingFiles = await CodeShareFileV2.find({ codeShareId: csId, path: { $regex: `^${change.path}/` } }).lean();
      
      for (const file of matchingFiles) {
        const diffLines = computeLineDiff(file.content, '');
        commitChanges.push({
          path: file.path,
          type: 'delete',
          additions: 0,
          deletions: diffLines.filter(line => line.type === 'removed').length,
          diff: JSON.stringify(diffLines),
        });
      }

      // Delete files from active database
      await CodeShareFileV2.deleteMany({ codeShareId: csId, path: { $regex: `^${change.path}/` } });

      commitChanges.push({
        path: change.path,
        type: 'delete', // folder deleted
        additions: 0,
        deletions: 0,
        diff: '[]',
      });
    }
  }

  // Create lightweight commit changes summary for CodeShareCommitV2
  const commitSummaryChanges = commitChanges.map(c => ({
    path: c.path,
    type: c.type,
    additions: c.additions,
    deletions: c.deletions
  }));

  const commitData: any = {
    codeShareId: csId,
    message,
    createdBy,
    changes: commitSummaryChanges,
  };
  if (parentCommitId) {
    commitData.parentCommitId = parentCommitId;
  }
  if (expiresAt) {
    commitData.expiresAt = expiresAt;
  }

  const commit: any = await CodeShareCommitV2.create(commitData);

  // Now create the heavy detail documents in CodeShareCommitChangeV2
  const commitDetailChanges = commitChanges.map(c => ({
    codeShareId: csId,
    commitId: commit._id,
    path: c.path,
    type: c.type,
    content: c.content,
    additions: c.additions,
    deletions: c.deletions,
    diff: c.diff,
    ...(expiresAt ? { expiresAt } : {})
  }));

  await CodeShareCommitChangeV2.insertMany(commitDetailChanges);

  project.headCommitId = commit._id;
  await project.save();

  return commit;
};

/**
 * Traverses backwards through commits to rebuild files at target commit
 */
export const reconstructFilesAtCommit = async (_codeShareId: string, targetCommitId: string): Promise<any[]> => {
  const resolvedFiles = new Map<string, { content: string; deleted: boolean }>();
  let currentCommitId: mongoose.Types.ObjectId | undefined = new mongoose.Types.ObjectId(targetCommitId);

  while (currentCommitId) {
    const commit: any = await CodeShareCommitV2.findById(currentCommitId).select('parentCommitId').lean();
    if (!commit) break;

    // Load the heavy changes details for this commit
    const changes = await CodeShareCommitChangeV2.find({ commitId: commit._id }).lean();

    for (const change of changes) {
      if (!resolvedFiles.has(change.path)) {
        if (change.type === 'delete') {
          resolvedFiles.set(change.path, { content: '', deleted: true });
        } else {
          resolvedFiles.set(change.path, { content: change.content || '', deleted: false });
        }
      }
    }

    currentCommitId = commit.parentCommitId;
  }

  const files: any[] = [];
  for (const [path, data] of resolvedFiles.entries()) {
    if (!data.deleted) {
      files.push({ path, content: data.content });
    }
  }

  return files;
};
