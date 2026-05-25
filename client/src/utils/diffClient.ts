export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  leftLineNumber?: number;
  rightLineNumber?: number;
}

/**
 * Computes a line-by-line diff between two text strings using the standard
 * Longest Common Subsequence (LCS) dynamic programming algorithm.
 */
export function computeLineDiffClient(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);

  const n = oldLines.length;
  const m = newLines.length;

  const dp: number[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const row = dp[i];
    const prevRow = dp[i - 1];
    if (row && prevRow) {
      for (let j = 1; j <= m; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          row[j] = (prevRow[j - 1] || 0) + 1;
        } else {
          row[j] = Math.max(prevRow[j] || 0, row[j - 1] || 0);
        }
      }
    }
  }

  const diff: DiffLine[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    const row = dp[i];
    const prevRow = i > 0 ? dp[i - 1] : undefined;
    const currentVal = row ? (row[j - 1] || 0) : 0;
    const prevVal = prevRow ? (prevRow[j] || 0) : 0;

    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diff.unshift({
        type: 'unchanged',
        content: oldLines[i - 1] || '',
        leftLineNumber: i,
        rightLineNumber: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || currentVal >= prevVal)) {
      diff.unshift({
        type: 'added',
        content: newLines[j - 1] || '',
        rightLineNumber: j,
      });
      j--;
    } else if (i > 0) {
      diff.unshift({
        type: 'removed',
        content: oldLines[i - 1] || '',
        leftLineNumber: i,
      });
      i--;
    } else {
      break;
    }
  }

  return diff;
}
