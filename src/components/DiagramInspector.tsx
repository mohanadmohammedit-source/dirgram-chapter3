import React, { useState } from 'react';
import { ArrowLeftRight, CheckSquare, Edit3, Layers } from 'lucide-react';
import type { DiagramSpec } from '../types/diagram';
import { FR_CATALOG, UR_CATALOG } from '../data/diagrams';

interface DiagramInspectorProps {
  diagram: DiagramSpec;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
  onUpdateDiagramTitle: (title: string, subtitle: string) => void;
  onUpdateNode: (nodeId: string, patch: { label?: string; code?: string }) => void;
  onUpdateEdge: (edgeId: string, label: string) => void;
}

type InspectorTab = 'edit' | 'flows' | 'requirements';

const NODE_TYPE_LABELS: Record<string, string> = {
  process: 'عملية (Process)',
  entity: 'جهة خارجية (Entity)',
  datastore: 'مخزن بيانات (Data Store)',
  erd_entity: 'كينونة (Entity)',
  erd_relation: 'علاقة (Relationship)',
  erd_chen_entity: 'كينونة (Entity)',
  erd_chen_relation: 'علاقة معينية (Relationship)',
  erd_attr: 'صفة بيضاوية (Attribute)',
};

export const DiagramInspector: React.FC<DiagramInspectorProps> = ({
  diagram,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onUpdateDiagramTitle,
  onUpdateNode,
  onUpdateEdge,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('edit');

  const selectedNode = diagram.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedEdge = diagram.edges.find((e) => e.id === selectedEdgeId) ?? null;
  const nodeMap = new Map(diagram.nodes.map((n) => [n.id, n]));

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white lg:w-[340px] lg:shrink-0">
      {/* Tab Navigation */}
      <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/70 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`flex items-center justify-center gap-1.5 border-b-2 py-2.5 transition-colors ${
            activeTab === 'edit'
              ? 'border-[#1D3C78] bg-white text-[#1D3C78]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>التحرير</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('flows')}
          className={`flex items-center justify-center gap-1.5 border-b-2 py-2.5 transition-colors ${
            activeTab === 'flows'
              ? 'border-[#1D3C78] bg-white text-[#1D3C78]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span>التدفقات</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('requirements')}
          className={`flex items-center justify-center gap-1.5 border-b-2 py-2.5 transition-colors ${
            activeTab === 'requirements'
              ? 'border-[#1D3C78] bg-white text-[#1D3C78]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          <span>المتطلبات</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'edit' && (
          <div className="space-y-5">
            {/* Selected Node or Edge Editor */}
            {selectedNode ? (
              <div className="space-y-3 border-b border-slate-200 pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-[#1D3C78]">
                    تعديل العنصر المحدد
                  </h3>
                  <span className="text-xs text-slate-500">
                    {NODE_TYPE_LABELS[selectedNode.type] ?? selectedNode.type}
                  </span>
                </div>

                {selectedNode.code !== undefined && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      الرقم / الرمز
                    </label>
                    <input
                      type="text"
                      value={selectedNode.code}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, { code: e.target.value })
                      }
                      className="font-mono-num w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-[#1D3C78] focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    النص المعروض (استخدم Enter لسطر جديد)
                  </label>
                  <textarea
                    rows={3}
                    value={selectedNode.label}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, { label: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm leading-relaxed text-slate-900 focus:border-[#1D3C78] focus:outline-none"
                  />
                </div>
              </div>
            ) : selectedEdge ? (
              <div className="space-y-3 border-b border-slate-200 pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-[#1D3C78]">
                    تعديل تسمية السهم
                  </h3>
                  <span className="font-mono-num text-xs text-slate-500">
                    {selectedEdge.id}
                  </span>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    نص تدفق البيانات
                  </label>
                  <textarea
                    rows={2}
                    value={selectedEdge.label}
                    onChange={(e) => onUpdateEdge(selectedEdge.id, e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm leading-relaxed text-slate-900 focus:border-[#1D3C78] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="border-b border-slate-200 pb-4 text-xs leading-relaxed text-slate-600">
                انقر على أي مربع (عملية / جهة / مخزن) أو أي سهم داخل المخطط لتعديل نصه أو ترقيمه فوراً قبل التصدير إلى SVG أو وورد.
              </div>
            )}

            {/* Diagram Title & Caption Editor */}
            <div className="space-y-3 border-b border-slate-200 pb-4">
              <h3 className="font-display text-xs font-bold text-slate-800">
                عنوان الشكل والتعليق الأكاديمي
              </h3>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  عنوان المخطط ({diagram.figureNumber})
                </label>
                <input
                  type="text"
                  value={diagram.title}
                  onChange={(e) =>
                    onUpdateDiagramTitle(e.target.value, diagram.subtitle)
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#1D3C78] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  العنوان الفرعي
                </label>
                <input
                  type="text"
                  value={diagram.subtitle}
                  onChange={(e) =>
                    onUpdateDiagramTitle(diagram.title, e.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#1D3C78] focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Elements Directory */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 font-display text-xs font-bold text-slate-800">
                  <Layers className="h-3.5 w-3.5 text-slate-500" />
                  <span>عناصر المخطط ({diagram.nodes.length})</span>
                </h3>
              </div>
              <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {diagram.nodes.map((node) => {
                  const isSel = node.id === selectedNodeId;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => {
                        onSelectEdge(null);
                        onSelectNode(node.id);
                      }}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-right text-xs transition-colors ${
                        isSel
                          ? 'bg-[#1D3C78]/8 font-semibold text-[#1D3C78]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">
                        {node.label.replace(/\n/g, ' ')}
                      </span>
                      <span className="font-mono-num shrink-0 text-[11px] text-slate-500">
                        {node.code || (node.type === 'erd_relation' ? 'علاقة' : '')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'flows' && (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-slate-600">
              قائمة جميع تدفقات البيانات والروابط المرسومة في {diagram.figureNumber} (انقر على أي صف لتحديده وتعديله):
            </p>
            <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {diagram.edges.map((edge, idx) => {
                const fromN = nodeMap.get(edge.from);
                const toN = nodeMap.get(edge.to);
                const isSel = edge.id === selectedEdgeId;
                return (
                  <button
                    key={edge.id}
                    type="button"
                    onClick={() => {
                      onSelectNode(null);
                      onSelectEdge(edge.id);
                      setActiveTab('edit');
                    }}
                    className={`block w-full px-3 py-2.5 text-right transition-colors ${
                      isSel ? 'bg-[#1D3C78]/8' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span className="truncate">
                        {fromN?.code ?? fromN?.label.split('\n')[0]} ←{' '}
                        {toN?.code ?? toN?.label.split('\n')[0]}
                      </span>
                      <span className="font-mono-num shrink-0">#{idx + 1}</span>
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-800">
                      {edge.label
                        ? edge.label.replace(/\n/g, ' ')
                        : `علاقة (${edge.cardinalityStart ?? ''}${edge.cardinalityEnd ? `:${edge.cardinalityEnd}` : ''})`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'requirements' && (
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="font-display text-xs font-bold text-slate-800">
                الوصف الأكاديمي للفصل الثالث
              </h3>
              <p className="mt-1.5 text-xs leading-6 text-slate-600">
                {diagram.description}
              </p>
            </div>

            <div className="border-b border-slate-200 pb-3">
              <h3 className="font-display text-xs font-bold text-slate-800">
                متطلبات المستخدم المغطاة (UR)
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                {diagram.urIds.map((ur) => (
                  <li key={ur} className="flex items-start gap-2">
                    <span className="font-mono-num shrink-0 font-semibold text-[#1D3C78]">
                      {ur}
                    </span>
                    <span>{UR_CATALOG[ur] ?? ''}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-display text-xs font-bold text-slate-800">
                المتطلبات الوظيفية المرتبطة (FR)
              </h3>
              <ul className="mt-2 space-y-2 text-xs text-slate-700">
                {diagram.frIds.map((fr) => (
                  <li
                    key={fr}
                    className="flex items-start gap-2 border-b border-slate-100 pb-1.5 last:border-none"
                  >
                    <span className="font-mono-num shrink-0 font-semibold text-[#1D3C78]">
                      {fr}
                    </span>
                    <span className="leading-relaxed">{FR_CATALOG[fr] ?? ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
