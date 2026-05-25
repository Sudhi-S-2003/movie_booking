import React, { useState, useMemo } from 'react';
import { 
  FileCode, 
  FolderPlus, 
  FilePlus, 
  Trash2, 
  X, 
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Edit2
} from 'lucide-react';

interface FileTreeProps {
  files: { path: string; totalLength?: number }[];
  folders: { path: string }[];
  selectedPath: string | null;
  uncommittedChanges: Record<string, { type: 'add' | 'modify' | 'delete' | 'create-folder' | 'delete-folder'; content?: string }>;
  onSelect: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onCreateFolder: (path: string) => void;
  onDeleteFolder: (path: string) => void;
  onRename: (oldPath: string, newPath: string) => void;
  readOnly: boolean;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  children: Record<string, TreeNode>;
  status?: 'add' | 'modify' | 'delete' | 'create-folder' | 'delete-folder';
}

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

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  folders,
  selectedPath,
  uncommittedChanges,
  onSelect,
  onCreateFile,
  onDeleteFile,
  onCreateFolder,
  onDeleteFolder,
  onRename,
  readOnly
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [creatingInPath, setCreatingInPath] = useState<{ parentPath: string; type: 'file' | 'folder' } | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const handleRenameSubmit = (oldPath: string) => {
    const name = newName.trim();
    if (!name) return;

    const parts = oldPath.split('/');
    parts[parts.length - 1] = name;
    const newPath = parts.join('/');

    onRename(oldPath, newPath);
    setRenamingPath(null);
    setNewName('');
  };

  // Reconstruct tree hierarchy dynamically
  const tree = useMemo(() => {
    const root: TreeNode = { name: '', path: '', type: 'folder', children: {} };

    // 1. Add all folders
    folders.forEach(f => {
      const change = uncommittedChanges[f.path];
      if (change?.type === 'delete-folder') return;

      const parts = f.path.split('/');
      let current = root;
      let accumPath = '';
      parts.forEach(part => {
        accumPath = accumPath ? `${accumPath}/${part}` : part;
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: accumPath,
            type: 'folder',
            children: {}
          };
        }
        current = current.children[part]!;
      });
    });

    // 2. Add staged new folders
    Object.keys(uncommittedChanges).forEach(path => {
      const change = uncommittedChanges[path];
      if (change?.type === 'create-folder') {
        const parts = path.split('/');
        let current = root;
        let accumPath = '';
        parts.forEach(part => {
          accumPath = accumPath ? `${accumPath}/${part}` : part;
          if (!current.children[part]) {
            current.children[part] = {
              name: part,
              path: accumPath,
              type: 'folder',
              children: {},
              status: 'create-folder'
            };
          }
          current = current.children[part]!;
        });
      }
    });

    // 3. Add all base files
    files.forEach(f => {
      const change = uncommittedChanges[f.path];
      if (change?.type === 'delete') return;

      // Check if parent folders are deleted
      const parents = getAncestorPaths(f.path);
      const isParentDeleted = parents.some(p => uncommittedChanges[p]?.type === 'delete-folder');
      if (isParentDeleted) return;

      const parts = f.path.split('/');
      const fileName = parts[parts.length - 1]!;
      
      let current = root;
      let accumPath = '';
      for (let idx = 0; idx < parts.length - 1; idx++) {
        const part = parts[idx]!;
        accumPath = accumPath ? `${accumPath}/${part}` : part;
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: accumPath,
            type: 'folder',
            children: {}
          };
        }
        current = current.children[part]!;
      }

      current.children[fileName] = {
        name: fileName,
        path: f.path,
        type: 'file',
        children: {},
        status: change?.type as any // modify
      };
    });

    // 4. Add staged new files
    Object.keys(uncommittedChanges).forEach(path => {
      const change = uncommittedChanges[path];
      if (change?.type === 'add') {
        const parts = path.split('/');
        const fileName = parts[parts.length - 1]!;
        
        let current = root;
        let accumPath = '';
        for (let idx = 0; idx < parts.length - 1; idx++) {
          const part = parts[idx]!;
          accumPath = accumPath ? `${accumPath}/${part}` : part;
          if (!current.children[part]) {
            current.children[part] = {
              name: part,
              path: accumPath,
              type: 'folder',
              children: {}
            };
          }
          current = current.children[part]!;
        }

        current.children[fileName] = {
          name: fileName,
          path,
          type: 'file',
          children: {},
          status: 'add'
        };
      }
    });

    return root;
  }, [files, folders, uncommittedChanges]);

  // Handle new item form submit
  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name || !creatingInPath) return;

    const parent = creatingInPath.parentPath;
    const finalPath = parent ? `${parent}/${name}` : name;

    if (creatingInPath.type === 'file') {
      onCreateFile(finalPath);
    } else {
      onCreateFolder(finalPath);
    }

    // Auto expand parent when item is created
    if (parent) {
      setExpanded(prev => ({ ...prev, [parent]: true }));
    }

    setNewItemName('');
    setCreatingInPath(null);
  };

  // Render tree node recursively
  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    const childrenList = Object.values(node.children).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const isSelected = selectedPath === node.path;
    const isFolder = node.type === 'folder';
    const isExpanded = expanded[node.path] ?? false;

    // Badge indicator color styles
    let statusBadge = null;
    if (node.status === 'add' || node.status === 'create-folder') {
      statusBadge = (
        <span className="w-3.5 h-3.5 flex items-center justify-center text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
          A
        </span>
      );
    } else if (node.status === 'modify') {
      statusBadge = (
        <span className="w-3.5 h-3.5 flex items-center justify-center text-[8px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
          M
        </span>
      );
    }

    return (
      <div key={node.path || 'root'} className="select-none">
        {node.path && (
          <div
            style={{ paddingLeft: `${Math.max(8, depth * 14)}px` }}
            className={`group flex items-center justify-between py-1 px-2 mx-1.5 rounded-lg cursor-pointer transition-all ${
              isSelected 
                ? 'bg-zinc-900/80 text-white font-medium shadow-sm' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/20'
            }`}
            onClick={() => {
              if (renamingPath === node.path) return;
              if (isFolder) {
                setExpanded(prev => ({ ...prev, [node.path]: !isExpanded }));
              } else {
                onSelect(node.path);
              }
            }}
          >
            {renamingPath === node.path ? (
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {isFolder ? (
                  <FolderOpen size={13} className="text-zinc-400" />
                ) : (
                  <FileCode size={13} className="text-zinc-500" />
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRenameSubmit(node.path);
                  }}
                  className="flex items-center gap-1 flex-1 min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    autoFocus
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 min-w-0 bg-zinc-900 border border-zinc-750 rounded px-1.5 py-0.5 text-xs text-white outline-none"
                  />
                  <button type="submit" className="p-0.5 text-emerald-400 hover:text-emerald-300">
                    <Check size={11} />
                  </button>
                  <button type="button" onClick={() => setRenamingPath(null)} className="p-0.5 text-rose-400 hover:text-rose-300">
                    <X size={11} />
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 min-w-0">
                  {isFolder ? (
                    <>
                      {isExpanded ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
                      {isExpanded ? <FolderOpen size={13} className="text-zinc-400" /> : <Folder size={13} className="text-zinc-400" />}
                    </>
                  ) : (
                    <FileCode size={13} className="text-zinc-500 group-hover:text-zinc-400" />
                  )}
                  <span className="text-xs truncate">{node.name}</span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Staged folder/file actions */}
                  {!readOnly && isFolder && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreatingInPath({ parentPath: node.path, type: 'file' });
                          setExpanded(prev => ({ ...prev, [node.path]: true }));
                        }}
                        className="p-0.5 text-zinc-500 hover:text-white rounded hover:bg-zinc-800"
                        title="Add File"
                      >
                        <FilePlus size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreatingInPath({ parentPath: node.path, type: 'folder' });
                          setExpanded(prev => ({ ...prev, [node.path]: true }));
                        }}
                        className="p-0.5 text-zinc-500 hover:text-white rounded hover:bg-zinc-800"
                        title="Add Folder"
                      >
                        <FolderPlus size={12} />
                      </button>
                    </>
                  )}

                  {!readOnly && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingPath(node.path);
                          setNewName(node.name);
                        }}
                        className="p-0.5 text-zinc-500 hover:text-white rounded hover:bg-zinc-800"
                        title="Rename"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFolder) {
                            onDeleteFolder(node.path);
                          } else {
                            onDeleteFile(node.path);
                          }
                        }}
                        className="p-0.5 text-zinc-500 hover:text-rose-400 rounded hover:bg-zinc-800"
                        title={isFolder ? "Delete Folder" : "Delete File"}
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}

                  {statusBadge}
                </div>
              </>
            )}
          </div>
        )}

        {/* Child rendering logic */}
        {(!node.path || isExpanded) && (
          <div className="mt-0.5">
            {/* If form is active under this node, render inline input */}
            {creatingInPath && creatingInPath.parentPath === node.path && (
              <form 
                onSubmit={handleItemSubmit} 
                className="flex items-center gap-1.5 py-1 px-2 mx-1.5 rounded bg-zinc-900/30 border border-zinc-850"
                style={{ paddingLeft: `${Math.max(16, (depth + 1) * 14)}px` }}
              >
                {creatingInPath.type === 'folder' ? <Folder size={12} className="text-zinc-500" /> : <FileCode size={12} className="text-zinc-500" />}
                <input
                  autoFocus
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={creatingInPath.type === 'folder' ? 'folder_name' : 'file_name.js'}
                  className="flex-1 min-w-0 bg-transparent border-none text-xs text-white outline-none placeholder:text-zinc-700"
                />
                <div className="flex gap-0.5">
                  <button type="submit" className="p-0.5 text-emerald-400 hover:text-emerald-300">
                    <Check size={11} />
                  </button>
                  <button type="button" onClick={() => setCreatingInPath(null)} className="p-0.5 text-rose-400 hover:text-rose-300">
                    <X size={11} />
                  </button>
                </div>
              </form>
            )}

            {childrenList.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Sidebar Explorer toolbar */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Files Explorer</span>
        {!readOnly && (
          <div className="flex gap-1.5">
            <button
              onClick={() => setCreatingInPath({ parentPath: '', type: 'file' })}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              title="New File"
            >
              <FilePlus size={13} />
            </button>
            <button
              onClick={() => setCreatingInPath({ parentPath: '', type: 'folder' })}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              title="New Folder"
            >
              <FolderPlus size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Explorer Tree Panel */}
      <div className="flex-grow overflow-y-auto py-2 custom-scrollbar space-y-0.5">
        {renderNode(tree, -1)}
      </div>
    </div>
  );
};
