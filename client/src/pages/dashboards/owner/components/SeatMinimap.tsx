import React, { useRef, useEffect, useCallback, memo } from "react";

const MINI_COLORS: Record<string, string> = {
  STANDARD: "#64748b",
  PREMIUM: "#1fb6ff",
  VIP: "#6d28d9",
  RECLINER: "#ff2d55",
};

interface SeatMinimapProps {
  rows: any[];
  scrollRef: React.RefObject<HTMLElement | null>;
}

export const SeatMinimap = memo(({ rows, scrollRef }: SeatMinimapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const maxCols = rows.reduce((max, r) => r.type === "row" ? Math.max(max, r.columns?.length || 0) : max, 0);
  const rowCount = rows.length;

  const MAP_W = 180;
  const MAP_H = 120;

  const drawMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || rowCount === 0 || maxCols === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = MAP_W * dpr;
    canvas.height = MAP_H * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, MAP_W, MAP_H);

    const padX = 10;
    const padY = 8;
    const innerW = MAP_W - padX * 2;
    const innerH = MAP_H - padY * 2;

    const cellW = Math.min(4, innerW / maxCols);
    const cellH = Math.min(4, innerH / rowCount);
    const gapX = Math.max(0.5, cellW * 0.15);
    const gapY = Math.max(1, cellH * 0.3);

    const totalW = maxCols * (cellW + gapX);
    const totalH = rowCount * (cellH + gapY);
    const offsetX = padX + (innerW - totalW) / 2;
    const offsetY = padY + (innerH - totalH) / 2;

    ctx.fillStyle = "rgba(255,255,255,0.25)";
    const screenW = totalW * 0.6;
    ctx.beginPath();
    ctx.ellipse(offsetX + totalW / 2, offsetY - 4, screenW / 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    rows.forEach((row, ri) => {
      if (row.type === "space") {
        const y = offsetY + ri * (cellH + gapY) + cellH / 2;
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(offsetX, y);
        ctx.lineTo(offsetX + totalW, y);
        ctx.stroke();
        ctx.setLineDash([]);
        return;
      }

      const cols = row.columns || [];
      cols.forEach((col: any, ci: number) => {
        const x = offsetX + ci * (cellW + gapX);
        const y = offsetY + ri * (cellH + gapY);

        if (col.type === "space") {
          return;
        }

        ctx.fillStyle = MINI_COLORS[col.priceGroup] ?? MINI_COLORS.STANDARD ?? "#888";
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(x, y, cellW, cellH, 0.5);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    });
  }, [rows, rowCount, maxCols]);

  const updateViewport = useCallback(() => {
    const viewport = viewportRef.current;
    const scroll = scrollRef.current;
    if (!viewport || !scroll) return;

    const totalW = scroll.scrollWidth;
    const totalH = scroll.scrollHeight;

    if (totalW === 0 || totalH === 0) {
      viewport.style.display = "none";
      return;
    }

    viewport.style.display = "block";

    const scaleX = MAP_W / totalW;
    const scaleY = MAP_H / totalH;

    viewport.style.left = `${scroll.scrollLeft * scaleX}px`;
    viewport.style.top = `${scroll.scrollTop * scaleY}px`;
    viewport.style.width = `${Math.min(MAP_W, scroll.clientWidth * scaleX)}px`;
    viewport.style.height = `${Math.min(MAP_H, scroll.clientHeight * scaleY)}px`;
  }, [scrollRef]);

  useEffect(() => {
    drawMinimap();
  }, [drawMinimap]);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    const onScroll = () => requestAnimationFrame(updateViewport);
    scroll.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    requestAnimationFrame(() => requestAnimationFrame(updateViewport));

    return () => {
      scroll.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [scrollRef, updateViewport]);

  const handleMapClick = useCallback((e: React.MouseEvent) => {
    const scroll = scrollRef.current;
    const map = mapRef.current;
    if (!scroll || !map) return;

    const rect = map.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const targetX = (clickX / MAP_W) * scroll.scrollWidth - scroll.clientWidth / 2;
    const targetY = (clickY / MAP_H) * scroll.scrollHeight - scroll.clientHeight / 2;

    scroll.scrollTo({ left: targetX, top: targetY, behavior: "smooth" });
  }, [scrollRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    handleMapClick(e);

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const map = mapRef.current;
      const scroll = scrollRef.current;
      if (!map || !scroll) return;

      const rect = map.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;

      scroll.scrollTo({
        left: (x / MAP_W) * scroll.scrollWidth - scroll.clientWidth / 2,
        top: (y / MAP_H) * scroll.scrollHeight - scroll.clientHeight / 2,
      });
    };

    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [handleMapClick, scrollRef]);

  if (rowCount === 0 || maxCols === 0) return null;

  return (
    <div
      ref={mapRef}
      onMouseDown={handleMouseDown}
      className="relative bg-black/80 border border-white/10 rounded-2xl overflow-hidden cursor-crosshair shadow-2xl backdrop-blur-xl"
      style={{ width: MAP_W, height: MAP_H }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: MAP_W, height: MAP_H }}
        className="block"
      />
      <div
        ref={viewportRef}
        className="absolute border-2 border-accent-blue/60 bg-accent-blue/10 rounded-sm pointer-events-none"
        style={{ transition: "left 0.05s, top 0.05s" }}
      />
      <div className="absolute top-1.5 left-2.5">
        <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">Minimap</span>
      </div>
    </div>
  );
});

SeatMinimap.displayName = "SeatMinimap";
