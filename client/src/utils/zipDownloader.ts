import { toast } from '../utils/toast.js';

export interface DbFileItem {
  path: string;
  content: string;
}

/**
 * Generates and downloads a ZIP file from the pre-loaded files list and staged uncommitted changes.
 */
export async function downloadWorkspaceAsZipPayload(
  projectTitle: string,
  dbFiles: DbFileItem[],
  uncommittedChanges: Record<string, { type: string; content?: string }>
): Promise<void> {
  try {
    // Dynamically import JSZip
    const JSZipModule = await import('jszip');
    // @ts-ignore
    const JSZip = JSZipModule.default || JSZipModule;
    const zip = new JSZip();

    // 1. Process files from DB (applying modifications and omitting deleted files)
    dbFiles.forEach(file => {
      const change = uncommittedChanges[file.path];
      if (change?.type === 'delete') {
        return; // Skip deleted files
      }

      const content = change && change.content !== undefined
        ? change.content
        : file.content;

      zip.file(file.path, content);
    });

    // 2. Add newly created staged files (type: 'add') that are not yet in the dbFiles list
    Object.keys(uncommittedChanges).forEach(path => {
      const change = uncommittedChanges[path]!;
      if (change.type === 'add' && change.content !== undefined) {
        if (!zip.file(path)) {
          zip.file(path, change.content);
        }
      }
    });

    toast.info('Generating ZIP archive...');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Trigger download
    const filename = `${projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-workspace.zip`;
    const element = document.createElement('a');
    element.href = URL.createObjectURL(zipBlob);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast.success('Workspace downloaded successfully');
  } catch (err: any) {
    toast.error('Failed to generate ZIP archive');
    console.error(err);
  }
}
