import type { DiagramEdge, DiagramNode, DiagramSpec } from '../../types/diagram';

// ============================================================================
// Classic Chen ERD (EXACT style of reference graduation thesis: rectangles,
// radial fanned oval attributes with thin arrows & underlined PKs, vertical
// diamonds for relationships, and boxed [1]/[M] cardinality badges)
// Engineered strictly for A4 Landscape printing (1684 x 1190 = 297mm x 210mm)
// with crystal-clear font sizes and ZERO overlapping ovals or crossing lines!
// ============================================================================

interface FanAttrDef {
  label: string;
  isPk?: boolean;
}

interface FanSpec {
  entityId: string;
  entityLabel: string;
  cx: number;
  cy: number;
  w?: number;
  h?: number;
  direction: 'up' | 'down';
  radiusX?: number;
  radiusY?: number;
  angleSpreadDeg?: number;
  ovalW?: number;
  ovalH?: number;
  attrs: FanAttrDef[];
}

/**
 * Generates an entity rectangle + evenly fanned radial attribute ovals
 * with exact perimeter-to-perimeter arrow geometry (zero overlap!).
 */
function buildChenEntityFan(spec: FanSpec): {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
} {
  const {
    entityId,
    entityLabel,
    cx,
    cy,
    w = 148,
    h = 54,
    direction,
    radiusX = 142,
    radiusY = 178,
    angleSpreadDeg = 104,
    ovalW = 108,
    ovalH = 34,
    attrs,
  } = spec;

  const nodes: DiagramNode[] = [
    {
      id: entityId,
      type: 'erd_chen_entity',
      label: entityLabel,
      x: Math.round(cx - w / 2),
      y: Math.round(cy - h / 2),
      w,
      h,
    },
  ];

  const edges: DiagramEdge[] = [];
  const count = attrs.length;
  const baseAngleDeg = direction === 'up' ? -90 : 90;
  const startDeg = baseAngleDeg - angleSpreadDeg / 2;
  const stepDeg = count > 1 ? angleSpreadDeg / (count - 1) : 0;

  attrs.forEach((attr, idx) => {
    const thetaDeg = startDeg + idx * stepDeg;
    const thetaRad = (thetaDeg * Math.PI) / 180;

    // Oval center along elliptical arc from entity center
    const ox = cx + radiusX * Math.cos(thetaRad);
    const oy = cy + radiusY * Math.sin(thetaRad);

    // Compute readable radial rotation along the ray (always right-side up: -85..+85 deg)
    let rotDeg = thetaDeg;
    if (rotDeg > 90) rotDeg -= 180;
    if (rotDeg < -90) rotDeg += 180;
    // Clamp slightly so vertical petals remain pleasantly readable
    if (rotDeg > 82) rotDeg = 82;
    if (rotDeg < -82) rotDeg = -82;

    const attrId = `${entityId}_attr_${idx + 1}`;
    nodes.push({
      id: attrId,
      type: 'erd_attr',
      label: attr.label,
      isPk: attr.isPk,
      rotation: Math.round(rotDeg),
      x: Math.round(ox - ovalW / 2),
      y: Math.round(oy - ovalH / 2),
      w: ovalW,
      h: ovalH,
    });

    // Anchor on entity top/bottom perimeter spread evenly across inner 74% of box width
    const t = count > 1 ? idx / (count - 1) : 0.5;
    const anchorSpread = direction === 'up' ? t : 1 - t;
    const startX = cx - w * 0.36 + anchorSpread * (w * 0.72);
    const startY = direction === 'up' ? cy - h / 2 : cy + h / 2;

    // Exact endpoint on the inner tip of the rotated oval (along ray toward entity)
    const dx = ox - startX;
    const dy = oy - startY;
    const dist = Math.hypot(dx, dy) || 1;
    // Oval semi-axis along ray direction is ovalW / 2 (since oval major axis aligns with ray!)
    const inset = ovalW / 2 + 2;
    const endX = ox - (dx / dist) * inset;
    const endY = oy - (dy / dist) * inset;

    edges.push({
      id: `edge_${attrId}`,
      from: entityId,
      to: attrId,
      label: '',
      waypoints: [
        [Math.round(startX), Math.round(startY)],
        [Math.round(endX), Math.round(endY)],
      ],
      labelPos: [Math.round((startX + endX) / 2), Math.round((startY + endY) / 2)],
      arrowEnd: true,
      thinAttrArrow: true,
    });
  });

  return { nodes, edges };
}

