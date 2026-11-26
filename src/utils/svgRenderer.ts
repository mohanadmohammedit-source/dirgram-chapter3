import JSZip from 'jszip';
import type { DiagramEdge, DiagramNode, DiagramSpec, DiagramTheme } from '../types/diagram';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates an orthogonal SVG path with subtle rounded corners (r=6px) for clean academic aesthetics.
 */
export function buildOrthogonalPath(waypoints: [number, number][], radius = 6): string {
  if (waypoints.length === 0) return '';
  if (waypoints.length === 1) return `M ${waypoints[0][0]} ${waypoints[0][1]}`;
  if (waypoints.length === 2) {
    return `M ${waypoints[0][0]} ${waypoints[0][1]} L ${waypoints[1][0]} ${waypoints[1][1]}`;
  }

  let d = `M ${waypoints[0][0]} ${waypoints[0][1]}`;
  for (let i = 1; i < waypoints.length - 1; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const next = waypoints[i + 1];

    const dx1 = curr[0] - prev[0];
    const dy1 = curr[1] - prev[1];
    const len1 = Math.hypot(dx1, dy1);

    const dx2 = next[0] - curr[0];
    const dy2 = next[1] - curr[1];
    const len2 = Math.hypot(dx2, dy2);

    const r = Math.min(radius, len1 / 2, len2 / 2);
    if (r < 1 || len1 === 0 || len2 === 0) {
      d += ` L ${curr[0]} ${curr[1]}`;
      continue;
    }

    const startX = curr[0] - (dx1 / len1) * r;
    const startY = curr[1] - (dy1 / len1) * r;
    const endX = curr[0] + (dx2 / len2) * r;
    const endY = curr[1] + (dy2 / len2) * r;

    d += ` L ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${curr[0]} ${curr[1]} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
  }

  const last = waypoints[waypoints.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}

function renderMultilineText(
  lines: string[],
  cx: number,
  cy: number,
  fontSize: number,
  lineHeight: number,
  fill: string,
  fontWeight: number | string = 600,
  fontFamily = "'IBM Plex Sans Arabic', 'Cairo', 'Segoe UI', Arial, sans-serif"
): string {
  const totalHeight = (lines.length - 1) * lineHeight;
  const startY = cy - totalHeight / 2;
  const tspans = lines
    .map(
      (line, idx) =>
        `<tspan x="${cx}" y="${(startY + idx * lineHeight).toFixed(1)}">${escapeXml(line)}</tspan>`
    )
    .join('');
  return `<text x="${cx}" y="${startY.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="${fill}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" direction="rtl">${tspans}</text>`;
}

function renderNodeSvg(
  node: DiagramNode,
  theme: DiagramTheme,
  selectedId?: string | null
): string {
  const isSelected = selectedId === node.id;
  const selStroke = isSelected ? '#2563EB' : '';
  const selOutline = isSelected
    ? `<rect x="${node.x - 5}" y="${node.y - 5}" width="${node.w + 10}" height="${node.h + 10}" rx="12" fill="none" stroke="#2563EB" stroke-width="2" stroke-dasharray="5 3"/>`
    : '';

  if (node.type === 'process') {
    const headerH = 30;
    const r = 11;
    const lines = node.label.split('\n');
    const bodyCenterY = node.y + headerH + (node.h - headerH) / 2;
    const fontSize = node.code === '0' ? 17 : 13.5;
    const lineHeight = node.code === '0' ? 25 : 20;

    return `<g data-node-id="${escapeXml(node.id)}" class="diagram-node" style="cursor:pointer">
      ${selOutline}
      <rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="${r}" ry="${r}" fill="${theme.processBodyFill}" stroke="${selStroke || theme.processBorder}" stroke-width="2" filter="url(#soft-shadow)"/>
      <path d="M ${node.x + r} ${node.y} L ${node.x + node.w - r} ${node.y} Q ${node.x + node.w} ${node.y} ${node.x + node.w} ${node.y + r} L ${node.x + node.w} ${node.y + headerH} L ${node.x} ${node.y + headerH} L ${node.x} ${node.y + r} Q ${node.x} ${node.y} ${node.x + r} ${node.y} Z" fill="${theme.processHeaderFill}"/>
      <line x1="${node.x}" y1="${node.y + headerH}" x2="${node.x + node.w}" y2="${node.y + headerH}" stroke="${theme.processBorder}" stroke-width="1.5"/>
      <text x="${node.x + node.w / 2}" y="${node.y + headerH / 2 + 1}" text-anchor="middle" dominant-baseline="central" fill="${theme.processHeaderText}" font-family="'IBM Plex Mono', 'Cairo', monospace" font-size="13.5" font-weight="700">${escapeXml(node.code ?? '')}</text>
      ${renderMultilineText(lines, node.x + node.w / 2, bodyCenterY, fontSize, lineHeight, theme.processBodyText, 700)}
    </g>`;
  }

  if (node.type === 'entity') {
    const lines = node.label.split('\n');
    return `<g data-node-id="${escapeXml(node.id)}" class="diagram-node" style="cursor:pointer">
      ${selOutline}
      <rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="3" ry="3" fill="${theme.entityFill}" stroke="${selStroke || theme.entityBorder}" stroke-width="2.2" filter="url(#soft-shadow)"/>
      <rect x="${node.x + 4}" y="${node.y + 4}" width="${node.w - 8}" height="${node.h - 8}" rx="1" fill="none" stroke="${theme.entityBorder}" stroke-opacity="0.22" stroke-width="1"/>
      ${
        node.code
          ? `<text x="${node.x + node.w - 10}" y="${node.y + 16}" text-anchor="end" fill="${theme.entityBorder}" fill-opacity="0.7" font-family="'IBM Plex Mono', monospace" font-size="10.5" font-weight="600">${escapeXml(node.code)}</text>`
          : ''
      }
      ${renderMultilineText(lines, node.x + node.w / 2, node.y + node.h / 2 + 2, 14.5, 22, theme.entityText, 700)}
    </g>`;
  }

  if (node.type === 'datastore') {
    const codeW = 54;
    const lines = node.label.split('\n');
    // Gane & Sarson open-ended rectangle (open on the left in RTL, closed on right with D# compartment)
    const codeX = node.x + node.w - codeW;
    return `<g data-node-id="${escapeXml(node.id)}" class="diagram-node" style="cursor:pointer">
      ${selOutline}
      <rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" fill="${theme.datastoreBodyFill}" stroke="none"/>
      <rect x="${codeX}" y="${node.y}" width="${codeW}" height="${node.h}" fill="${theme.datastoreCodeFill}" stroke="none"/>
      <path d="M ${node.x} ${node.y} L ${node.x + node.w} ${node.y} L ${node.x + node.w} ${node.y + node.h} L ${node.x} ${node.y + node.h}" fill="none" stroke="${selStroke || theme.datastoreBorder}" stroke-width="2"/>
      <line x1="${codeX}" y1="${node.y}" x2="${codeX}" y2="${node.y + node.h}" stroke="${theme.datastoreBorder}" stroke-width="1.8"/>
      <text x="${codeX + codeW / 2}" y="${node.y + node.h / 2 + 1}" text-anchor="middle" dominant-baseline="central" fill="${theme.datastoreCodeText}" font-family="'IBM Plex Mono', monospace" font-size="13.5" font-weight="700">${escapeXml(node.code ?? '')}</text>
      ${renderMultilineText(lines, node.x + (node.w - codeW) / 2, node.y + node.h / 2 + 1, 13, 18, theme.datastoreBodyText, 600)}
    </g>`;
  }

  if (node.type === 'erd_entity') {
    const headerH = 38;
    const attrs = node.attributes ?? [];
    const attrRows = attrs
      .map((attr, idx) => {
        const rowY = node.y + headerH + 20 + idx * 30;
        const badgeColor =
          attr.key === 'PK'
            ? theme.erdPkColor
            : attr.key === 'FK'
              ? theme.erdFkColor
              : '';
        const divider =
          idx > 0
            ? `<line x1="${node.x + 10}" y1="${rowY - 16}" x2="${node.x + node.w - 10}" y2="${rowY - 16}" stroke="#E2E8F0" stroke-width="1"/>`
            : '';
        const badge = attr.key
          ? `<text x="${node.x + 14}" y="${rowY}" text-anchor="start" dominant-baseline="central" fill="${badgeColor}" font-family="'IBM Plex Mono', monospace" font-size="10.5" font-weight="700">${attr.key}</text>`
          : '';
        return `${divider}${badge}<text x="${node.x + node.w - 14}" y="${rowY}" text-anchor="end" dominant-baseline="central" fill="${theme.erdBodyText}" font-family="'IBM Plex Sans Arabic', 'Cairo', sans-serif" font-size="12" font-weight="${attr.key === 'PK' ? '700' : '500'}" direction="rtl">${escapeXml(attr.name)}</text>`;
      })
      .join('');

    return `<g data-node-id="${escapeXml(node.id)}" class="diagram-node" style="cursor:pointer">
      ${selOutline}
      <rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="6" ry="6" fill="${theme.erdBodyFill}" stroke="${selStroke || theme.erdBorder}" stroke-width="2" filter="url(#soft-shadow)"/>
      <path d="M ${node.x + 6} ${node.y} L ${node.x + node.w - 6} ${node.y} Q ${node.x + node.w} ${node.y} ${node.x + node.w} ${node.y + 6} L ${node.x + node.w} ${node.y + headerH} L ${node.x} ${node.y + headerH} L ${node.x} ${node.y + 6} Q ${node.x} ${node.y} ${node.x + 6} ${node.y} Z" fill="${theme.erdHeaderFill}"/>
      <text x="${node.x + node.w / 2}" y="${node.y + headerH / 2 + 1}" text-anchor="middle" dominant-baseline="central" fill="${theme.erdHeaderText}" font-family="'Cairo', 'IBM Plex Sans Arabic', sans-serif" font-size="13.5" font-weight="700" direction="rtl">${escapeXml(node.label)}</text>
      ${attrRows}
    </g>`;
  }

  if (node.type === 'erd_chen_entity') {
    const cx = node.x + node.w / 2;
    const cy = node.y + node.h / 2;
    return `<g data-node-id="${escapeXml(node.id)}" class="diagram-node" style="cursor:pointer">
      ${selOutline}
      <rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="5" ry="5" fill="#FFFFFF" stroke="${selStroke || theme.erdBorder}" stroke-width="2" filter="url(#soft-shadow)"/>
      <text x="${cx}" y="${cy + 1}" text-anchor="middle" dominant-baseline="central" fill="${theme.processBodyText}" font-family="'Cairo', 'IBM Plex Sans Arabic', sans-serif" font-size="14.5" font-weight="800" direction="rtl">${escapeXml(node.label)}</text>
    </g>`;
  }

  if (node.type === 'erd_chen_relation') {
    const cx = node.x + node.w / 2;
    const cy = node.y + node.h / 2;
    const pts = `${cx},${node.y} ${node.x + node.w},${cy} ${cx},${node.y + node.h} ${node.x},${cy}`;
    return `<g data-node-id="${escapeXml(node.id)}" class="diagram-node" style="cursor:pointer">
      ${selOutline}
      <polygon points="${pts}" fill="#FFFFFF" stroke="${selStroke || theme.erdBorder}" stroke-width="2" filter="url(#soft-shadow)"/>
      <text x="${cx}" y="${cy + 1}" text-anchor="middle" dominant-baseline="central" fill="${theme.processBodyText}" font-family="'Cairo', 'IBM Plex Sans Arabic', sans-serif" font-size="13" font-weight="800" direction="rtl">${escapeXml(node.label)}</text>
    </g>`;
  }

  if (node.type === 'erd_attr') {
    const cx = node.x + node.w / 2;
    const cy = node.y + node.h / 2;
    const rx = node.w / 2;
    const ry = node.h / 2;
    const rot = node.rotation ?? 0;
    const pkUnderline = node.isPk ? 'text-decoration="underline"' : '';
    const strokeCol = selStroke || (node.isPk ? theme.erdBorder : '#475569');
    const strokeW = node.isPk ? '1.7' : '1.25';
    return `<g data-node-id="${escapeXml(node.id)}" class="diagram-node" transform="rotate(${rot} ${cx} ${cy})" style="cursor:pointer">
      ${
        isSelected
          ? `<ellipse cx="${cx}" cy="${cy}" rx="${rx + 4}" ry="${ry + 4}" fill="none" stroke="#2563EB" stroke-width="1.8" stroke-dasharray="4 2"/>`
          : ''
      }
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#FFFFFF" stroke="${strokeCol}" stroke-width="${strokeW}"/>
      <text x="${cx}" y="${cy + 0.5}" text-anchor="middle" dominant-baseline="central" fill="${node.isPk ? theme.titleColor : theme.processBodyText}" font-family="'IBM Plex Sans Arabic', 'Cairo', sans-serif" font-size="11.5" font-weight="${node.isPk ? '800' : '600'}" ${pkUnderline} direction="rtl">${escapeXml(node.label)}</text>
    </g>`;
  }

  // erd_relation (diamond)
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const pts = `${cx},${node.y} ${node.x + node.w},${cy} ${cx},${node.y + node.h} ${node.x},${cy}`;
  return `<g data-node-id="${escapeXml(node.id)}" class="diagram-node" style="cursor:pointer">
    ${selOutline}
    <polygon points="${pts}" fill="${theme.erdRelationFill}" stroke="${selStroke || theme.erdRelationBorder}" stroke-width="2" filter="url(#soft-shadow)"/>
    <text x="${cx}" y="${cy + 1}" text-anchor="middle" dominant-baseline="central" fill="${theme.erdRelationText}" font-family="'Cairo', 'IBM Plex Sans Arabic', sans-serif" font-size="12.5" font-weight="700" direction="rtl">${escapeXml(node.label)}</text>
  </g>`;
}

function renderEdgeSvg(
  edge: DiagramEdge,
  theme: DiagramTheme,
  selectedEdgeId?: string | null
): string {
  const isSelected = selectedEdgeId === edge.id;
  const strokeColor = isSelected
    ? '#2563EB'
    : edge.thinAttrArrow
      ? '#475569'
      : theme.edgeStroke;
  const strokeWidth = isSelected ? 2.5 : edge.thinAttrArrow ? 1.15 : 1.7;
  const pathD = buildOrthogonalPath(edge.waypoints, 6);
  const arrowEnd = edge.arrowEnd !== false;
  const arrowStart = edge.arrowStart === true;

  const endMarkerId = isSelected
    ? 'arrow-end-sel'
    : edge.thinAttrArrow
      ? 'attr-arrow-end'
      : 'arrow-end';
  const markerEnd = arrowEnd ? `marker-end="url(#${endMarkerId})"` : '';
  const markerStart = arrowStart
    ? `marker-start="url(#${isSelected ? 'arrow-start-sel' : 'arrow-start'})"`
    : '';
  const dashAttr = edge.dashed ? 'stroke-dasharray="6 4"' : '';

  let labelSvg = '';
  if (edge.label && edge.label.trim().length > 0) {
    const lines = edge.label.split('\n');
    const maxLineChars = Math.max(...lines.map((l) => l.length));
    const computedW = Math.max(76, maxLineChars * 6.8 + 18);
    const boxW = edge.labelWidth ?? computedW;
    const boxH = lines.length === 1 ? 24 : 20 * lines.length + 8;
    const [lx, ly] = edge.labelPos;

    labelSvg = `<rect x="${(lx - boxW / 2).toFixed(1)}" y="${(ly - boxH / 2).toFixed(1)}" width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}" rx="4" fill="${theme.edgeLabelBg}" stroke="${isSelected ? '#2563EB' : theme.edgeLabelBorder}" stroke-width="${isSelected ? '1.5' : '0.9'}"/>
      ${renderMultilineText(lines, lx, ly + 0.5, 11.5, 16, isSelected ? '#1D4ED8' : theme.edgeLabelText, 600)}`;
  }

  // Optional ERD cardinalities near start/end (supports Chen boxed [1]/[M] style!)
  let cardSvg = '';
  const renderCard = (val: string, cx: number, cy: number) => {
    if (edge.boxedCardinality) {
      return `<rect x="${(cx - 11).toFixed(1)}" y="${(cy - 11).toFixed(1)}" width="22" height="22" rx="2" fill="#FFFFFF" stroke="${theme.erdBorder}" stroke-width="1.3"/>
        <text x="${cx.toFixed(1)}" y="${(cy + 0.5).toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="${theme.processBodyText}" font-family="'IBM Plex Mono', monospace" font-size="12" font-weight="700">${escapeXml(val)}</text>`;
    }
    return `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="${theme.titleColor}" font-family="'IBM Plex Mono', monospace" font-size="12" font-weight="700">${escapeXml(val)}</text>`;
  };

  if (edge.cardinalityStart && edge.waypoints.length >= 2) {
    let cx: number;
    let cy: number;
    if (edge.cardinalityStartPos) {
      [cx, cy] = edge.cardinalityStartPos;
    } else {
      const [x0, y0] = edge.waypoints[0];
      const [x1, y1] = edge.waypoints[1];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      cx = x0 + (dx / len) * 18 + (Math.abs(dy) > Math.abs(dx) ? 16 : 0);
      cy = y0 + (dy / len) * 18 + (Math.abs(dx) >= Math.abs(dy) ? -14 : 0);
    }
    cardSvg += renderCard(edge.cardinalityStart, cx, cy);
  }
  if (edge.cardinalityEnd && edge.waypoints.length >= 2) {
    let cx: number;
    let cy: number;
    if (edge.cardinalityEndPos) {
      [cx, cy] = edge.cardinalityEndPos;
    } else {
      const n = edge.waypoints.length;
      const [x0, y0] = edge.waypoints[n - 2];
      const [x1, y1] = edge.waypoints[n - 1];
      const dx = x0 - x1;
      const dy = y0 - y1;
      const len = Math.hypot(dx, dy) || 1;
      cx = x1 + (dx / len) * 18 + (Math.abs(dy) > Math.abs(dx) ? 16 : 0);
      cy = y1 + (dy / len) * 18 + (Math.abs(dx) >= Math.abs(dy) ? -14 : 0);
    }
    cardSvg += renderCard(edge.cardinalityEnd, cx, cy);
  }

  return `<g data-edge-id="${escapeXml(edge.id)}" class="diagram-edge" style="cursor:pointer">
    <path d="${pathD}" fill="none" stroke="transparent" stroke-width="12"/>
    <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round" ${dashAttr} ${markerStart} ${markerEnd}/>
    ${labelSvg}
    ${cardSvg}
  </g>`;
}

function renderLegendSvg(
  diagram: DiagramSpec,
  theme: DiagramTheme,
  y: number,
  width: number
): string {
  const isErd = diagram.category === 'erd';
  const cx = width / 2;

  if (isErd) {
    return `<g transform="translate(0, ${y})">
      <line x1="40" y1="0" x2="${width - 40}" y2="0" stroke="${theme.frameBorder}" stroke-width="1"/>
      <rect x="${cx + 280}" y="13" width="28" height="18" rx="3" fill="#FFFFFF" stroke="${theme.erdBorder}" stroke-width="1.6"/>
      <text x="${cx + 270}" y="22" text-anchor="end" dominant-baseline="central" fill="${theme.subtitleColor}" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="11.5" font-weight="600">كينونة (Entity)</text>

      <polygon points="${cx + 125},10 ${cx + 139},22 ${cx + 125},34 ${cx + 111},22" fill="#FFFFFF" stroke="${theme.erdBorder}" stroke-width="1.6"/>
      <text x="${cx + 101}" y="22" text-anchor="end" dominant-baseline="central" fill="${theme.subtitleColor}" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="11.5" font-weight="600">علاقة (Relationship)</text>

      <ellipse cx="${cx - 48}" cy="22" rx="18" ry="9" fill="#FFFFFF" stroke="#475569" stroke-width="1.3"/>
      <text x="${cx - 74}" y="22" text-anchor="end" dominant-baseline="central" fill="${theme.subtitleColor}" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="11.5" font-weight="600">صفة (Attribute)</text>

      <ellipse cx="${cx - 196}" cy="22" rx="18" ry="9" fill="#FFFFFF" stroke="${theme.erdBorder}" stroke-width="1.6"/>
      <text x="${cx - 196}" y="22" text-anchor="middle" dominant-baseline="central" fill="${theme.titleColor}" font-family="'IBM Plex Mono', monospace" font-size="9" font-weight="700" text-decoration="underline">id</text>
      <text x="${cx - 222}" y="22" text-anchor="end" dominant-baseline="central" fill="${theme.subtitleColor}" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="11.5" font-weight="600">مفتاح أساسي (PK)</text>

      <rect x="${cx - 350}" y="13" width="18" height="18" rx="2" fill="#FFFFFF" stroke="${theme.erdBorder}" stroke-width="1.3"/>
      <text x="${cx - 341}" y="22" text-anchor="middle" dominant-baseline="central" fill="${theme.processBodyText}" font-family="'IBM Plex Mono', monospace" font-size="10" font-weight="700">1/M</text>
      <text x="${cx - 358}" y="22" text-anchor="end" dominant-baseline="central" fill="${theme.subtitleColor}" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="11.5" font-weight="600">درجة العلاقة</text>
    </g>`;
  }

  return `<g transform="translate(0, ${y})">
    <line x1="40" y1="0" x2="${width - 40}" y2="0" stroke="${theme.frameBorder}" stroke-width="1"/>
    <rect x="${cx + 260}" y="13" width="26" height="18" rx="4" fill="${theme.processBodyFill}" stroke="${theme.processBorder}" stroke-width="1.5"/>
    <rect x="${cx + 260}" y="13" width="26" height="6" rx="2" fill="${theme.processHeaderFill}"/>
    <text x="${cx + 250}" y="22" text-anchor="end" dominant-baseline="central" fill="${theme.subtitleColor}" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="11.5" font-weight="600">عملية (Process)</text>

    <rect x="${cx + 100}" y="14" width="26" height="16" rx="2" fill="${theme.entityFill}" stroke="${theme.entityBorder}" stroke-width="1.5"/>
    <text x="${cx + 90}" y="22" text-anchor="end" dominant-baseline="central" fill="${theme.subtitleColor}" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="11.5" font-weight="600">جهة خارجية (Entity)</text>

    <path d="M ${cx - 85} 14 L ${cx - 57} 14 L ${cx - 57} 30 L ${cx - 85} 30" fill="${theme.datastoreBodyFill}" stroke="${theme.datastoreBorder}" stroke-width="1.5"/>
    <line x1="${cx - 66}" y1="14" x2="${cx - 66}" y2="30" stroke="${theme.datastoreBorder}" stroke-width="1.2"/>
    <text x="${cx - 95}" y="22" text-anchor="end" dominant-baseline="central" fill="${theme.subtitleColor}" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="11.5" font-weight="600">مخزن بيانات (Data Store)</text>

    <line x1="${cx - 255}" y1="22" x2="${cx - 295}" y2="22" stroke="${theme.edgeStroke}" stroke-width="1.6" marker-end="url(#arrow-end)"/>
    <text x="${cx - 305}" y="22" text-anchor="end" dominant-baseline="central" fill="${theme.subtitleColor}" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="11.5" font-weight="600">تدفق بيانات (Data Flow)</text>
  </g>`;
}

export interface RenderSvgOptions {
  includeFrame?: boolean;
  includeCaption?: boolean;
  includeLegend?: boolean;
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
}

export function renderDiagramToSvgString(
  diagram: DiagramSpec,
  theme: DiagramTheme,
  options: RenderSvgOptions = {}
): string {
  const {
    includeFrame = true,
    includeCaption = true,
    includeLegend = true,
    selectedNodeId = null,
    selectedEdgeId = null,
  } = options;

  const headerOffset = includeCaption ? 64 : 16;
  const legendHeight = includeLegend ? 44 : 0;
  const footerHeight = includeCaption ? 46 : 16;
  const totalW = diagram.width;
  const totalH = diagram.height + headerOffset + legendHeight + footerHeight;

  const edgesMarkup = diagram.edges
    .map((e) => renderEdgeSvg(e, theme, selectedEdgeId))
    .join('\n');
  const nodesMarkup = diagram.nodes
    .map((n) => renderNodeSvg(n, theme, selectedNodeId))
    .join('\n');

  const headerMarkup = includeCaption
    ? `<text x="${totalW / 2}" y="30" text-anchor="middle" dominant-baseline="central" fill="${theme.titleColor}" font-family="'Cairo', 'IBM Plex Sans Arabic', sans-serif" font-size="19" font-weight="800" direction="rtl">${escapeXml(diagram.title)}</text>
       <text x="${totalW / 2}" y="52" text-anchor="middle" dominant-baseline="central" fill="${theme.subtitleColor}" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="12.5" font-weight="500" direction="rtl">${escapeXml(diagram.subtitle)}</text>`
    : '';

  const legendMarkup = includeLegend
    ? renderLegendSvg(diagram, theme, headerOffset + diagram.height + 2, totalW)
    : '';

  const footerMarkup = includeCaption
    ? `<text x="${totalW / 2}" y="${totalH - 22}" text-anchor="middle" dominant-baseline="central" fill="${theme.captionColor}" font-family="'Cairo', 'IBM Plex Sans Arabic', sans-serif" font-size="14.5" font-weight="700" direction="rtl">${escapeXml(`${diagram.figureNumber}: ${diagram.title}`)}</text>`
    : '';

  const frameMarkup = includeFrame
    ? `<rect x="8" y="8" width="${totalW - 16}" height="${totalH - 16}" rx="10" fill="${theme.canvasBg}" stroke="${theme.frameBorder}" stroke-width="1.5"/>`
    : `<rect x="0" y="0" width="${totalW}" height="${totalH}" fill="${theme.canvasBg}"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}" dir="rtl">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&amp;family=IBM+Plex+Mono:wght@600;700&amp;family=IBM+Plex+Sans+Arabic:wght@500;600;700&amp;display=swap');
    </style>
    <filter id="soft-shadow" x="-6%" y="-6%" width="112%" height="114%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0F172A" flood-opacity="0.07"/>
    </filter>
    <marker id="arrow-end" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${theme.edgeStroke}"/>
    </marker>
    <marker id="attr-arrow-end" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto">
      <path d="M 1 1.5 L 9.5 5 L 1 8.5 z" fill="#475569"/>
    </marker>
    <marker id="arrow-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto">
      <path d="M 10 1 L 0 5 L 10 9 z" fill="${theme.edgeStroke}"/>
    </marker>
    <marker id="arrow-end-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563EB"/>
    </marker>
    <marker id="arrow-start-sel" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 10 1 L 0 5 L 10 9 z" fill="#2563EB"/>
    </marker>
  </defs>
  ${frameMarkup}
  ${headerMarkup}
  <g transform="translate(0, ${headerOffset})">
    ${edgesMarkup}
    ${nodesMarkup}
  </g>
  ${legendMarkup}
  ${footerMarkup}
</svg>`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadDiagramAsSvg(
  diagram: DiagramSpec,
  theme: DiagramTheme,
  includeLegend = true
): void {
  const svgString = renderDiagramToSvgString(diagram, theme, {
    includeFrame: true,
    includeCaption: true,
    includeLegend,
  });
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const safeFile = `${diagram.figureNumber.replace(/[() ]+/g, '_')}_${diagram.id}.svg`;
  downloadBlob(blob, safeFile);
}

export async function renderDiagramToPngBytes(
  diagram: DiagramSpec,
  theme: DiagramTheme,
  scale = 2.2,
  includeLegend = true
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const svgString = renderDiagramToSvgString(diagram, theme, {
    includeFrame: true,
    includeCaption: true,
    includeLegend,
  });

  // Remove external @import inside SVG for offline canvas safety (browser fonts are already loaded)
  const cleanSvg = svgString.replace(/@import url\([^)]+\);/g, '');
  const viewBoxMatch = cleanSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const svgW = viewBoxMatch ? parseInt(viewBoxMatch[1], 10) : diagram.width;
  const svgH = viewBoxMatch ? parseInt(viewBoxMatch[2], 10) : diagram.height;

  const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(svgW * scale);
    canvas.height = Math.round(svgH * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    ctx.fillStyle = theme.canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, svgW, svgH);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('PNG export failed'))),
        'image/png',
        1.0
      );
    });

    const arrayBuffer = await pngBlob.arrayBuffer();
    return {
      bytes: new Uint8Array(arrayBuffer),
      width: svgW,
      height: svgH,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadDiagramAsPng(
  diagram: DiagramSpec,
  theme: DiagramTheme,
  includeLegend = true
): Promise<void> {
  const { bytes } = await renderDiagramToPngBytes(diagram, theme, 2.5, includeLegend);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'image/png' });
  const safeFile = `${diagram.figureNumber.replace(/[() ]+/g, '_')}_${diagram.id}.png`;
  downloadBlob(blob, safeFile);
}

export async function downloadAllSvgsAsZip(
  diagrams: DiagramSpec[],
  theme: DiagramTheme,
  includeLegend = true
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('مخططات_الفصل_الثالث_SVG');
  if (!folder) return;

  diagrams.forEach((diagram, index) => {
    const idxStr = String(index + 1).padStart(2, '0');
    const svgString = renderDiagramToSvgString(diagram, theme, {
      includeFrame: true,
      includeCaption: true,
      includeLegend,
    });
    const safeName = `${idxStr}_${diagram.figureNumber.replace(/[() ]+/g, '_')}_${diagram.id}.svg`;
    folder.file(safeName, svgString);
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, 'مخططات_الفصل_الثالث_SVG_منصة_فيسبوك.zip');
}
