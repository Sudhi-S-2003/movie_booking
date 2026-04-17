
import { useCallback, useMemo, useState } from 'react';
import { adminApi } from '../services/api/index.js';
import type { LayoutRow as ApiLayoutRow } from '../types/models.js';
import { PRICE_GROUPS } from '../constants/priceGroups.js';
import type { PriceGroup } from '../constants/priceGroups.js';

export { PRICE_GROUPS };
export type { PriceGroup };

export type SeatColumn =
  | { type: 'seat'; name: string; priceGroup: PriceGroup }
  | { type: 'space' };

export type EditorRow =
  | { type: 'row'; name: string; columns: SeatColumn[] }
  | { type: 'space' };

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

const getNextRowName = (currentRowNames: string[]): string => {
  const last = currentRowNames[currentRowNames.length - 1];
  if (!last) return 'A';
  const charCode = last.charCodeAt(last.length - 1);
  if (charCode >= 90) return last + 'A';
  return last.slice(0, -1) + String.fromCharCode(charCode + 1);
};

const countSeats = (rows: EditorRow[]): number =>
  rows.reduce(
    (acc, row) =>
      row.type === 'row'
        ? acc + row.columns.filter((c) => c.type === 'seat').length
        : acc,
    0,
  );

export interface UseLayoutEditor {
  rows: EditorRow[];
  setRows: React.Dispatch<React.SetStateAction<EditorRow[]>>;
  saveStatus: SaveStatus;

  addRow: (type: 'row' | 'space') => void;
  removeRow: (index: number) => void;
  addColumn: (rowIndex: number, type: 'seat' | 'space', count?: number) => void;
  fillRow: (rowIndex: number, count: number) => void;
  applyCategoryToRow: (rowIndex: number, category: PriceGroup) => void;
  removeColumn: (rowIndex: number, colIndex: number) => void;
  updatePriceGroup: (rowIndex: number, colIndex: number, priceGroup: PriceGroup) => void;

  totalSeats: number;
  seatBreakdown: Record<PriceGroup, number>;
  rowCount: number;

  save: (screenId: string) => Promise<void>;
}

export function useLayoutEditor(): UseLayoutEditor {
  const [rows, setRows] = useState<EditorRow[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const addRow = useCallback((type: 'row' | 'space') => {
    setRows((prev) => {
      if (type === 'space') return [...prev, { type: 'space' }];
      const rowNames = prev
        .filter((r): r is Extract<EditorRow, { type: 'row' }> => r.type === 'row')
        .map((r) => r.name);
      return [...prev, { type: 'row', name: getNextRowName(rowNames), columns: [] }];
    });
  }, []);

  const removeRow = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addColumn = useCallback(
    (rowIndex: number, type: 'seat' | 'space', count = 1) => {
      setRows((prev) =>
        prev.map((row, i) => {
          if (i !== rowIndex || row.type !== 'row') return row;
          const newCols: SeatColumn[] = [...row.columns];
          for (let k = 0; k < count; k++) {
            const seatCountInRow = newCols.filter((c) => c.type === 'seat').length;
            newCols.push(
              type === 'seat'
                ? { type: 'seat', name: String(seatCountInRow + 1), priceGroup: 'STANDARD' }
                : { type: 'space' },
            );
          }
          return { ...row, columns: newCols };
        }),
      );
    },
    [],
  );

  const fillRow = useCallback((rowIndex: number, count: number) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex || row.type !== 'row') return row;
        const currentSeats = row.columns.filter((c) => c.type === 'seat').length;
        const needed = Math.max(0, count - currentSeats);
        if (needed === 0) return row;
        const newCols: SeatColumn[] = [...row.columns];
        for (let k = 0; k < needed; k++) {
          newCols.push({
            type: 'seat',
            name: String(currentSeats + k + 1),
            priceGroup: 'STANDARD',
          });
        }
        return { ...row, columns: newCols };
      }),
    );
  }, []);

  const applyCategoryToRow = useCallback((rowIndex: number, category: PriceGroup) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex || row.type !== 'row') return row;
        return {
          ...row,
          columns: row.columns.map((col) =>
            col.type === 'seat' ? { ...col, priceGroup: category } : col,
          ),
        };
      }),
    );
  }, []);

  const removeColumn = useCallback((rowIndex: number, colIndex: number) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex || row.type !== 'row') return row;
        const newCols = row.columns.filter((_, ci) => ci !== colIndex);
        let seatCounter = 1;
        const reIndexed = newCols.map<SeatColumn>((col) =>
          col.type === 'seat' ? { ...col, name: String(seatCounter++) } : col,
        );
        return { ...row, columns: reIndexed };
      }),
    );
  }, []);

  const updatePriceGroup = useCallback(
    (rowIndex: number, colIndex: number, priceGroup: PriceGroup) => {
      setRows((prev) =>
        prev.map((row, i) => {
          if (i !== rowIndex || row.type !== 'row') return row;
          const newCols: SeatColumn[] = [...row.columns];
          const existing = newCols[colIndex];
          if (existing && existing.type === 'seat') {
            newCols[colIndex] = { ...existing, priceGroup };
          }
          return { ...row, columns: newCols };
        }),
      );
    },
    [],
  );

  const totalSeats = useMemo(() => countSeats(rows), [rows]);

  const seatBreakdown = useMemo(() => {
    const counts: Record<PriceGroup, number> = {
      STANDARD: 0,
      PREMIUM: 0,
      VIP: 0,
      RECLINER: 0,
    };
    rows.forEach((r) => {
      if (r.type !== 'row') return;
      r.columns.forEach((c) => {
        if (c.type === 'seat') counts[c.priceGroup] += 1;
      });
    });
    return counts;
  }, [rows]);

  const rowCount = useMemo(() => rows.filter((r) => r.type === 'row').length, [rows]);

  const save = useCallback(
    async (screenId: string) => {
      setSaveStatus('saving');
      try {
        await adminApi.updateScreenLayout(
          screenId,
          rows as unknown as ApiLayoutRow[],
          countSeats(rows),
        );
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    },
    [rows],
  );

  return {
    rows,
    setRows,
    saveStatus,
    addRow,
    removeRow,
    addColumn,
    fillRow,
    applyCategoryToRow,
    removeColumn,
    updatePriceGroup,
    totalSeats,
    seatBreakdown,
    rowCount,
    save,
  };
}