// Build all 9 platform entities in a crystal-clear 4-over-5 A4 Landscape planar grid!
// Canvas size: 1684 x 1140 (plus header/footer in SVG -> exact A4 Landscape 1684 x 1190 ratio!)
const ENTITY_FANS: FanSpec[] = [
  // ===== TOP ROW (y = 318): 4 entities fanning UPWARD into y = 45..265 =====
  {
    entityId: 'ENT_ROLE',
    entityLabel: 'الدور والصلاحية',
    cx: 1500,
    cy: 318,
    w: 146,
    h: 54,
    direction: 'up',
    radiusX: 118,
    radiusY: 168,
    angleSpreadDeg: 82,
    ovalW: 108,
    ovalH: 34,
    attrs: [
      { label: 'id الدور', isPk: true },
      { label: 'اسم الدور' },
      { label: 'الصلاحيات' },
      { label: 'تاريخ الإنشاء' },
    ],
  },
  {
    entityId: 'ENT_USER',
    entityLabel: 'المستخدم',
    cx: 1110,
    cy: 318,
    w: 142,
    h: 54,
    direction: 'up',
    radiusX: 168,
    radiusY: 178,
    angleSpreadDeg: 114,
    ovalW: 112,
    ovalH: 34,
    attrs: [
      { label: 'id المستخدم', isPk: true },
      { label: 'الاسم الكامل' },
      { label: 'البريد الإلكتروني' },
      { label: 'كلمة المرور' },
      { label: 'حالة الحساب' },
      { label: 'تاريخ التسجيل' },
    ],
  },
  {
    entityId: 'ENT_PAGE',
    entityLabel: 'صفحة فيسبوك',
    cx: 675,
    cy: 318,
    w: 148,
    h: 54,
    direction: 'up',
    radiusX: 168,
    radiusY: 178,
    angleSpreadDeg: 114,
    ovalW: 112,
    ovalH: 34,
    attrs: [
      { label: 'id الصفحة', isPk: true },
      { label: 'معرّف Meta' },
      { label: 'اسم الصفحة' },
      { label: 'رمز التفويض' },
      { label: 'حالة الربط' },
      { label: 'تاريخ الربط' },
    ],
  },
  {
    entityId: 'ENT_POST',
    entityLabel: 'المنشور التسويقي',
    cx: 235,
    cy: 318,
    w: 152,
    h: 54,
    direction: 'up',
    radiusX: 168,
    radiusY: 178,
    angleSpreadDeg: 114,
    ovalW: 112,
    ovalH: 34,
    attrs: [
      { label: 'id المنشور', isPk: true },
      { label: 'نص المنشور' },
      { label: 'الوسائط المرفقة' },
      { label: 'حالة المنشور' },
      { label: 'نوع المحتوى' },
      { label: 'تاريخ الإنشاء' },
    ],
  },

  // ===== BOTTOM ROW (y = 755): 5 entities fanning DOWNWARD into y = 830..1030 =====
  {
    entityId: 'ENT_ADMIN_LOG',
    entityLabel: 'السجل الإداري',
    cx: 1505,
    cy: 755,
    w: 146,
    h: 54,
    direction: 'down',
    radiusX: 112,
    radiusY: 176,
    angleSpreadDeg: 86,
    ovalW: 108,
    ovalH: 32,
    attrs: [
      { label: 'id السجل', isPk: true },
      { label: 'نوع العملية' },
      { label: 'معرّف المنفّذ' },
      { label: 'حالة الخدمات' },
      { label: 'تاريخ العملية' },
    ],
  },
  {
    entityId: 'ENT_PLAN',
    entityLabel: 'الخطة التسويقية',
    cx: 1170,
    cy: 755,
    w: 148,
    h: 54,
    direction: 'down',
    radiusX: 122,
    radiusY: 184,
    angleSpreadDeg: 92,
    ovalW: 108,
    ovalH: 32,
    attrs: [
      { label: 'id الخطة', isPk: true },
      { label: 'اسم الخطة' },
      { label: 'الأهداف' },
      { label: 'الجمهور' },
      { label: 'المحاور' },
      { label: 'وتيرة النشر' },
    ],
  },
  {
    entityId: 'ENT_AI_OUT',
    entityLabel: 'مخرج الذكاء',
    cx: 840,
    cy: 755,
    w: 142,
    h: 54,
    direction: 'down',
    radiusX: 122,
    radiusY: 184,
    angleSpreadDeg: 92,
    ovalW: 110,
    ovalH: 32,
    attrs: [
      { label: 'id المخرج', isPk: true },
      { label: 'النص المولّد' },
      { label: 'معايير التوليد' },
      { label: 'تصنيف المراجعة' },
      { label: 'ملاحظات المراجعة' },
      { label: 'حالة الاعتماد' },
    ],
  },
  {
    entityId: 'ENT_JOB',
    entityLabel: 'مهمة الجدولة',
    cx: 505,
    cy: 755,
    w: 142,
    h: 54,
    direction: 'down',
    radiusX: 116,
    radiusY: 180,
    angleSpreadDeg: 88,
    ovalW: 110,
    ovalH: 32,
    attrs: [
      { label: 'id المهمة', isPk: true },
      { label: 'موعد النشر' },
      { label: 'المنطقة الزمنية' },
      { label: 'معرّف Meta' },
      { label: 'حالة المحاولة' },
    ],
  },
  {
    entityId: 'ENT_METRIC',
    entityLabel: 'مؤشر الأداء',
    cx: 175,
    cy: 755,
    w: 142,
    h: 54,
    direction: 'down',
    radiusX: 122,
    radiusY: 184,
    angleSpreadDeg: 92,
    ovalW: 108,
    ovalH: 32,
    attrs: [
      { label: 'id المؤشر', isPk: true },
      { label: 'الوصول' },
      { label: 'مرات الظهور' },
      { label: 'إجمالي التفاعل' },
      { label: 'معدل التفاعل' },
      { label: 'وقت الجلب' },
    ],
  },
];

