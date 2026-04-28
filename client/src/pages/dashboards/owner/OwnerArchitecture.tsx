import { useState, useEffect, useRef, memo } from "react";
import { Layout, Plus, Trash2, Sparkles, Wand2, Info, Monitor, Armchair } from "lucide-react";
import { useOwner } from "./context/OwnerContext.js";
import { ContextBar } from "./components/ContextBar.js";
import { SeatMinimap } from "./components/SeatMinimap.js";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.js";
import { DashboardPage } from "../../../components/dashboard/DashboardPage.js";
import { useLayoutEditor } from "../../../hooks/useLayoutEditor.js";
import {
  PRICE_GROUPS,
  PRICE_GROUP_SEAT_COLORS as COLOR_MAP,
  PRICE_GROUP_MINI_BG as MINI_BG,
} from "../../../constants/priceGroups.js";
import type { PriceGroup as PriceGroupType } from "../../../constants/priceGroups.js";

const SeatCell = memo(({
  col,
  rowIndex,
  colIndex,
  onUpdatePrice,
  onRemove,
}: {
  col: any;
  rowIndex: number;
  colIndex: number;
  onUpdatePrice: (ri: number, ci: number, pg: PriceGroupType) => void;
  onRemove: (ri: number, ci: number) => void;
}) => (
  <div className="relative group/seat w-10 h-11 transition-all duration-150 active:scale-95">
    <div className={`w-full h-full rounded-lg border-2 flex flex-col items-center justify-center transition-colors shadow-lg overflow-hidden ${
      col.type === "space"
        ? "bg-transparent border-dashed border-white/10 hover:border-white/30"
        : `${COLOR_MAP[col.priceGroup as PriceGroupType]} border-transparent`
    }`}>
      {col.type === "seat" && <div className="absolute top-1 w-6 h-1 bg-white/20 rounded-full blur-[1px]" />}
      <span className={`text-[10px] font-black select-none ${col.type === "space" ? "hidden group-hover/seat:block text-white/20" : "text-white"}`}>
        {col.type === "seat" ? col.name : "gap"}
      </span>
    </div>

    {}
    <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 opacity-0 pointer-events-none group-hover/seat:opacity-100 group-hover/seat:pointer-events-auto transition-opacity duration-150">
      <div className="bg-black/90 border border-white/10 rounded-xl p-1.5 shadow-2xl backdrop-blur-xl flex gap-1.5 min-w-max scale-90 origin-bottom">
        {PRICE_GROUPS.map(pg => (
          <button
            key={pg}
            onClick={() => onUpdatePrice(rowIndex, colIndex, pg)}
            className={`w-7 h-7 rounded-lg text-[8px] font-bold flex items-center justify-center hover:scale-110 transition-transform ${pg === col.priceGroup ? "ring-2 ring-white" : "opacity-40 hover:opacity-100"} ${COLOR_MAP[pg]}`}
          >
            {pg[0]}
          </button>
        ))}
        <div className="w-px h-6 bg-white/10 mx-1" />
        <button
          onClick={() => onRemove(rowIndex, colIndex)}
          className="w-7 h-7 bg-red-500/20 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="w-3 h-3 bg-black/90 rotate-45 border-r border-b border-white/10 absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
    </div>
  </div>
));
SeatCell.displayName = "SeatCell";

