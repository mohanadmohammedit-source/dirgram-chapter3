import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileCode2,
  FileText,
  Grid3X3,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Minimize2,
  Printer,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { DiagramSpec, DiagramTheme, DiagramThemeId } from '../types/diagram';
import { THEME_LIST } from '../data/themes';
import { renderDiagramToSvgString } from '../utils/svgRenderer';

interface DiagramCanvasProps {
  diagram: DiagramSpec;
  theme: DiagramTheme;
  onThemeChange: (id: DiagramThemeId) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onSelectEdge: (edgeId: string | null) => void;
  includeLegend: boolean;
  onToggleLegend: () => void;
  onDownloadSvg: () => void;
  onDownloadPng: () => Promise<void>;
  onDownloadDocx: () => Promise<void>;
  isExportingSingle: boolean;
  hasEdits: boolean;
  onResetDiagram: () => void;
}

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({
  diagram,
  theme,
  onThemeChange,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  includeLegend,
  onToggleLegend,
  onDownloadSvg,
  onDownloadPng,
  onDownloadDocx,
  isExportingSingle,
  hasEdits,
  onResetDiagram,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(0.78);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });
  const [showGrid, setShowGrid] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const svgMarkup = useMemo(
    () =>
      renderDiagramToSvgString(diagram, theme, {
        includeFrame: true,
        includeCaption: true,
        includeLegend,
        selectedNodeId,
        selectedEdgeId,
      }),
    [diagram, theme, includeLegend, selectedNodeId, selectedEdgeId]
  );

  // Auto-fit diagram inside viewport whenever active diagram changes
  const fitToViewport = () => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const padding = 48;
    const availW = Math.max(320, rect.width - padding);
    const availH = Math.max(260, rect.height - padding);
    const totalH = diagram.height + 64 + (includeLegend ? 44 : 0) + 46;
    const scale = Math.min(availW / diagram.width, availH / totalH, 1.05);
    setZoom(Math.max(0.35, Number(scale.toFixed(2))));
    setPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fitToViewport();
    }, 30);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram.id, isFullscreen]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-node-id]') || target.closest('[data-edge-id]')) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSvgClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    const nodeEl = target.closest('[data-node-id]');
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id');
      onSelectEdge(null);
      onSelectNode(nodeId);
      return;
    }
    const edgeEl = target.closest('[data-edge-id]');
    if (edgeEl) {
      const edgeId = edgeEl.getAttribute('data-edge-id');
      onSelectNode(null);
      onSelectEdge(edgeId);
      return;
    }
    onSelectNode(null);
    onSelectEdge(null);
  };

  const handlePrintA4 = () => {
    const printSvg = renderDiagramToSvgString(diagram, theme, {
      includeFrame: true,
      includeCaption: true,
      includeLegend,
    });
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(`<!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>${diagram.figureNumber} - ${diagram.title}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&family=IBM+Plex+Mono:wght@600;700&family=IBM+Plex+Sans+Arabic:wght@500;600;700&display=swap" rel="stylesheet" />
          <style>
            @page { size: A4 landscape; margin: 6mm; }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              background: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            svg {
              width: 100%;
              height: auto;
              max-height: 196mm;
              display: block;
            }
          </style>
        </head>
        <body>${printSvg}</body>
      </html>`);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 350);
  };

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col bg-white'
          : 'flex h-full min-h-0 flex-1 flex-col bg-white'
      }
    >
      {/* Diagram Contextual Header & Per-Diagram Export Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono-num font-semibold text-[#1D3C78]">
              {diagram.figureNumber}
            </span>
            <span>·</span>
            <span>{diagram.categoryLabel}</span>
            <span>·</span>
            <span className="font-mono-num">
              القسم {diagram.sectionNumber}
            </span>
            <span>·</span>
            <span className="font-mono-num">
              {diagram.nodes.length} عنصر / {diagram.edges.length} تدفق
            </span>
          </div>
          <h2 className="mt-0.5 truncate font-display text-base font-bold text-slate-900">
            {diagram.title}
          </h2>
        </div>

        {/* Single Diagram Download Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {hasEdits && (
            <button
              type="button"
              onClick={onResetDiagram}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              title="استعادة النصوص الأصلية لهذا المخطط"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>استعادة</span>
            </button>
          )}
          <button
            type="button"
            onClick={onDownloadSvg}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-[#1D3C78] hover:text-[#1D3C78]"
          >
            <FileCode2 className="h-3.5 w-3.5" />
            <span>تنزيل SVG</span>
          </button>
          <button
            type="button"
            onClick={() => void onDownloadPng()}
            disabled={isExportingSingle}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-[#1D3C78] hover:text-[#1D3C78] disabled:opacity-60"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>PNG</span>
          </button>
          <button
            type="button"
            onClick={handlePrintA4}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-[#1D3C78] hover:text-[#1D3C78]"
            title="طباعة مباشرة على ورقة A4 أفقية بحجم واضح"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>طباعة A4</span>
          </button>
          <button
            type="button"
            onClick={() => void onDownloadDocx()}
            disabled={isExportingSingle}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-[#1D3C78] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#162F5E] disabled:opacity-60"
          >
            {isExportingSingle ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            <span>تنزيل وورد (DOCX)</span>
          </button>
        </div>
      </div>

      {/* Drafting Toolbar (Zoom, Theme, Legend, Grid, Fullscreen) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-5 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="ml-1 text-slate-500">النمط:</span>
          {THEME_LIST.map((t) => {
            const active = t.id === theme.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onThemeChange(t.id)}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  active
                    ? 'bg-[#1D3C78] text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t.name}
              </button>
            );
          })}

          <span className="mx-2 h-4 w-px bg-slate-200" />

          <label className="inline-flex cursor-pointer items-center gap-1.5 text-slate-600 select-none">
            <input
              type="checkbox"
              checked={includeLegend}
              onChange={onToggleLegend}
              className="h-3.5 w-3.5 rounded border-slate-300 text-[#1D3C78] focus:ring-[#1D3C78]"
            />
            <span>مفتاح الرموز</span>
          </label>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="hidden text-slate-500 xl:inline">
            انقر على أي مربع أو سهم لتعديل نصه مباشرة
          </span>
          <span className="mx-1.5 hidden h-4 w-px bg-slate-200 xl:inline-block" />

          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.3, Number((z - 0.1).toFixed(2))))}
            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
            title="تصغير"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono-num w-11 text-center font-medium text-slate-700">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
            title="تكبير"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={fitToViewport}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700 hover:bg-slate-100"
          >
            ملاءمة
          </button>
          <button
            type="button"
            onClick={() => setShowGrid((g) => !g)}
            className={`rounded-md border p-1.5 transition-colors ${
              showGrid
                ? 'border-[#1D3C78]/40 bg-[#1D3C78]/5 text-[#1D3C78]'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
            }`}
            title="إظهار/إخفاء شبكة الرسم"
          >
            <Grid3X3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
            title={isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Interactive SVG Viewport */}
      <div
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleSvgClick}
        className={`relative flex-1 overflow-hidden select-none ${
          showGrid ? 'canvas-grid-bg' : 'bg-slate-100'
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 120ms ease-out',
          }}
        >
          <div
            className="rounded-lg bg-white shadow-sm ring-1 ring-slate-200/90"
            // SVG is generated deterministically from our internal DiagramSpec with XML escaping
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        </div>
      </div>
    </div>
  );
};