// Relationship Diamonds (tall elegant Chen diamonds, matching the reference image!)
const RELATION_NODES: DiagramNode[] = [
  // Top row horizontal diamonds (cy = 318)
  {
    id: 'REL_ROLE',
    type: 'erd_chen_relation',
    label: 'يُسند له',
    x: 1269,
    y: 274,
    w: 72,
    h: 88,
  },
  {
    id: 'REL_CONNECT',
    type: 'erd_chen_relation',
    label: 'يربط',
    x: 856,
    y: 274,
    w: 72,
    h: 88,
  },
  {
    id: 'REL_CONTAINS',
    type: 'erd_chen_relation',
    label: 'تضم',
    x: 418,
    y: 274,
    w: 72,
    h: 88,
  },

  // Middle corridor diamonds (ZERO crossing paths!)
  {
    id: 'REL_LOG',
    type: 'erd_chen_relation',
    label: 'ينفّذ',
    x: 1464,
    y: 492,
    w: 72,
    h: 88,
  },
  {
    id: 'REL_CREATE_PLAN',
    type: 'erd_chen_relation',
    label: 'يُعدّ',
    x: 1104,
    y: 492,
    w: 72,
    h: 88,
  },
  {
    id: 'REL_ORGANIZE',
    type: 'erd_chen_relation',
    label: 'تنظّم',
    x: 724,
    y: 432,
    w: 72,
    h: 88,
  },
  {
    id: 'REL_APPROVE',
    type: 'erd_chen_relation',
    label: 'يُعتمد كـ',
    x: 564,
    y: 556,
    w: 78,
    h: 88,
  },
  {
    id: 'REL_SCHEDULE',
    type: 'erd_chen_relation',
    label: 'يُجدول',
    x: 344,
    y: 530,
    w: 74,
    h: 88,
  },
  {
    id: 'REL_MEASURE',
    type: 'erd_chen_relation',
    label: 'يُقاس بـ',
    x: 142,
    y: 492,
    w: 76,
    h: 88,
  },

  // Bottom row horizontal diamonds (cy = 755)
  {
    id: 'REL_GENERATE',
    type: 'erd_chen_relation',
    label: 'تولّد',
    x: 969,
    y: 711,
    w: 72,
    h: 88,
  },
  {
    id: 'REL_RECORD',
    type: 'erd_chen_relation',
    label: 'توثّق',
    x: 304,
    y: 711,
    w: 72,
    h: 88,
  },
];