const SeatRow = memo(({
  row,
  rowIndex,
  onAddColumn,
  onFillRow,
  onApplyCategory,
  onRemoveRow,
  onUpdatePrice,
  onRemoveColumn,
}: {
  row: any;
  rowIndex: number;
  onAddColumn: (ri: number, type: "seat" | "space", count?: number) => void;
  onFillRow: (ri: number, count: number) => void;
  onApplyCategory: (ri: number, cat: PriceGroupType) => void;
  onRemoveRow: (ri: number) => void;
  onUpdatePrice: (ri: number, ci: number, pg: PriceGroupType) => void;
  onRemoveColumn: (ri: number, ci: number) => void;
}) => {
  if (row.type === "space") {
    return (
      <div className="group relative flex items-center justify-center w-[900px] h-10 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl hover:bg-white/[0.03] transition-colors">
        <span className="text-[8px] font-black text-white/5 tracking-[2em] uppercase group-hover:text-white/20 transition-colors">Horizontal Walkway</span>
        <button onClick={() => onRemoveRow(rowIndex)} className="absolute right-6 p-2 text-red-500 opacity-0 group-hover:opacity-100 hover:scale-110 transition-all"><Trash2 size={16} /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6 group/row relative">
      {}
      <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl font-black text-gray-500 text-xs border border-white/5 group-hover/row:border-accent-pink/40 group-hover/row:text-white transition-colors shadow-lg">
        {row.name}
      </div>

      {}
      <div className="flex gap-2">
        {row.columns.map((col: any, cIdx: number) => (
          <SeatCell
            key={cIdx}
            col={col}
            rowIndex={rowIndex}
            colIndex={cIdx}
            onUpdatePrice={onUpdatePrice}
            onRemove={onRemoveColumn}
          />
        ))}

        {}
        <div className="flex gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity ml-4">
          <button
            onClick={() => onAddColumn(rowIndex, "seat")}
            className="w-9 h-9 bg-white/5 text-accent-blue rounded-xl flex items-center justify-center hover:bg-accent-blue hover:text-white transition-colors border border-white/10"
            title="Add Seat"
          >
            <Plus size={16} />
          </button>
          <div className="group/bulk relative">
            <button className="w-9 h-9 bg-white/5 text-accent-purple rounded-xl flex items-center justify-center hover:bg-accent-purple hover:text-white transition-colors border border-white/10">
              <Wand2 size={16} />
            </button>
            <div className="absolute left-full ml-3 top-0 hidden group-hover/bulk:flex bg-black/90 border border-white/10 rounded-2xl p-3 shadow-2xl backdrop-blur-xl gap-3 z-[60] min-w-max">
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest pl-1">Fill Row</span>
                <div className="flex gap-2">
                  {[10, 15, 20].map(n => (
                    <button key={n} onClick={() => onFillRow(rowIndex, n)} className="px-3 py-1.5 bg-white/5 hover:bg-white/20 rounded-lg text-[10px] font-bold transition-colors underline decoration-accent-blue underline-offset-4 text-white">To {n}</button>
                  ))}
                </div>
              </div>
              <div className="w-px h-auto bg-white/10 mx-1" />
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest pl-1">Category</span>
                <div className="flex gap-2">
                  {PRICE_GROUPS.map(pg => (
                    <button key={pg} onClick={() => onApplyCategory(rowIndex, pg)} className={`w-8 h-8 rounded-lg flex items-center justify-center hover:scale-110 transition-transform ${COLOR_MAP[pg]} text-[10px] font-bold`}>{pg[0]}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => onAddColumn(rowIndex, "space")}
            className="w-9 h-9 bg-white/5 text-gray-500 rounded-xl flex items-center justify-center hover:bg-white hover:text-black transition-colors border border-white/10"
            title="Add Gap"
          >
            <div className="w-3 h-1 bg-current" />
          </button>
          <button
            onClick={() => onRemoveRow(rowIndex)}
            className="w-9 h-9 bg-white/5 text-red-500/40 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors border border-white/10"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {}
      <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl font-black text-gray-500 text-xs border border-white/5 group-hover/row:border-accent-pink/40 group-hover/row:text-white transition-colors shadow-lg">
        {row.name}
      </div>
    </div>
  );
});
SeatRow.displayName = "SeatRow";

export const OwnerArchitecture = () => {
  useDocumentTitle("Architecture — OwnerHub");
  const { screens, selectedScreenId, loading } = useOwner();
  const {
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
  } = useLayoutEditor();
  const [zoom, setZoom] = useState(1);

  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedScreenId) {
      const screen = screens.find(s => s._id === selectedScreenId);
      if (screen?.layout) setRows(screen.layout as unknown as typeof rows);
      else setRows([]);
    } else {
      setRows([]);
    }
    setZoom(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScreenId, screens]);

  const handleSaveLayout = () => {
    if (!selectedScreenId) return;
    void save(selectedScreenId);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px] font-black animate-pulse">SYNCHRONIZING CORE DATA...</div>;

  return (
    <DashboardPage
      title="Architecture"
      accentColor="text-accent-pink"
      badge="v3.0"
      subtitle="Design high-performance cinematic spaces with visual intelligence."
      icon={<Sparkles size={20} className="text-accent-blue" />}
    >
      <ContextBar onSaveLayout={handleSaveLayout} saveStatus={saveStatus} />

      {}
      {selectedScreenId && totalSeats > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.06] rounded-2xl px-5 py-3">
            <Armchair size={16} className="text-white/40" />
            <span className="text-lg font-black text-white">{totalSeats}</span>
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Seats</span>
          </div>
          <div className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.06] rounded-2xl px-5 py-3">
            <Monitor size={16} className="text-white/40" />
            <span className="text-lg font-black text-white">{rowCount}</span>
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Rows</span>
          </div>
          <div className="w-px h-8 bg-white/10 mx-1" />
          {PRICE_GROUPS.map(pg => (
            (seatBreakdown[pg] ?? 0) > 0 && (
              <div key={pg} className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] rounded-xl px-3.5 py-2">
                <div className={`w-2.5 h-2.5 rounded-full ${MINI_BG[pg]}`} />
                <span className="text-sm font-black text-white">{seatBreakdown[pg]}</span>
                <span className="text-[8px] font-bold text-gray-600 uppercase tracking-wider">{pg}</span>
              </div>
            )
          ))}
        </div>
      )}

      {}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white/[0.03] p-3 rounded-2xl border border-white/5 mb-6">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => addRow("row")} className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-accent-pink hover:border-accent-pink transition-colors text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl flex items-center gap-2 group">
            <Plus size={14} className="group-hover:scale-110 transition-transform" />
            Add Row
          </button>
          <button onClick={() => addRow("space")} className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl flex items-center gap-2">
            <Plus size={14} />
            Insert Aisle
          </button>
        </div>

        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
          <button onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))} className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg font-bold transition-colors text-white text-sm">+</button>
          <span className="text-[9px] font-black text-gray-400 min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.4))} className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg font-bold transition-colors text-white text-sm">−</button>
          <div className="w-px h-4 bg-white/10" />
          <button onClick={() => setZoom(1)} className="px-2.5 h-7 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-white transition-colors">Reset</button>
        </div>
      </div>

      {}
      <div className="relative bg-[#0d0d0f] rounded-[36px] border border-white/5 overflow-hidden shadow-2xl">
        {!selectedScreenId ? (
          <div className="flex flex-col items-center gap-6 text-white/5 py-40">
            <Layout size={120} strokeWidth={0.5} className="animate-pulse" />
            <p className="font-black uppercase tracking-[1em] text-[10px]">Select a screen to begin</p>
          </div>
        ) : (
          <>
            {}
            <div
              ref={canvasScrollRef}
              className="overflow-auto custom-scrollbar"
              style={{ maxHeight: "calc(100vh - 380px)" }}
            >
              <div
                ref={canvasContentRef}
                style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                className="flex flex-col items-center min-w-max w-full px-12 pt-10 pb-8 transition-transform duration-200 ease-out"
              >
                {}
                <div className="relative mb-20 group">
                  <div className="w-[700px] h-[36px] bg-white/90 rounded-[50%] blur-[2px] shadow-[0_12px_50px_rgba(255,255,255,0.35)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
                  </div>
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="text-[9px] font-black text-white/15 tracking-[1.5em] uppercase whitespace-nowrap">Projection Area</span>
                    <div className="w-40 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-3" />
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-white/[0.015] blur-[80px] rounded-full pointer-events-none" />
                </div>

                {}
                <div className="space-y-4 w-full flex flex-col items-center">
                  {rows.map((row, rowIndex) => (
                    <SeatRow
                      key={rowIndex}
                      row={row}
                      rowIndex={rowIndex}
                      onAddColumn={addColumn}
                      onFillRow={fillRow}
                      onApplyCategory={applyCategoryToRow}
                      onRemoveRow={removeRow}
                      onUpdatePrice={updatePriceGroup}
                      onRemoveColumn={removeColumn}
                    />
                  ))}
                </div>

                {}
                <div className="mt-14 flex gap-8 bg-black/40 px-8 py-4 rounded-full border border-white/5 backdrop-blur-xl shadow-xl">
                  {PRICE_GROUPS.map(pg => (
                    <div key={pg} className="flex items-center gap-3 group cursor-default">
                      <div className={`w-5 h-5 rounded-lg ${COLOR_MAP[pg]} border-transparent shadow-sm transition-transform group-hover:scale-110`} />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black tracking-widest uppercase text-white/80">{pg}</span>
                        <span className="text-[7px] font-bold text-gray-600">{seatBreakdown[pg]} seats</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {}
            <div className="absolute bottom-5 right-5 flex flex-col items-end gap-3 z-20">
              <SeatMinimap
                rows={rows}
                scrollRef={canvasScrollRef}
              />
              <div className="group relative">
                <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                  <Info size={18} />
                </button>
                <div className="absolute bottom-full right-0 mb-3 w-64 bg-black/90 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl hidden group-hover:block pointer-events-none">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-accent-blue mb-3">Pro Tips</h4>
                  <ul className="space-y-3">
                    <li className="flex gap-3">
                      <div className="w-5 h-5 rounded-md bg-accent-pink/10 flex items-center justify-center flex-shrink-0 text-accent-pink text-[9px] font-black">1</div>
                      <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Use <span className="text-white font-bold">Aisles</span> for vertical paths between blocks.</p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-5 h-5 rounded-md bg-accent-blue/10 flex items-center justify-center flex-shrink-0 text-accent-blue text-[9px] font-black">2</div>
                      <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Hover a row for the <span className="text-white font-bold">Magic Wand</span> — bulk fill & categories.</p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-5 h-5 rounded-md bg-accent-purple/10 flex items-center justify-center flex-shrink-0 text-accent-purple text-[9px] font-black">3</div>
                      <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Hover a <span className="text-white font-bold">Seat</span> to change its pricing tier.</p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardPage>
  );
};
