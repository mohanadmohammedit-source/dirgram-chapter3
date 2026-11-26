import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileCode2,
  FileText,
  Menu,
  Search,
  X,
} from 'lucide-react';
import type {
  DiagramCategory,
  DiagramSpec,
  DiagramThemeId,
  WordExportMode,
  WordExportOptions,
} from './types/diagram';
import { ALL_DIAGRAMS } from './data/diagrams';
import { DIAGRAM_THEMES } from './data/themes';
import {
  downloadAllSvgsAsZip,
  downloadDiagramAsPng,
  downloadDiagramAsSvg,
} from './utils/svgRenderer';
import {
  exportAllDiagramsToDocx,
  exportSingleDiagramToDocx,
} from './utils/docxExporter';
import { DiagramCanvas } from './components/DiagramCanvas';
import { DiagramInspector } from './components/DiagramInspector';
import { ExportAllModal } from './components/ExportAllModal';

type CategoryFilter = 'all' | DiagramCategory;

const NAV_TABS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'الكل (17)' },
  { id: 'context', label: 'البيئي' },
  { id: 'level0', label: 'الصفري' },
  { id: 'level1', label: 'المستوى الأول' },
  { id: 'level2', label: 'المستوى الثاني' },
  { id: 'erd', label: 'مخطط ERD' },
];

function cloneDiagrams(list: DiagramSpec[]): DiagramSpec[] {
  return list.map((d) => ({
    ...d,
    urIds: [...d.urIds],
    frIds: [...d.frIds],
    nodes: d.nodes.map((n) => ({
      ...n,
      attributes: n.attributes ? n.attributes.map((a) => ({ ...a })) : undefined,
    })),
    edges: d.edges.map((e) => ({
      ...e,
      waypoints: e.waypoints.map((pt) => [pt[0], pt[1]] as [number, number]),
      labelPos: [e.labelPos[0], e.labelPos[1]] as [number, number],
      cardinalityStartPos: e.cardinalityStartPos
        ? ([e.cardinalityStartPos[0], e.cardinalityStartPos[1]] as [number, number])
        : undefined,
      cardinalityEndPos: e.cardinalityEndPos
        ? ([e.cardinalityEndPos[0], e.cardinalityEndPos[1]] as [number, number])
        : undefined,
    })),
  }));
}