// Relationship Connector Lines with Boxed [1] / [M] Cardinalities
const RELATION_EDGES: DiagramEdge[] = [
  // 1. Role [1] --- REL_ROLE --- [M] User
  {
    id: 'erd-r1a',
    from: 'ENT_ROLE',
    to: 'REL_ROLE',
    label: '',
    waypoints: [
      [1427, 318],
      [1341, 318],
    ],
    labelPos: [1384, 318],
    arrowEnd: false,
    cardinalityStart: '1',
    cardinalityStartPos: [1392, 294],
    boxedCardinality: true,
  },
  {
    id: 'erd-r1b',
    from: 'REL_ROLE',
    to: 'ENT_USER',
    label: '',
    waypoints: [
      [1269, 318],
      [1181, 318],
    ],
    labelPos: [1225, 318],
    arrowEnd: false,
    cardinalityEnd: 'M',
    cardinalityEndPos: [1220, 294],
    boxedCardinality: true,
  },

  // 2. User [1] --- REL_CONNECT --- [M] FacebookPage
  {
    id: 'erd-r2a',
    from: 'ENT_USER',
    to: 'REL_CONNECT',
    label: '',
    waypoints: [
      [1039, 318],
      [928, 318],
    ],
    labelPos: [984, 318],
    arrowEnd: false,
    cardinalityStart: '1',
    cardinalityStartPos: [992, 294],
    boxedCardinality: true,
  },
  {
    id: 'erd-r2b',
    from: 'REL_CONNECT',
    to: 'ENT_PAGE',
    label: '',
    waypoints: [
      [856, 318],
      [749, 318],
    ],
    labelPos: [802, 318],
    arrowEnd: false,
    cardinalityEnd: 'M',
    cardinalityEndPos: [796, 294],
    boxedCardinality: true,
  },

  // 3. FacebookPage [1] --- REL_CONTAINS --- [M] Post
  {
    id: 'erd-r3a',
    from: 'ENT_PAGE',
    to: 'REL_CONTAINS',
    label: '',
    waypoints: [
      [601, 318],
      [490, 318],
    ],
    labelPos: [545, 318],
    arrowEnd: false,
    cardinalityStart: '1',
    cardinalityStartPos: [555, 294],
    boxedCardinality: true,
  },
  {
    id: 'erd-r3b',
    from: 'REL_CONTAINS',
    to: 'ENT_POST',
    label: '',
    waypoints: [
      [418, 318],
      [311, 318],
    ],
    labelPos: [365, 318],
    arrowEnd: false,
    cardinalityEnd: 'M',
    cardinalityEndPos: [358, 294],
    boxedCardinality: true,
  },

  // 4. User [1] --- REL_LOG --- [M] AdminLog
  {
    id: 'erd-r4a',
    from: 'ENT_USER',
    to: 'REL_LOG',
    label: '',
    waypoints: [
      [1158, 345],
      [1500, 492],
    ],
    labelPos: [1330, 418],
    arrowEnd: false,
    cardinalityStart: '1',
    cardinalityStartPos: [1285, 376],
    boxedCardinality: true,
  },
  {
    id: 'erd-r4b',
    from: 'REL_LOG',
    to: 'ENT_ADMIN_LOG',
    label: '',
    waypoints: [
      [1500, 580],
      [1500, 728],
    ],
    labelPos: [1500, 654],
    arrowEnd: false,
    cardinalityEnd: 'M',
    cardinalityEndPos: [1524, 656],
    boxedCardinality: true,
  },

  // 5. User [1] --- REL_CREATE_PLAN --- [M] MarketingPlan
  {
    id: 'erd-r5a',
    from: 'ENT_USER',
    to: 'REL_CREATE_PLAN',
    label: '',
    waypoints: [
      [1110, 345],
      [1140, 492],
    ],
    labelPos: [1125, 418],
    arrowEnd: false,
    cardinalityStart: '1',
    cardinalityStartPos: [1148, 414],
    boxedCardinality: true,
  },
  {
    id: 'erd-r5b',
    from: 'REL_CREATE_PLAN',
    to: 'ENT_PLAN',
    label: '',
    waypoints: [
      [1140, 580],
      [1170, 728],
    ],
    labelPos: [1155, 654],
    arrowEnd: false,
    cardinalityEnd: 'M',
    cardinalityEndPos: [1182, 654],
    boxedCardinality: true,
  },

  // 6. MarketingPlan [1] --- REL_ORGANIZE --- [M] Post
  {
    id: 'erd-r6a',
    from: 'ENT_PLAN',
    to: 'REL_ORGANIZE',
    label: '',
    waypoints: [
      [1125, 728],
      [796, 476],
    ],
    labelPos: [960, 602],
    arrowEnd: false,
    cardinalityStart: '1',
    cardinalityStartPos: [985, 594],
    boxedCardinality: true,
  },
  {
    id: 'erd-r6b',
    from: 'REL_ORGANIZE',
    to: 'ENT_POST',
    label: '',
    waypoints: [
      [724, 476],
      [295, 345],
    ],
    labelPos: [510, 410],
    arrowEnd: false,
    cardinalityEnd: 'M',
    cardinalityEndPos: [530, 392],
    boxedCardinality: true,
  },

  // 7. AIOutput [M] --- REL_APPROVE --- [1] Post
  {
    id: 'erd-r7a',
    from: 'ENT_AI_OUT',
    to: 'REL_APPROVE',
    label: '',
    waypoints: [
      [805, 728],
      [642, 600],
    ],
    labelPos: [724, 664],
    arrowEnd: false,
    cardinalityStart: 'M',
    cardinalityStartPos: [740, 646],
    boxedCardinality: true,
  },
  {
    id: 'erd-r7b',
    from: 'REL_APPROVE',
    to: 'ENT_POST',
    label: '',
    waypoints: [
      [564, 600],
      [265, 345],
    ],
    labelPos: [414, 472],
    arrowEnd: false,
    cardinalityEnd: '1',
    cardinalityEndPos: [454, 478],
    boxedCardinality: true,
  },

  // 8. Post [1] --- REL_SCHEDULE --- [M] PublishJob
  {
    id: 'erd-r8a',
    from: 'ENT_POST',
    to: 'REL_SCHEDULE',
    label: '',
    waypoints: [
      [235, 345],
      [381, 530],
    ],
    labelPos: [308, 438],
    arrowEnd: false,
    cardinalityStart: '1',
    cardinalityStartPos: [286, 444],
    boxedCardinality: true,
  },
  {
    id: 'erd-r8b',
    from: 'REL_SCHEDULE',
    to: 'ENT_JOB',
    label: '',
    waypoints: [
      [381, 618],
      [485, 728],
    ],
    labelPos: [433, 673],
    arrowEnd: false,
    cardinalityEnd: 'M',
    cardinalityEndPos: [460, 664],
    boxedCardinality: true,
  },

  // 9. Post [1] --- REL_MEASURE --- [M] PerformanceMetric
  {
    id: 'erd-r9a',
    from: 'ENT_POST',
    to: 'REL_MEASURE',
    label: '',
    waypoints: [
      [205, 345],
      [180, 492],
    ],
    labelPos: [192, 418],
    arrowEnd: false,
    cardinalityStart: '1',
    cardinalityStartPos: [164, 418],
    boxedCardinality: true,
  },
  {
    id: 'erd-r9b',
    from: 'REL_MEASURE',
    to: 'ENT_METRIC',
    label: '',
    waypoints: [
      [180, 580],
      [175, 728],
    ],
    labelPos: [178, 654],
    arrowEnd: false,
    cardinalityEnd: 'M',
    cardinalityEndPos: [152, 654],
    boxedCardinality: true,
  },

  // 10. MarketingPlan [1] --- REL_GENERATE --- [M] AIOutput
  {
    id: 'erd-r10a',
    from: 'ENT_PLAN',
    to: 'REL_GENERATE',
    label: '',
    waypoints: [
      [1096, 755],
      [1041, 755],
    ],
    labelPos: [1068, 755],
    arrowEnd: false,
    cardinalityStart: '1',
    cardinalityStartPos: [1068, 730],
    boxedCardinality: true,
  },
  {
    id: 'erd-r10b',
    from: 'REL_GENERATE',
    to: 'ENT_AI_OUT',
    label: '',
    waypoints: [
      [969, 755],
      [911, 755],
    ],
    labelPos: [940, 755],
    arrowEnd: false,
    cardinalityEnd: 'M',
    cardinalityEndPos: [940, 730],
    boxedCardinality: true,
  },

  // 11. PublishJob [1] --- REL_RECORD --- [M] PerformanceMetric
  {
    id: 'erd-r11a',
    from: 'ENT_JOB',
    to: 'REL_RECORD',
    label: '',
    waypoints: [
      [434, 755],
      [376, 755],
    ],
    labelPos: [405, 755],
    arrowEnd: false,
    cardinalityStart: '1',
    cardinalityStartPos: [405, 730],
    boxedCardinality: true,
  },
  {
    id: 'erd-r11b',
    from: 'REL_RECORD',
    to: 'ENT_METRIC',
    label: '',
    waypoints: [
      [304, 755],
      [246, 755],
    ],
    labelPos: [275, 755],
    arrowEnd: false,
    cardinalityEnd: 'M',
    cardinalityEndPos: [275, 730],
    boxedCardinality: true,
  },
];

