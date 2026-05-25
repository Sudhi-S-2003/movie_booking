import { create } from 'zustand';
import { http } from '../services/api/http.js';
import { toast } from '../utils/toast.js';

interface ProjectV2 {
  _id: string;
  title: string;
  createdBy: string;
  headCommitId: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface CommitV2 {
  _id: string;
  message: string;
  createdBy: string;
  createdAt: string;
  totalChanges: number;
  totalAdditions: number;
  totalDeletions: number;
}

interface FileHeaderV2 {
  path: string;
  totalLength: number;
  content?: string;
}

interface FolderHeaderV2 {
  path: string;
}

interface UncommittedChange {
  type: 'add' | 'modify' | 'delete' | 'create-folder' | 'delete-folder';
  content?: string;
}

interface CodeShareV2State {
  id: string | null;
  category: string | null;
  signature: string | null;
  expiresAt: string | null;

  // Metadata & Lists
  project: ProjectV2 | null;
  files: FileHeaderV2[];
  folders: FolderHeaderV2[];
  commits: CommitV2[];
  selectedPath: string | null;
  activeCommitId: string | null;

  // Paginated File Contents Map
  fileContents: Record<string, string>;
  baseFileContents: Record<string, string>;
  fileLoadingProgress: Record<string, number>;

  // Staged modifications
  uncommittedChanges: Record<string, UncommittedChange>;

  // Commit Details (for diff inspection)
  viewedCommit: any | null;
  selectedDiffPath: string | null;

  // Statuses
  isLoading: boolean;
  isSaving: boolean;
  isFileLoading: boolean;
  isDownloading: boolean;
  downloadProgress: number | null;