export default function App() {
  const [diagrams, setDiagrams] = useState<DiagramSpec[]>(() =>
    cloneDiagrams(ALL_DIAGRAMS)
  );
  const [editedIds, setEditedIds] = useState<Set<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string>('erd-system');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [themeId, setThemeId] = useState<DiagramThemeId>('academic-navy');
  const [includeLegend, setIncludeLegend] = useState(true);
  const [singleWordMode] = useState<WordExportMode>('editable-shapes');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isExportingSingle, setIsExportingSingle] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const theme = DIAGRAM_THEMES[themeId];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3400);
  };

  const filteredDiagrams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return diagrams.filter((d) => {
      if (categoryFilter !== 'all' && d.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.figureNumber.toLowerCase().includes(q) ||
        d.subtitle.toLowerCase().includes(q) ||
        d.frIds.some((fr) => fr.toLowerCase().includes(q))
      );
    });
  }, [diagrams, categoryFilter, searchQuery]);

  const activeDiagram =
    diagrams.find((d) => d.id === activeId) ?? diagrams[0];

  const handleSelectDiagram = (id: string) => {
    setActiveId(id);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setMobileMenuOpen(false);
  };

  const handleCategoryChange = (cat: CategoryFilter) => {
    setCategoryFilter(cat);
    if (cat !== 'all') {
      const firstMatch = diagrams.find((d) => d.category === cat);
      if (firstMatch) {
        setActiveId(firstMatch.id);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      }
    }
  };

  const markEdited = (id: string) => {
    setEditedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleUpdateNode = (
    nodeId: string,
    patch: { label?: string; code?: string }
  ) => {
    setDiagrams((prev) =>
      prev.map((d) => {
        if (d.id !== activeDiagram.id) return d;
        return {
          ...d,
          nodes: d.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
        };
      })
    );
    markEdited(activeDiagram.id);
  };

  const handleUpdateEdge = (edgeId: string, label: string) => {
    setDiagrams((prev) =>
      prev.map((d) => {
        if (d.id !== activeDiagram.id) return d;
        return {
          ...d,
          edges: d.edges.map((e) => (e.id === edgeId ? { ...e, label } : e)),
        };
      })
    );
    markEdited(activeDiagram.id);
  };

  const handleUpdateDiagramTitle = (title: string, subtitle: string) => {
    setDiagrams((prev) =>
      prev.map((d) =>
        d.id === activeDiagram.id ? { ...d, title, subtitle } : d
      )
    );
    markEdited(activeDiagram.id);
  };

  const handleResetActiveDiagram = () => {
    const original = ALL_DIAGRAMS.find((d) => d.id === activeDiagram.id);
    if (!original) return;
    const restored = cloneDiagrams([original])[0];
    setDiagrams((prev) =>
      prev.map((d) => (d.id === activeDiagram.id ? restored : d))
    );
    setEditedIds((prev) => {
      const next = new Set(prev);
      next.delete(activeDiagram.id);
      return next;
    });
    showToast(`تمت استعادة النصوص الأصلية لـ ${original.figureNumber}`);
  };

  const handleDownloadSingleSvg = () => {
    downloadDiagramAsSvg(activeDiagram, theme, includeLegend);
    showToast(`تم تنزيل ${activeDiagram.figureNumber} بصيغة SVG`);
  };

  const handleDownloadSinglePng = async () => {
    setIsExportingSingle(true);
    try {
      await downloadDiagramAsPng(activeDiagram, theme, includeLegend);
      showToast(`تم تنزيل ${activeDiagram.figureNumber} بصيغة PNG عالية الدقة`);
    } finally {
      setIsExportingSingle(false);
    }
  };

  const handleDownloadSingleDocx = async () => {
    setIsExportingSingle(true);
    try {
      await exportSingleDiagramToDocx(activeDiagram, theme, {
        mode: singleWordMode,
        themeId,
        includeTables: true,
        includeAcademicProse: true,
        includeLegend,
      });
      showToast(`تم تنزيل ${activeDiagram.figureNumber} كملف وورد قابل للتعديل`);
    } finally {
      setIsExportingSingle(false);
    }
  };

  const handleExportAllWord = async (options: WordExportOptions) => {
    const targetTheme = DIAGRAM_THEMES[options.themeId];
    const targetList = diagrams.filter((d) =>
      options.selectedDiagramIds.includes(d.id)
    );
    await exportAllDiagramsToDocx(targetList, targetTheme, {
      mode: options.mode,
      themeId: options.themeId,
      includeTables: options.includeTables,
      includeAcademicProse: options.includeAcademicProse,
      includeLegend: options.includeLegend,
    });
    showToast(
      `تم توليد وتنزيل ملف الوورد الشامل (${targetList.length} مخططاً قابلاً للتعديل)`
    );
  };

  const handleExportAllSvgsZip = async (
    selectedIds: string[],
    zipThemeId: DiagramThemeId
  ) => {
    const targetTheme = DIAGRAM_THEMES[zipThemeId];
    const targetList = diagrams.filter((d) => selectedIds.includes(d.id));
    await downloadAllSvgsAsZip(targetList, targetTheme, includeLegend);
    showToast(`تم تنزيل حزمة ${targetList.length} مخططاً بصيغة SVG`);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F6F8FB] text-slate-900">
      {/* Top Bar — Strict 3-Zone Contract */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="rounded-md border border-slate-200 p-1.5 text-slate-700 lg:hidden"
            aria-label="قائمة المخططات"
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#1D3C78] font-mono-num text-xs font-bold text-white">
              3.4
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-sm font-extrabold text-slate-900">
                مخططات الفصل الثالث — منصة جدولة فيسبوك
              </h1>
            </div>
          </div>
        </div>

        {/* Zone 2: Concise Category Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_TABS.map((tab) => {
            const active = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleCategoryChange(tab.id)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-[#1D3C78]/10 text-[#1D3C78]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary CTA */}
        <button
          type="button"
          onClick={() => setExportModalOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-[#1D3C78] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#162F5E]"
        >
          <Download className="h-3.5 w-3.5" />
          <span>تحميل الكل (وورد / SVG)</span>
        </button>
      </header>

      {/* Main 3-Pane Academic Workbench */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Right Sidebar: Diagram Directory (280px) */}
        <aside
          className={`${
            mobileMenuOpen
              ? 'absolute inset-y-0 right-0 z-40 flex shadow-xl'
              : 'hidden'
          } h-full w-[290px] shrink-0 flex-col border-l border-slate-200 bg-white lg:static lg:flex lg:shadow-none`}
        >
          {/* Search Input */}
          <div className="border-b border-slate-200 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث برقم الشكل أو المتطلب FR..."
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pr-8 pl-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#1D3C78] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Diagram List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredDiagrams.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                لا توجد مخططات مطابقة لبحثك.
              </div>
            ) : (
              filteredDiagrams.map((d) => {
                const isActive = d.id === activeDiagram.id;
                const isEdited = editedIds.has(d.id);
                return (
                  <div
                    key={d.id}
                    className={`group transition-colors ${
                      isActive ? 'bg-[#1D3C78]/7' : 'hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectDiagram(d.id)}
                      className="block w-full px-3.5 py-2.5 text-right"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span
                          className={`font-mono-num font-bold ${
                            isActive ? 'text-[#1D3C78]' : 'text-slate-600'
                          }`}
                        >
                          {d.figureNumber}
                        </span>
                        <span className="text-slate-400">
                          {d.categoryLabel}
                          {isEdited ? ' · معدّل' : ''}
                        </span>
                      </div>
                      <div
                        className={`mt-1 line-clamp-2 text-xs leading-snug ${
                          isActive
                            ? 'font-bold text-[#1D3C78]'
                            : 'font-medium text-slate-800'
                        }`}
                      >
                        {d.title}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-mono-num truncate">
                          {d.urIds.join(' · ')}
                        </span>
                        <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadDiagramAsSvg(d, theme, includeLegend);
                              showToast(`تم تنزيل ${d.figureNumber} بصيغة SVG`);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                downloadDiagramAsSvg(d, theme, includeLegend);
                              }
                            }}
                            className="rounded p-1 text-slate-600 hover:bg-slate-200/70 hover:text-[#1D3C78]"
                            title="تنزيل SVG سريع"
                          >
                            <FileCode2 className="h-3.5 w-3.5" />
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              void exportSingleDiagramToDocx(d, theme, {
                                mode: singleWordMode,
                                themeId,
                                includeTables: true,
                                includeAcademicProse: true,
                                includeLegend,
                              }).then(() =>
                                showToast(
                                  `تم تنزيل ${d.figureNumber} كملف وورد قابل للتعديل`
                                )
                              );
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                void exportSingleDiagramToDocx(d, theme, {
                                  mode: singleWordMode,
                                  themeId,
                                  includeTables: true,
                                  includeAcademicProse: true,
                                  includeLegend,
                                });
                              }
                            }}
                            className="rounded p-1 text-slate-600 hover:bg-slate-200/70 hover:text-[#1D3C78]"
                            title="تنزيل وورد قابل للتعديل"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </span>
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer Summary */}
          <div className="border-t border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[11px] text-slate-600">
            <div className="flex items-center justify-between">
              <span>إجمالي المخططات</span>
              <span className="font-mono-num font-bold text-slate-800">
                17 شكلاً (3.1 – 3.17)
              </span>
            </div>
            <div className="mt-0.5 flex items-center justify-between">
              <span>تغطية المتطلبات</span>
              <span className="font-mono-num font-semibold text-[#1D3C78]">
                UR-01..07 · FR-01..37
              </span>
            </div>
          </div>
        </aside>

        {/* Center Main Canvas */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DiagramCanvas
            diagram={activeDiagram}
            theme={theme}
            onThemeChange={setThemeId}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onSelectNode={setSelectedNodeId}
            onSelectEdge={setSelectedEdgeId}
            includeLegend={includeLegend}
            onToggleLegend={() => setIncludeLegend((v) => !v)}
            onDownloadSvg={handleDownloadSingleSvg}
            onDownloadPng={handleDownloadSinglePng}
            onDownloadDocx={handleDownloadSingleDocx}
            isExportingSingle={isExportingSingle}
            hasEdits={editedIds.has(activeDiagram.id)}
            onResetDiagram={handleResetActiveDiagram}
          />
        </main>

        {/* Left Inspector Panel (Desktop) */}
        <div className="hidden lg:flex">
          <DiagramInspector
            diagram={activeDiagram}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onSelectNode={setSelectedNodeId}
            onSelectEdge={setSelectedEdgeId}
            onUpdateDiagramTitle={handleUpdateDiagramTitle}
            onUpdateNode={handleUpdateNode}
            onUpdateEdge={handleUpdateEdge}
          />
        </div>
      </div>

      {/* Bulk Export Modal */}
      <ExportAllModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        diagrams={diagrams}
        currentThemeId={themeId}
        includeLegend={includeLegend}
        onExportWord={handleExportAllWord}
        onExportAllSvgsZip={handleExportAllSvgsZip}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