const fanResults = ENTITY_FANS.map(buildChenEntityFan);
const allFanNodes = fanResults.flatMap((r) => r.nodes);
const allFanEdges = fanResults.flatMap((r) => r.edges);

export const ERD_DIAGRAM: DiagramSpec = {
  id: 'erd-system',
  figureNumber: 'شكل (3.17)',
  sectionNumber: '3.4.5',
  category: 'erd',
  categoryLabel: 'مخطط الكينونات والعلاقات (ERD)',
  title: 'مخطط الكينونات والعلاقات (ERD) — تصميم تشين القياسي للطباعة A4',
  subtitle: 'الكينونات التسع وصفاتها البيضاوية المتفرعة وعلاقاتها المعينية ودرجاتها (1 : M) بنسبة A4 أفقية',
  description:
    'يعرض مخطط الكينونات والعلاقات (ERD) وفق نموذج تشين الأكاديمي القياسي البنية البياناتية الشاملة لمنصة جدولة النشر على فيسبوك وإدارة المحتوى التسويقي، متضمناً الكينونات التسع الرئيسية (الدور والصلاحية، المستخدم، صفحة فيسبوك، المنشور التسويقي، السجل الإداري، الخطة التسويقية، مخرج الذكاء، مهمة الجدولة، ومؤشر الأداء) مع صفاتها البيضاوية المتفرعة والمفاتيح الأساسية المسطّرة (PK) والعلاقات المعينية ودرجاتها (1 : M) بتنسيق مصمم بدقة للطباعة الواضحة على ورق A4 أفقي دون أي تداخل.',
  urIds: ['UR-01', 'UR-02', 'UR-03', 'UR-04', 'UR-05', 'UR-06', 'UR-07'],
  frIds: ['FR-01', 'FR-04', 'FR-08', 'FR-10', 'FR-12', 'FR-17', 'FR-25', 'FR-28', 'FR-33'],
  width: 1684,
  height: 1036,
  nodes: [...allFanNodes, ...RELATION_NODES],
  edges: [...allFanEdges, ...RELATION_EDGES],
};
