import React, { useState } from 'react';
import {
  Check,
  Download,
  FileArchive,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import type {
  DiagramSpec,
  DiagramThemeId,
  WordExportMode,
  WordExportOptions,
} from '../types/diagram';
import { THEME_LIST } from '../data/themes';

interface ExportAllModalProps {
  open: boolean;
  onClose: () => void;
  diagrams: DiagramSpec[];
  currentThemeId: DiagramThemeId;
  includeLegend: boolean;
  onExportWord: (options: WordExportOptions) => Promise<void>;
  onExportAllSvgsZip: (selectedIds: string[], themeId: DiagramThemeId) => Promise<void>;
}

const WORD_MODES: {
  id: WordExportMode;
  title: string;
  desc: string;
}[] = [
  {
    id: 'editable-shapes',
    title: 'أشكال وأسهم وورد أصلية قابلة للتعديل (موصى به)',
    desc: 'يبني كل مربع وسهم ورأس سهم وشكل بيضاوي داخل Word بأشكال DrawingML الأصلية، قابلة للنقر وتعديل النص والتحريك وفك التجميع بحرية تامة في Microsoft Word.',
  },
  {
    id: 'combined',
    title: 'النسخة الشاملة (أشكال قابلة للتعديل + نسخة طباعة عالية الدقة)',
    desc: 'تضم كل مخطط بصيغتين: أشكال Word قابلة للتعديل المباشر + صورة فائقة الدقة جاهزة للطباعة النهائية.',
  },
  {
    id: 'high-res-image',
    title: 'نسخة طباعة عالية الدقة + نصوص وجداول وورد قابلة للتعديل',
    desc: 'تدرج المخططات كصور فائقة الوضوح (300 DPI) مع العناوين والشرح الأكاديمي وجداول تدفق البيانات القابلة للتعديل.',
  },
];

export const ExportAllModal: React.FC<ExportAllModalProps> = ({
  open,
  onClose,
  diagrams,
  currentThemeId,
  includeLegend,
  onExportWord,
  onExportAllSvgsZip,
}) => {
  const [mode, setMode] = useState<WordExportMode>('editable-shapes');
  const [themeId, setThemeId] = useState<DiagramThemeId>(currentThemeId);
  const [includeTables, setIncludeTables] = useState(true);
  const [includeAcademicProse, setIncludeAcademicProse] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    diagrams.map((d) => d.id)
  );
  const [busyAction, setBusyAction] = useState<'word' | 'zip' | null>(null);

  if (!open) return null;

  const toggleId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(diagrams.map((d) => d.id));
  const clearAll = () => setSelectedIds([]);

  const handleWordSubmit = async () => {
    if (selectedIds.length === 0) return;
    setBusyAction('word');
    try {
      await onExportWord({
        mode,
        themeId,
        includeTables,
        includeAcademicProse,
        includeLegend,
        selectedDiagramIds: selectedIds,
      });
      onClose();
    } finally {
      setBusyAction(null);
    }
  };

  const handleZipSubmit = async () => {
    if (selectedIds.length === 0) return;
    setBusyAction('zip');
    try {
      await onExportAllSvgsZip(selectedIds, themeId);
      onClose();
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              تصدير حزمة مخططات الفصل الثالث الكاملة
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              تنزيل ملف وورد (.docx) منسق أكاديمياً بترقيم الأشكال وجداول التدفقات أو حزمة ملفات SVG
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Word Export Mode */}
          <div>
            <h3 className="mb-2.5 font-display text-sm font-bold text-slate-800">
              1. طريقة تضمين المخططات داخل ملف وورد (DOCX)
            </h3>
            <div className="space-y-2">
              {WORD_MODES.map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`flex w-full items-start gap-3 rounded-lg border p-3.5 text-right transition-colors ${
                      active
                        ? 'border-[#1D3C78] bg-[#1D3C78]/5'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        active
                          ? 'border-[#1D3C78] bg-[#1D3C78] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {active && <Check className="h-2.5 w-2.5" />}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {m.title}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                        {m.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme & Academic Sections */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-display text-sm font-bold text-slate-800">
                2. نمط الألوان والطباعة
              </h3>
              <div className="space-y-1.5">
                {THEME_LIST.map((t) => (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-xs transition-colors ${
                      themeId === t.id
                        ? 'border-[#1D3C78] bg-[#1D3C78]/5 font-semibold text-[#1D3C78]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="export-theme"
                        checked={themeId === t.id}
                        onChange={() => setThemeId(t.id)}
                        className="text-[#1D3C78] focus:ring-[#1D3C78]"
                      />
                      <span>{t.name}</span>
                    </span>
                    <span
                      className="h-3.5 w-3.5 rounded-sm border border-slate-300"
                      style={{ backgroundColor: t.processHeaderFill }}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-display text-sm font-bold text-slate-800">
                3. المحتوى الأكاديمي المرافق
              </h3>
              <div className="space-y-2.5 rounded-lg border border-slate-200 p-3 text-xs text-slate-700">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={includeAcademicProse}
                    onChange={(e) => setIncludeAcademicProse(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#1D3C78]"
                  />
                  <span>
                    تضمين مقدمة القسم (3.4) وفهرس الأشكال والوصف الأكاديمي لكل مخطط
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={includeTables}
                    onChange={(e) => setIncludeTables(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#1D3C78]"
                  />
                  <span>
                    تضمين جدول مخازن البيانات وجداول تفصيل التدفقات والمتطلبات (FR/UR)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Diagram Selection Checklist */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-slate-800">
                4. المخططات المضمّنة ({selectedIds.length} من {diagrams.length})
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="font-semibold text-[#1D3C78] hover:underline"
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-slate-500 hover:underline"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>
            <div className="grid max-h-52 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2.5 sm:grid-cols-2">
              {diagrams.map((d) => {
                const checked = selectedIds.includes(d.id);
                return (
                  <label
                    key={d.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                      checked ? 'bg-slate-50 text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleId(d.id)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#1D3C78]"
                    />
                    <span className="min-w-0 leading-snug">
                      <span className="font-mono-num ml-1 font-semibold text-[#1D3C78]">
                        {d.figureNumber}
                      </span>
                      <span>{d.title}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            disabled={selectedIds.length === 0 || busyAction !== null}
            onClick={() => void handleZipSubmit()}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-[#1D3C78] hover:text-[#1D3C78] disabled:opacity-50"
          >
            {busyAction === 'zip' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileArchive className="h-4 w-4" />
            )}
            <span>تنزيل المحدد بصيغة SVG (ملف ZIP)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/70"
            >
              إغلاق
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0 || busyAction !== null}
              onClick={() => void handleWordSubmit()}
              className="inline-flex items-center gap-2 rounded-md bg-[#1D3C78] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#162F5E] disabled:opacity-50"
            >
              {busyAction === 'word' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span>
                <Download className="ml-1 inline h-3.5 w-3.5" />
                توليد وتنزيل ملف وورد قابل للتعديل ({selectedIds.length})
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
