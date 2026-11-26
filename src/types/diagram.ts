export type DiagramCategory = 'context' | 'level0' | 'level1' | 'level2' | 'erd';

export type NodeType =
  | 'process'
  | 'entity'
  | 'datastore'
  | 'erd_entity'
  | 'erd_relation'
  | 'erd_chen_entity'
  | 'erd_chen_relation'
  | 'erd_attr';

export interface ErdAttribute {
  name: string;
  key?: 'PK' | 'FK';
}

export interface DiagramNode {
  id: string;
  type: NodeType;
  code?: string;
  label: string;
  attributes?: ErdAttribute[];
  rotation?: number;
  isPk?: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  waypoints: [number, number][];
  labelPos: [number, number];
  labelWidth?: number;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  thinAttrArrow?: boolean;
  dashed?: boolean;
  cardinalityStart?: string;
  cardinalityEnd?: string;
  cardinalityStartPos?: [number, number];
  cardinalityEndPos?: [number, number];
  boxedCardinality?: boolean;
}

export interface DiagramSpec {
  id: string;
  figureNumber: string;
  sectionNumber: string;
  category: DiagramCategory;
  categoryLabel: string;
  title: string;
  subtitle: string;
  description: string;
  urIds: string[];
  frIds: string[];
  width: number;
  height: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export type DiagramThemeId = 'academic-navy' | 'classic-bw' | 'emerald-slate';

export interface DiagramTheme {
  id: DiagramThemeId;
  name: string;
  description: string;
  canvasBg: string;
  frameBorder: string;
  titleColor: string;
  subtitleColor: string;
  processHeaderFill: string;
  processHeaderText: string;
  processBodyFill: string;
  processBodyText: string;
  processBorder: string;
  entityFill: string;
  entityBorder: string;
  entityText: string;
  datastoreCodeFill: string;
  datastoreCodeText: string;
  datastoreBodyFill: string;
  datastoreBodyText: string;
  datastoreBorder: string;
  erdHeaderFill: string;
  erdHeaderText: string;
  erdBodyFill: string;
  erdBodyText: string;
  erdBorder: string;
  erdPkColor: string;
  erdFkColor: string;
  erdRelationFill: string;
  erdRelationBorder: string;
  erdRelationText: string;
  edgeStroke: string;
  edgeLabelBg: string;
  edgeLabelBorder: string;
  edgeLabelText: string;
  captionColor: string;
}

export type WordExportMode = 'editable-shapes' | 'high-res-image' | 'combined';

export interface WordExportOptions {
  mode: WordExportMode;
  themeId: DiagramThemeId;
  includeTables: boolean;
  includeAcademicProse: boolean;
  includeLegend: boolean;
  selectedDiagramIds: string[];
}