  // Operations
  init: (params: { id: string; category: string; signature: string; expiresAt: string }) => Promise<void>;
  selectFile: (path: string | null) => Promise<void>;
  loadFileContent: (path: string) => Promise<void>;
  createFile: (path: string) => void;
  deleteFile: (path: string) => void;
  createFolder: (path: string) => void;
  deleteFolder: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  discardChanges: () => void;
  commitChanges: (message: string) => Promise<boolean>;
  checkoutCommit: (commitId: string | null) => Promise<void>;
  loadCommitDetails: (commitId: string) => Promise<void>;
  setSelectedDiffPath: (path: string | null) => void;
  downloadWorkspace: () => Promise<void>;
  renameItem: (oldPath: string, newPath: string) => void;
}

export const useCodeShareStoreV2 = create<CodeShareV2State>((set, get) => ({
  id: null,
  category: null,
  signature: null,
  expiresAt: null,

  project: null,
  files: [],
  folders: [],
  commits: [],
  selectedPath: null,
  activeCommitId: null,

  fileContents: {},
  baseFileContents: {},
  fileLoadingProgress: {},
  uncommittedChanges: {},

  viewedCommit: null,
  selectedDiffPath: null,

  isLoading: false,
  isSaving: false,
  isFileLoading: false,
  isDownloading: false,
  downloadProgress: null,

  init: async ({ id, category, signature, expiresAt }) => {
    set({ id, category, signature, expiresAt, isLoading: true, uncommittedChanges: {}, fileContents: {}, baseFileContents: {}, fileLoadingProgress: {}, activeCommitId: null, viewedCommit: null, selectedDiffPath: null });
    try {
      const res: any = await http.get(`/public/api-service/${category}/${id}`, {
        params: { signature, expiresAt, action: 'v2-read' }
      });

      const { project, files, folders, commits } = res.data;
      const initialSelected = files.length > 0 ? files[0].path : null;

      const fileContents: Record<string, string> = {};
      const baseFileContents: Record<string, string> = {};
      files.forEach((f: any) => {
        if (f.content !== undefined) {
          fileContents[f.path] = f.content;
          baseFileContents[f.path] = f.content;
        }
      });

      set({
        project,
        files,
        folders,
        commits,
        selectedPath: initialSelected,
        fileContents,
        baseFileContents,
        isLoading: false
      });

      if (initialSelected) {
        await get().loadFileContent(initialSelected);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize repository');
      set({ isLoading: false });
    }
  },

  selectFile: async (path) => {
    set({ selectedPath: path });
    if (path) {
      await get().loadFileContent(path);
    }
  },

  loadFileContent: async (path) => {
    const { id, category, signature, expiresAt, activeCommitId, fileContents, files, uncommittedChanges } = get();
    if (!id || !category) return;

    if (uncommittedChanges[path]?.type === 'add') return;

    const fileHeader = files.find(f => f.path === path);
    const targetLength = fileHeader ? fileHeader.totalLength : 0;
    const currentLength = fileContents[path]?.length || 0;

    if (currentLength >= targetLength && fileContents[path] !== undefined) return;

    set({ isFileLoading: true });
    try {
      let content = '';
      let hasMore = true;
      let offset = 0;

      while (hasMore) {
        const res: any = await http.get(`/public/api-service/${category}/${id}`, {
          params: {
            signature,
            expiresAt,
            action: 'v2-get-file',
            path,
            offset,
            commitId: activeCommitId || undefined
          }
        });

        const chunk = res.data.content;
        content += chunk;
        hasMore = res.data.hasMore;
        offset = res.data.nextOffset;
        const total = res.data.totalLength || 1;

        set(state => ({
          fileContents: {
            ...state.fileContents,
            [path]: content
          },
          fileLoadingProgress: {
            ...state.fileLoadingProgress,
            [path]: Math.round((content.length / total) * 100)
          }
        }));
      }

      set(state => ({
        baseFileContents: {
          ...state.baseFileContents,
          [path]: content
        }
      }));

      set({ isFileLoading: false });
    } catch (err: any) {
      toast.error(`Failed to load file content: ${path}`);
      set({ isFileLoading: false });
    }
  },

  createFile: (path) => {
    const { files, uncommittedChanges, fileContents } = get();
    if (files.some(f => f.path === path) || uncommittedChanges[path]) {
      toast.error('File already exists');
      return;
    }

    set({
      files: [...files, { path, totalLength: 0 }],
      fileContents: {
        ...fileContents,
        [path]: ''
      },
      uncommittedChanges: {
        ...uncommittedChanges,
        [path]: { type: 'add', content: '' }
      },
      selectedPath: path
    });
  },

  deleteFile: (path) => {
    const { files, uncommittedChanges, selectedPath } = get();
    const isNew = uncommittedChanges[path]?.type === 'add';

    const updatedChanges = { ...uncommittedChanges };
    let updatedFiles = [...files];

    if (isNew) {
      delete updatedChanges[path];
      updatedFiles = updatedFiles.filter(f => f.path !== path);
    } else {
      updatedChanges[path] = { type: 'delete' };
    }

    let newSelected = selectedPath;
    if (selectedPath === path) {
      const remainingFiles = updatedFiles.filter(f => f.path !== path && updatedChanges[f.path]?.type !== 'delete');
      newSelected = remainingFiles[0]?.path || null;
    }

    set({
      files: updatedFiles,
      uncommittedChanges: updatedChanges,
      selectedPath: newSelected
    });
  },

  createFolder: (path) => {
    const { folders, uncommittedChanges } = get();
    if (folders.some(f => f.path === path) || uncommittedChanges[path]) {
      toast.error('Folder already exists');
      return;
    }

    set({
      folders: [...folders, { path }],
      uncommittedChanges: {
        ...uncommittedChanges,
        [path]: { type: 'create-folder' }
      }
    });
  },

  deleteFolder: (path) => {
    const { files, folders, uncommittedChanges, selectedPath } = get();
    const isNew = uncommittedChanges[path]?.type === 'create-folder';

    const updatedChanges = { ...uncommittedChanges };
    let updatedFolders = [...folders];
    let updatedFiles = [...files];

    // Remove newly created folders and files inside deleted folder from memory
    if (isNew) {
      delete updatedChanges[path];
      updatedFolders = updatedFolders.filter(f => f.path !== path && !f.path.startsWith(path + '/'));
      
      // Filter out files that were created locally under this folder
      const locallyCreatedFilesToDelete = Object.keys(updatedChanges).filter(
        k => k.startsWith(path + '/') && updatedChanges[k]?.type === 'add'
      );
      locallyCreatedFilesToDelete.forEach(k => delete updatedChanges[k]);
      updatedFiles = updatedFiles.filter(f => !f.path.startsWith(path + '/'));
    } else {
      // Stage folder deletion
      updatedChanges[path] = { type: 'delete-folder' };
      
      // Stage deletions for all existing base files under this folder path
      updatedFiles.forEach(f => {
        if (f.path.startsWith(path + '/')) {
          updatedChanges[f.path] = { type: 'delete' };
        }
      });
    }

    // Adjust selection if it was inside the deleted directory
    let newSelected = selectedPath;
    if (selectedPath && selectedPath.startsWith(path + '/')) {
      const remainingFiles = updatedFiles.filter(
        f => !f.path.startsWith(path + '/') && updatedChanges[f.path]?.type !== 'delete'
      );
      newSelected = remainingFiles[0]?.path || null;
    }

    set({
      files: updatedFiles,
      folders: updatedFolders,
      uncommittedChanges: updatedChanges,
      selectedPath: newSelected
    });
  },

  updateFileContent: (path, content) => {
    const { uncommittedChanges, files } = get();
    const originalFile = files.find(f => f.path === path);
    const updatedChanges = { ...uncommittedChanges };

    set(state => ({
      fileContents: {
        ...state.fileContents,
        [path]: content
      }
    }));

    if (originalFile && uncommittedChanges[path]?.type !== 'add') {
      updatedChanges[path] = { type: 'modify', content };
    } else {
      updatedChanges[path] = { type: 'add', content };
    }

    set({ uncommittedChanges: updatedChanges });
  },

  discardChanges: () => {
    const { files, selectedPath } = get();
    let newSelected = selectedPath;
    if (selectedPath && !files.some(f => f.path === selectedPath)) {
      newSelected = files[0]?.path || null;
    }
    set({ uncommittedChanges: {}, selectedPath: newSelected });
    if (newSelected) {
      set(state => ({
        fileContents: {
          ...state.fileContents,
          [newSelected!]: ''
        }
      }));
      get().loadFileContent(newSelected);
    }
    toast.success('Local changes discarded');
  },

  commitChanges: async (message) => {
    const { id, category, signature, expiresAt, uncommittedChanges } = get();
    if (!id || !category) return false;

    const changeKeys = Object.keys(uncommittedChanges);
    if (changeKeys.length === 0) {
      toast.error('No changes to commit');
      return false;
    }

    set({ isSaving: true });
    try {
      const payloadChanges = changeKeys.map(path => {
        const change = uncommittedChanges[path]!;
        return {
          path,
          type: change.type,
          content: change.content
        };
      });

      await http.post(`/public/api-service/${category}/${id}`, {
        action: 'v2-commit',
        message,
        changes: payloadChanges
      }, {
        params: { signature, expiresAt }
      });

      toast.success('Changes committed successfully');
      set({ isSaving: false });
      
      await get().init({ id, category, signature: signature!, expiresAt: expiresAt! });
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create commit');
      set({ isSaving: false });
      return false;
    }
  },

  checkoutCommit: async (commitId) => {
    const { id, category, signature, expiresAt } = get();
    if (!id) return;

    set({ isLoading: true, activeCommitId: commitId, viewedCommit: null, selectedDiffPath: null, fileContents: {}, baseFileContents: {}, fileLoadingProgress: {} });
    try {
      const res: any = await http.get(`/public/api-service/${category}/${id}`, {
        params: { signature, expiresAt, action: 'v2-read', commitId: commitId || undefined }
      });

      const { files, folders } = res.data;

      const fileContents: Record<string, string> = {};
      const baseFileContents: Record<string, string> = {};
      files.forEach((f: any) => {
        if (f.content !== undefined) {
          fileContents[f.path] = f.content;
          baseFileContents[f.path] = f.content;
        }
      });

      set({
        files,
        folders,
        selectedPath: files.length > 0 ? files[0].path : null,
        fileContents,
        baseFileContents,
        isLoading: false
      });

      if (files.length > 0) {
        await get().loadFileContent(files[0].path);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to checkout commit');
      set({ isLoading: false });
    }
  },

  loadCommitDetails: async (commitId) => {
    const { id, category, signature, expiresAt } = get();
    set({ isLoading: true, viewedCommit: null, selectedDiffPath: null });
    try {
      const res: any = await http.get(`/public/api-service/${category}/${id}`, {
        params: { signature, expiresAt, action: 'v2-commit-details', commitId }
      });

      const commit = res.data;
      set({
        viewedCommit: commit,
        selectedDiffPath: commit.changes.length > 0 ? commit.changes[0].path : null,
        isLoading: false
      });
    } catch (err: any) {
      toast.error('Failed to load commit details');
      set({ isLoading: false });
    }
  },

  setSelectedDiffPath: (path) => {
    set({ selectedDiffPath: path });
  },

  downloadWorkspace: async () => {
    const { id, category, signature, expiresAt, activeCommitId, project } = get();
    if (!id || !category || !project) return;

    set({ isDownloading: true, downloadProgress: 0 });
    toast.info('Fetching all repository files...');
    try {
      const res: any = await http.get(`/public/api-service/${category}/${id}`, {
        params: {
          signature,
          expiresAt,
          action: 'v2-download-all',
          commitId: activeCommitId || undefined
        },
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            set({ downloadProgress: pct });
          } else {
            set({ downloadProgress: -1 });
          }
        }
      });

      const { files, projectTitle } = res.data;

      // Dynamically import utility to keep bundle size small on page load
      const { downloadWorkspaceAsZipPayload } = await import('../utils/zipDownloader.js');

      await downloadWorkspaceAsZipPayload(
        projectTitle || project.title,
        files,
        get().uncommittedChanges
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to download workspace');
    } finally {
      set({ isDownloading: false, downloadProgress: null });
    }
  },

  renameItem: (oldPath, newPath) => {
    const { files, folders, uncommittedChanges, fileContents, baseFileContents, selectedPath } = get();
    if (oldPath === newPath) return;

    // Check if newPath already exists
    if (
      files.some(f => f.path === newPath && uncommittedChanges[f.path]?.type !== 'delete') || 
      folders.some(f => f.path === newPath && uncommittedChanges[f.path]?.type !== 'delete-folder') || 
      (uncommittedChanges[newPath] && uncommittedChanges[newPath].type !== 'delete')
    ) {
      toast.error('A file or folder with this name already exists');
      return;
    }

    const updatedChanges = { ...uncommittedChanges };
    const updatedFileContents = { ...fileContents };
    const updatedBaseFileContents = { ...baseFileContents };
    let updatedFiles = [...files];
    let updatedFolders = [...folders];
    let newSelected = selectedPath;

    const isFolder = folders.some(f => f.path === oldPath) || uncommittedChanges[oldPath]?.type === 'create-folder';

    if (isFolder) {
      const isNewFolder = uncommittedChanges[oldPath]?.type === 'create-folder';

      if (isNewFolder) {
        // Just rename the folder keys in uncommittedChanges & folders array
        delete updatedChanges[oldPath];
        updatedChanges[newPath] = { type: 'create-folder' };
        updatedFolders = updatedFolders.map(f => f.path === oldPath ? { ...f, path: newPath } : f);
      } else {
        // Stage delete old folder, and stage create new folder
        updatedChanges[oldPath] = { type: 'delete-folder' };
        updatedChanges[newPath] = { type: 'create-folder' };
        updatedFolders.push({ path: newPath });
      }

      // Rename sub-folders
      folders.forEach(f => {
        if (f.path.startsWith(oldPath + '/')) {
          const targetNewPath = f.path.replace(oldPath + '/', newPath + '/');
          const isSubFolderNew = uncommittedChanges[f.path]?.type === 'create-folder';
          
          if (isSubFolderNew) {
            delete updatedChanges[f.path];
            updatedChanges[targetNewPath] = { type: 'create-folder' };
            updatedFolders = updatedFolders.map(folder => folder.path === f.path ? { ...folder, path: targetNewPath } : folder);
          } else {
            updatedChanges[f.path] = { type: 'delete-folder' };
            updatedChanges[targetNewPath] = { type: 'create-folder' };
            updatedFolders.push({ path: targetNewPath });
          }
        }
      });

      // Rename sub-files
      files.forEach(f => {
        if (f.path.startsWith(oldPath + '/')) {
          const targetNewPath = f.path.replace(oldPath + '/', newPath + '/');
          const isFileNew = uncommittedChanges[f.path]?.type === 'add';

          const fileContent = updatedFileContents[f.path] ?? '';
          const baseContent = updatedBaseFileContents[f.path] ?? '';

          updatedFileContents[targetNewPath] = fileContent;
          delete updatedFileContents[f.path];

          if (updatedBaseFileContents[f.path] !== undefined) {
            updatedBaseFileContents[targetNewPath] = baseContent;
            delete updatedBaseFileContents[f.path];
          }

          if (isFileNew) {
            delete updatedChanges[f.path];
            updatedChanges[targetNewPath] = { type: 'add', content: fileContent };
            updatedFiles = updatedFiles.map(file => file.path === f.path ? { ...file, path: targetNewPath } : file);
          } else {
            updatedChanges[f.path] = { type: 'delete' };
            updatedChanges[targetNewPath] = { type: 'add', content: fileContent };
            updatedFiles.push({ path: targetNewPath, totalLength: fileContent.length });
          }

          if (newSelected === f.path) {
            newSelected = targetNewPath;
          }
        }
      });

    } else {
      // It's a file
      const isNew = uncommittedChanges[oldPath]?.type === 'add';
      const fileContent = updatedFileContents[oldPath] ?? '';
      const baseContent = updatedBaseFileContents[oldPath] ?? '';

      updatedFileContents[newPath] = fileContent;
      delete updatedFileContents[oldPath];

      if (updatedBaseFileContents[oldPath] !== undefined) {
        updatedBaseFileContents[newPath] = baseContent;
        delete updatedBaseFileContents[oldPath];
      }

      if (isNew) {
        delete updatedChanges[oldPath];
        updatedChanges[newPath] = { type: 'add', content: fileContent };
        updatedFiles = updatedFiles.map(f => f.path === oldPath ? { ...f, path: newPath } : f);
      } else {
        updatedChanges[oldPath] = { type: 'delete' };
        updatedChanges[newPath] = { type: 'add', content: fileContent };
        updatedFiles.push({ path: newPath, totalLength: fileContent.length });
      }

      if (newSelected === oldPath) {
        newSelected = newPath;
      }
    }

    set({
      files: updatedFiles,
      folders: updatedFolders,
      uncommittedChanges: updatedChanges,
      fileContents: updatedFileContents,
      baseFileContents: updatedBaseFileContents,
      selectedPath: newSelected
    });

    toast.success('Renamed successfully');
  }
}));
