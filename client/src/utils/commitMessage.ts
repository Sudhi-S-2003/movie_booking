/**
 * Helper to get the base name of a path (e.g. "src/components/Button.tsx" -> "Button.tsx")
 */
function getBasename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

/**
 * Generates a default commit message based on staged changes
 */
export function generateDefaultCommitMessage(
  uncommittedChanges: Record<string, { type: 'add' | 'modify' | 'delete' | 'create-folder' | 'delete-folder' | string; content?: string }>
): string {
  const changePaths = Object.keys(uncommittedChanges);
  if (changePaths.length === 0) {
    return '';
  }

  // If there's exactly one change
  if (changePaths.length === 1) {
    const path = changePaths[0]!;
    const change = uncommittedChanges[path]!;
    const name = getBasename(path);

    switch (change.type) {
      case 'add':
        return `Added ${name}`;
      case 'modify':
        return `Updated ${name}`;
      case 'delete':
        return `Deleted ${name}`;
      case 'create-folder':
        return `Created folder ${name}`;
      case 'delete-folder':
        return `Deleted folder ${name}`;
      default:
        return `Updated ${name}`;
    }
  }

  // Count changes
  let addCount = 0;
  let modifyCount = 0;
  let deleteCount = 0;
  let folderAddCount = 0;
  let folderDeleteCount = 0;

  changePaths.forEach(path => {
    const change = uncommittedChanges[path]!;
    switch (change.type) {
      case 'add':
        addCount++;
        break;
      case 'modify':
        modifyCount++;
        break;
      case 'delete':
        deleteCount++;
        break;
      case 'create-folder':
        folderAddCount++;
        break;
      case 'delete-folder':
        folderDeleteCount++;
        break;
      default:
        modifyCount++;
        break;
    }
  });

  const parts: string[] = [];
  if (addCount > 0) parts.push(`added ${addCount} ${addCount === 1 ? 'file' : 'files'}`);
  if (modifyCount > 0) parts.push(`updated ${modifyCount} ${modifyCount === 1 ? 'file' : 'files'}`);
  if (deleteCount > 0) parts.push(`deleted ${deleteCount} ${deleteCount === 1 ? 'file' : 'files'}`);
  if (folderAddCount > 0) parts.push(`created ${folderAddCount} ${folderAddCount === 1 ? 'folder' : 'folders'}`);
  if (folderDeleteCount > 0) parts.push(`deleted ${folderDeleteCount} ${folderDeleteCount === 1 ? 'folder' : 'folders'}`);

  // Create summary
  if (parts.length === 1) {
    const summary = parts[0]!;
    return summary.charAt(0).toUpperCase() + summary.slice(1);
  }

  return `Updated workspace (${parts.join(', ')})`;
}
