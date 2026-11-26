import JSZip from 'jszip';
import type {
  DiagramEdge,
  DiagramNode,
  DiagramSpec,
  DiagramTheme,
  WordExportOptions,
} from '../types/diagram';
import { DATA_STORES_CATALOG, FR_CATALOG, UR_CATALOG } from '../data/diagrams';
import { downloadBlob, renderDiagramToPngBytes } from './svgRenderer';

function xmlEsc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHash(hex: string): string {
  return hex.replace('#', '').toUpperCase();
}

/**
 * Generates an RTL Arabic Word paragraph (<w:p>)
 */
function wParagraph(
  text: string,
  opts: {
    sizeHalfPt?: number;
    bold?: boolean;
    color?: string;
    align?: 'right' | 'center' | 'both' | 'left';
    spaceBefore?: number;
    spaceAfter?: number;
    pageBreakBefore?: boolean;
  } = {}
): string {
  const {
    sizeHalfPt = 24,
    bold = false,
    color = '0F172A',
    align = 'right',
    spaceBefore = 80,
    spaceAfter = 100,
    pageBreakBefore = false,
  } = opts;

  return `<w:p>
    <w:pPr>
      <w:bidi/>
      <w:jc w:val="${align}"/>
      <w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="276" w:lineRule="auto"/>
      ${pageBreakBefore ? '<w:pageBreakBefore/>' : ''}
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
        <w:rtl/>
        ${bold ? '<w:b/><w:bCs/>' : ''}
        <w:color w:val="${stripHash(color)}"/>
        <w:sz w:val="${sizeHalfPt}"/>
        <w:szCs w:val="${sizeHalfPt}"/>
      </w:rPr>
      <w:t xml:space="preserve">${xmlEsc(text)}</w:t>
    </w:r>
  </w:p>`;
}

/**
 * Generates an RTL Arabic formatted Word table (<w:tbl>)
 */
function wTable(
  headers: string[],
  rows: string[][],
  headerBgHex: string,
  colWidthsDxa?: number[]
): string {
  const totalW = 14800;
  const widths =
    colWidthsDxa ?? headers.map(() => Math.floor(totalW / headers.length));

  const gridCols = widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('');

  const headerCells = headers
    .map(
      (h, idx) => `<w:tc>
      <w:tcPr>
        <w:tcW w:w="${widths[idx]}" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="${stripHash(headerBgHex)}"/>
        <w:tcMar>
          <w:top w:w="90" w:type="dxa"/>
          <w:bottom w:w="90" w:type="dxa"/>
          <w:left w:w="120" w:type="dxa"/>
          <w:right w:w="120" w:type="dxa"/>
        </w:tcMar>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <w:p>
        <w:pPr><w:bidi/><w:jc w:val="center"/><w:spacing w:before="40" w:after="40"/></w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
            <w:rtl/><w:b/><w:bCs/>
            <w:color w:val="FFFFFF"/>
            <w:sz w:val="20"/><w:szCs w:val="20"/>
          </w:rPr>
          <w:t xml:space="preserve">${xmlEsc(h)}</w:t>
        </w:r>
      </w:p>
    </w:tc>`
    )
    .join('');

  const bodyRows = rows
    .map((row, rowIdx) => {
      const bg = rowIdx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
      const cells = row
        .map(
          (cell, colIdx) => `<w:tc>
        <w:tcPr>
          <w:tcW w:w="${widths[colIdx]}" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>
          <w:tcMar>
            <w:top w:w="70" w:type="dxa"/>
            <w:bottom w:w="70" w:type="dxa"/>
            <w:left w:w="110" w:type="dxa"/>
            <w:right w:w="110" w:type="dxa"/>
          </w:tcMar>
          <w:vAlign w:val="center"/>
        </w:tcPr>
        <w:p>
          <w:pPr><w:bidi/><w:jc w:val="${colIdx === 0 ? 'center' : 'right'}"/><w:spacing w:before="30" w:after="30"/></w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
              <w:rtl/>
              ${colIdx === 0 ? '<w:b/><w:bCs/>' : ''}
              <w:color w:val="1E293B"/>
              <w:sz w:val="19"/><w:szCs w:val="19"/>
            </w:rPr>
            <w:t xml:space="preserve">${xmlEsc(cell)}</w:t>
          </w:r>
        </w:p>
      </w:tc>`
        )
        .join('');
      return `<w:tr>${cells}</w:tr>`;
    })
    .join('');

  return `<w:tbl>
    <w:tblPr>
      <w:bidiVisual/>
      <w:tblW w:w="${totalW}" w:type="dxa"/>
      <w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
        <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid>${gridCols}</w:tblGrid>
    <w:tr><w:trPr><w:tblHeader/></w:trPr>${headerCells}</w:tr>
    ${bodyRows}
  </w:tbl>`;
}

// ============================================================================
// NATIVE MICROSOFT WORD DRAWINGML (<wpg:wgp> + <wps:wsp>) EDITABLE SHAPES ENGINE
// Produces 100% native editable Word Shapes, Arrows with crisp Arrowheads,
// Rotated Ovals, Diamonds, Process Boxes, and Editable Arabic Textboxes.
// Also pairs every diagram with a properly-bounded VML <mc:Fallback> so arrows
// and shapes appear cleanly across Word 2010–365, WPS Office, and LibreOffice.
// ============================================================================

function buildTxbxParagraphs(
  text: string,
  colorHex: string,
  fontSizeHalfPt: number,
  bold = true,
  align: 'center' | 'right' = 'center',
  underline = false
): string {
  const lines = text.split('\n');
  return lines
    .map(
      (line) => `<w:p>
        <w:pPr>
          <w:bidi/>
          <w:jc w:val="${align}"/>
          <w:spacing w:before="0" w:after="0" w:line="220" w:lineRule="auto"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
            <w:rtl/>
            ${bold ? '<w:b/><w:bCs/>' : ''}
            ${underline ? '<w:u w:val="single"/>' : ''}
            <w:color w:val="${stripHash(colorHex)}"/>
            <w:sz w:val="${fontSizeHalfPt}"/>
            <w:szCs w:val="${fontSizeHalfPt}"/>
          </w:rPr>
          <w:t xml:space="preserve">${xmlEsc(line)}</w:t>
        </w:r>
      </w:p>`
    )
    .join('');
}

interface DrawingCtx {
  nextId: () => number;
  scaleEmu: number;
  padPx: number;
}

function toEmu(px: number, scaleEmu: number): number {
  return Math.max(0, Math.round(px * scaleEmu));
}

function toSizeEmu(px: number, scaleEmu: number): number {
  return Math.max(1270, Math.round(px * scaleEmu));
}

/**
 * Helper to create a native DrawingML <wps:wsp> shape with optional text, fill, stroke, and rotation.
 */
function dmlShape(opts: {
  id: number;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  prst: 'rect' | 'roundRect' | 'ellipse' | 'diamond';
  roundAdj?: number;
  rotDeg?: number;
  fillHex?: string | null;
  strokeHex?: string | null;
  strokePt?: number;
  text?: string;
  textColor?: string;
  textSizeHalfPt?: number;
  textBold?: boolean;
  textAlign?: 'center' | 'right';
  textUnderline?: boolean;
  topInsetEmu?: number;
  anchor?: 'ctr' | 't';
}): string {
  const {
    id,
    name,
    x,
    y,
    w,
    h,
    prst,
    roundAdj,
    rotDeg = 0,
    fillHex = '#FFFFFF',
    strokeHex = '#1D3C78',
    strokePt = 1.5,
    text,
    textColor = '#0F172A',
    textSizeHalfPt = 16,
    textBold = true,
    textAlign = 'center',
    textUnderline = false,
    topInsetEmu = 19050,
    anchor = 'ctr',
  } = opts;

  const normRot =
    rotDeg !== 0 ? Math.round((((rotDeg % 360) + 360) % 360) * 60000) : 0;
  const rotAttr = normRot !== 0 ? ` rot="${normRot}"` : '';

  const avLst =
    prst === 'roundRect' && roundAdj !== undefined
      ? `<a:avLst><a:gd name="adj" fmla="val ${roundAdj}"/></a:avLst>`
      : '<a:avLst/>';

  const fillXml = fillHex
    ? `<a:solidFill><a:srgbClr val="${stripHash(fillHex)}"/></a:solidFill>`
    : '<a:noFill/>';

  const lnW = Math.round(strokePt * 12700);
  const strokeXml = strokeHex
    ? `<a:ln w="${lnW}"><a:solidFill><a:srgbClr val="${stripHash(strokeHex)}"/></a:solidFill><a:round/></a:ln>`
    : '<a:ln><a:noFill/></a:ln>';

  const txbxXml =
    text !== undefined && text.length > 0
      ? `<wps:txbx>
          <w:txbxContent>
            ${buildTxbxParagraphs(
              text,
              textColor,
              textSizeHalfPt,
              textBold,
              textAlign,
              textUnderline
            )}
          </w:txbxContent>
        </wps:txbx>`
      : '';

  return `<wps:wsp>
    <wps:cNvPr id="${id}" name="${xmlEsc(name)}"/>
    <wps:cNvSpPr/>
    <wps:spPr>
      <a:xfrm${rotAttr}>
        <a:off x="${x}" y="${y}"/>
        <a:ext cx="${w}" cy="${h}"/>
      </a:xfrm>
      <a:prstGeom prst="${prst}">${avLst}</a:prstGeom>
      ${fillXml}
      ${strokeXml}
    </wps:spPr>
    ${txbxXml}
    <wps:bodyPr rot="0" spcFirstLastPara="0" vertOverflow="overflow" horzOverflow="overflow" vert="horz" wrap="square" lIns="25400" tIns="${topInsetEmu}" rIns="25400" bIns="19050" numCol="1" anchor="${anchor}" anchorCtr="0">
      <a:noAutofit/>
    </wps:bodyPr>
  </wps:wsp>`;
}

/**
 * Creates a native DrawingML <wps:wsp> custom-geometry polyline/arrow with guaranteed
 * positive bounding box (even for strictly horizontal or strictly vertical arrows!)
 * and crisp triangular arrowheads.
 */
function dmlPolylineArrow(opts: {
  id: number;
  name: string;
  waypoints: [number, number][];
  ctx: DrawingCtx;
  strokeHex: string;
  strokePt: number;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  thinHead?: boolean;
  dashed?: boolean;
}): string {
  const {
    id,
    name,
    waypoints,
    ctx,
    strokeHex,
    strokePt,
    arrowStart = false,
    arrowEnd = true,
    thinHead = false,
    dashed = false,
  } = opts;

  if (waypoints.length < 2) return '';

  const shifted = waypoints.map(([px, py]) => [px + ctx.padPx, py + ctx.padPx] as [number, number]);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of shifted) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }

  // Always pad bounding box by 12px on all sides so horizontal/vertical lines NEVER have 0 width or 0 height!
  const margin = 12;
  const bx = Math.max(0, minX - margin);
  const by = Math.max(0, minY - margin);
  const bw = Math.max(24, maxX - minX + margin * 2);
  const bh = Math.max(24, maxY - minY + margin * 2);

  const offX = toEmu(bx, ctx.scaleEmu);
  const offY = toEmu(by, ctx.scaleEmu);
  const extCx = toSizeEmu(bw, ctx.scaleEmu);
  const extCy = toSizeEmu(bh, ctx.scaleEmu);

  // Use high-precision integer coordinate space for <a:path> (10x px)
  const pathScale = 10;
  const pathW = Math.max(100, Math.round(bw * pathScale));
  const pathH = Math.max(100, Math.round(bh * pathScale));

  const cmds = shifted
    .map(([px, py], idx) => {
      const lx = Math.round((px - bx) * pathScale);
      const ly = Math.round((py - by) * pathScale);
      return idx === 0
        ? `<a:moveTo><a:pt x="${lx}" y="${ly}"/></a:moveTo>`
        : `<a:lnTo><a:pt x="${lx}" y="${ly}"/></a:lnTo>`;
    })
    .join('');

  const lnW = Math.round(strokePt * 12700);
  const headW = thinHead ? 'sm' : 'med';
  const headLen = thinHead ? 'sm' : 'med';

  const dashXml = dashed ? '<a:prstDash val="dash"/>' : '';
  const headEndXml = arrowStart
    ? `<a:headEnd type="triangle" w="${headW}" len="${headLen}"/>`
    : '';
  const tailEndXml = arrowEnd
    ? `<a:tailEnd type="triangle" w="${headW}" len="${headLen}"/>`
    : '';

  return `<wps:wsp>
    <wps:cNvPr id="${id}" name="${xmlEsc(name)}"/>
    <wps:cNvSpPr/>
    <wps:spPr>
      <a:xfrm>
        <a:off x="${offX}" y="${offY}"/>
        <a:ext cx="${extCx}" cy="${extCy}"/>
      </a:xfrm>
      <a:custGeom>
        <a:avLst/>
        <a:gdLst/>
        <a:ahLst/>
        <a:cxnLst/>
        <a:rect l="l" t="t" r="r" b="b"/>
        <a:pathLst>
          <a:path w="${pathW}" h="${pathH}" fill="none">
            ${cmds}
          </a:path>
        </a:pathLst>
      </a:custGeom>
      <a:noFill/>
      <a:ln w="${lnW}" cap="flat" cmpd="sng" algn="ctr">
        <a:solidFill><a:srgbClr val="${stripHash(strokeHex)}"/></a:solidFill>
        ${dashXml}
        <a:round/>
        ${headEndXml}
        ${tailEndXml}
      </a:ln>
    </wps:spPr>
    <wps:bodyPr/>
  </wps:wsp>`;
}

/**
 * Converts a DiagramNode to native DrawingML <wps:wsp> shape(s)
 */
function nodeToDrawingML(
  node: DiagramNode,
  theme: DiagramTheme,
  ctx: DrawingCtx
): string {
  const x = toEmu(node.x + ctx.padPx, ctx.scaleEmu);
  const y = toEmu(node.y + ctx.padPx, ctx.scaleEmu);
  const w = toSizeEmu(node.w, ctx.scaleEmu);
  const h = toSizeEmu(node.h, ctx.scaleEmu);

  if (node.type === 'process') {
    const headerHPx = 30;
    const headerHEmu = toSizeEmu(headerHPx, ctx.scaleEmu);
    const bodyFont = node.code === '0' ? 20 : 16;

    const bodyShape = dmlShape({
      id: ctx.nextId(),
      name: `Process_${node.id}`,
      x,
      y,
      w,
      h,
      prst: 'roundRect',
      roundAdj: 10000,
      fillHex: theme.processBodyFill,
      strokeHex: theme.processBorder,
      strokePt: 1.5,
      text: node.label,
      textColor: theme.processBodyText,
      textSizeHalfPt: bodyFont,
      textBold: true,
      topInsetEmu: headerHEmu + 12700,
      anchor: 'ctr',
    });

    const headerShape = dmlShape({
      id: ctx.nextId(),
      name: `ProcessHdr_${node.id}`,
      x,
      y,
      w,
      h: headerHEmu,
      prst: 'rect',
      fillHex: theme.processHeaderFill,
      strokeHex: theme.processBorder,
      strokePt: 1.25,
      text: node.code ?? '',
      textColor: theme.processHeaderText,
      textSizeHalfPt: 16,
      textBold: true,
      topInsetEmu: 9525,
      anchor: 'ctr',
    });

    return bodyShape + headerShape;
  }

  if (node.type === 'entity') {
    return dmlShape({
      id: ctx.nextId(),
      name: `Entity_${node.id}`,
      x,
      y,
      w,
      h,
      prst: 'rect',
      fillHex: theme.entityFill,
      strokeHex: theme.entityBorder,
      strokePt: 1.75,
      text: node.label,
      textColor: theme.entityText,
      textSizeHalfPt: 18,
      textBold: true,
    });
  }

  if (node.type === 'datastore') {
    const codeWPx = 54;
    const bodyWPx = node.w - codeWPx;
    const bodyWEmu = toSizeEmu(bodyWPx, ctx.scaleEmu);
    const codeWEmu = toSizeEmu(codeWPx, ctx.scaleEmu);
    const codeXEmu = toEmu(node.x + bodyWPx + ctx.padPx, ctx.scaleEmu);

    const bodyBg = dmlShape({
      id: ctx.nextId(),
      name: `DS_Body_${node.id}`,
      x,
      y,
      w: bodyWEmu,
      h,
      prst: 'rect',
      fillHex: theme.datastoreBodyFill,
      strokeHex: null,
      text: node.label,
      textColor: theme.datastoreBodyText,
      textSizeHalfPt: 15,
      textBold: true,
    });

    const codeBox = dmlShape({
      id: ctx.nextId(),
      name: `DS_Code_${node.id}`,
      x: codeXEmu,
      y,
      w: codeWEmu,
      h,
      prst: 'rect',
      fillHex: theme.datastoreCodeFill,
      strokeHex: theme.datastoreBorder,
      strokePt: 1.4,
      text: node.code ?? '',
      textColor: theme.datastoreCodeText,
      textSizeHalfPt: 16,
      textBold: true,
    });

    // Open-ended Gane & Sarson 3-sided border
    const frameLine = dmlPolylineArrow({
      id: ctx.nextId(),
      name: `DS_Frame_${node.id}`,
      waypoints: [
        [node.x, node.y],
        [node.x + node.w, node.y],
        [node.x + node.w, node.y + node.h],
        [node.x, node.y + node.h],
      ],
      ctx,
      strokeHex: theme.datastoreBorder,
      strokePt: 1.5,
      arrowStart: false,
      arrowEnd: false,
    });

    return bodyBg + codeBox + frameLine;
  }

  if (node.type === 'erd_chen_entity') {
    return dmlShape({
      id: ctx.nextId(),
      name: `ERD_Entity_${node.id}`,
      x,
      y,
      w,
      h,
      prst: 'roundRect',
      roundAdj: 7000,
      fillHex: '#FFFFFF',
      strokeHex: theme.erdBorder,
      strokePt: 1.6,
      text: node.label,
      textColor: theme.processBodyText,
      textSizeHalfPt: 17,
      textBold: true,
    });
  }

  if (node.type === 'erd_chen_relation') {
    return dmlShape({
      id: ctx.nextId(),
      name: `ERD_Rel_${node.id}`,
      x,
      y,
      w,
      h,
      prst: 'diamond',
      fillHex: '#FFFFFF',
      strokeHex: theme.erdBorder,
      strokePt: 1.6,
      text: node.label,
      textColor: theme.processBodyText,
      textSizeHalfPt: 15,
      textBold: true,
    });
  }

  if (node.type === 'erd_attr') {
    return dmlShape({
      id: ctx.nextId(),
      name: `ERD_Attr_${node.id}`,
      x,
      y,
      w,
      h,
      prst: 'ellipse',
      rotDeg: node.rotation ?? 0,
      fillHex: '#FFFFFF',
      strokeHex: node.isPk ? theme.erdBorder : '#475569',
      strokePt: node.isPk ? 1.4 : 1.0,
      text: node.label,
      textColor: node.isPk ? theme.titleColor : theme.processBodyText,
      textSizeHalfPt: 13,
      textBold: true,
      textUnderline: Boolean(node.isPk),
      topInsetEmu: 6350,
    });
  }

  if (node.type === 'erd_entity') {
    const headerHPx = 38;
    const headerHEmu = toSizeEmu(headerHPx, ctx.scaleEmu);
    const attrText = (node.attributes ?? [])
      .map((a) => (a.key ? `[${a.key}] ${a.name}` : a.name))
      .join('\n');

    const body = dmlShape({
      id: ctx.nextId(),
      name: `ERD_Body_${node.id}`,
      x,
      y: toEmu(node.y + headerHPx + ctx.padPx, ctx.scaleEmu),
      w,
      h: toSizeEmu(node.h - headerHPx, ctx.scaleEmu),
      prst: 'rect',
      fillHex: theme.erdBodyFill,
      strokeHex: theme.erdBorder,
      strokePt: 1.4,
      text: attrText,
      textColor: theme.erdBodyText,
      textSizeHalfPt: 14,
      textBold: false,
      textAlign: 'right',
    });

    const hdr = dmlShape({
      id: ctx.nextId(),
      name: `ERD_Hdr_${node.id}`,
      x,
      y,
      w,
      h: headerHEmu,
      prst: 'rect',
      fillHex: theme.erdHeaderFill,
      strokeHex: theme.erdBorder,
      strokePt: 1.4,
      text: node.label,
      textColor: theme.erdHeaderText,
      textSizeHalfPt: 16,
      textBold: true,
    });

    return body + hdr;
  }

  // erd_relation
  return dmlShape({
    id: ctx.nextId(),
    name: `Rel_${node.id}`,
    x,
    y,
    w,
    h,
    prst: 'diamond',
    fillHex: theme.erdRelationFill,
    strokeHex: theme.erdRelationBorder,
    strokePt: 1.5,
    text: node.label,
    textColor: theme.erdRelationText,
    textSizeHalfPt: 15,
    textBold: true,
  });
}

/**
 * Converts a DiagramEdge to native DrawingML <wps:wsp> arrow + label box + cardinality boxes
 */
function edgeToDrawingML(
  edge: DiagramEdge,
  theme: DiagramTheme,
  ctx: DrawingCtx
): string {
  const arrowXml = dmlPolylineArrow({
    id: ctx.nextId(),
    name: `Flow_${edge.id}`,
    waypoints: edge.waypoints,
    ctx,
    strokeHex: edge.thinAttrArrow ? '#475569' : theme.edgeStroke,
    strokePt: edge.thinAttrArrow ? 0.95 : 1.35,
    arrowStart: edge.arrowStart === true,
    arrowEnd: edge.arrowEnd !== false,
    thinHead: Boolean(edge.thinAttrArrow),
    dashed: Boolean(edge.dashed),
  });

  let labelXml = '';
  if (edge.label && edge.label.trim().length > 0) {
    const lines = edge.label.split('\n');
    const maxChars = Math.max(...lines.map((l) => l.length));
    const bw = edge.labelWidth ?? Math.max(82, maxChars * 7 + 16);
    const bh = lines.length === 1 ? 26 : lines.length * 20 + 10;
    const lx = edge.labelPos[0] - bw / 2;
    const ly = edge.labelPos[1] - bh / 2;

    labelXml = dmlShape({
      id: ctx.nextId(),
      name: `FlowLbl_${edge.id}`,
      x: toEmu(lx + ctx.padPx, ctx.scaleEmu),
      y: toEmu(ly + ctx.padPx, ctx.scaleEmu),
      w: toSizeEmu(bw, ctx.scaleEmu),
      h: toSizeEmu(bh, ctx.scaleEmu),
      prst: 'roundRect',
      roundAdj: 12000,
      fillHex: theme.edgeLabelBg,
      strokeHex: theme.edgeLabelBorder,
      strokePt: 0.65,
      text: edge.label,
      textColor: theme.edgeLabelText,
      textSizeHalfPt: 13,
      textBold: true,
      topInsetEmu: 6350,
    });
  }

  let cardXml = '';
  if (edge.boxedCardinality && edge.cardinalityStart && edge.cardinalityStartPos) {
    const [cx, cy] = edge.cardinalityStartPos;
    cardXml += dmlShape({
      id: ctx.nextId(),
      name: `CardS_${edge.id}`,
      x: toEmu(cx - 11 + ctx.padPx, ctx.scaleEmu),
      y: toEmu(cy - 11 + ctx.padPx, ctx.scaleEmu),
      w: toSizeEmu(22, ctx.scaleEmu),
      h: toSizeEmu(22, ctx.scaleEmu),
      prst: 'rect',
      fillHex: '#FFFFFF',
      strokeHex: theme.erdBorder,
      strokePt: 1.0,
      text: edge.cardinalityStart,
      textColor: theme.processBodyText,
      textSizeHalfPt: 14,
      textBold: true,
      topInsetEmu: 3000,
    });
  }
  if (edge.boxedCardinality && edge.cardinalityEnd && edge.cardinalityEndPos) {
    const [cx, cy] = edge.cardinalityEndPos;
    cardXml += dmlShape({
      id: ctx.nextId(),
      name: `CardE_${edge.id}`,
      x: toEmu(cx - 11 + ctx.padPx, ctx.scaleEmu),
      y: toEmu(cy - 11 + ctx.padPx, ctx.scaleEmu),
      w: toSizeEmu(22, ctx.scaleEmu),
      h: toSizeEmu(22, ctx.scaleEmu),
      prst: 'rect',
      fillHex: '#FFFFFF',
      strokeHex: theme.erdBorder,
      strokePt: 1.0,
      text: edge.cardinalityEnd,
      textColor: theme.processBodyText,
      textSizeHalfPt: 14,
      textBold: true,
      topInsetEmu: 3000,
    });
  }

  return arrowXml + labelXml + cardXml;
}

// ============================================================================
// FIXED VML FALLBACK (properly bounded <v:shape path="m ... l ... e"> arrows)
// ============================================================================

function vmlTextboxContent(
  text: string,
  colorHex: string,
  fontSizeHalfPt: number,
  bold = true,
  align: 'center' | 'right' = 'center',
  underline = false
): string {
  return `<v:textbox inset="2pt,2pt,2pt,2pt" style="mso-fit-shape-to-text:f">
    <w:txbxContent>${buildTxbxParagraphs(
      text,
      colorHex,
      fontSizeHalfPt,
      bold,
      align,
      underline
    )}</w:txbxContent>
  </v:textbox>`;
}

function vmlBoundedPathShape(opts: {
  id: string;
  waypoints: [number, number][];
  padPx: number;
  strokeHex: string;
  strokePt: number;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  dashed?: boolean;
}): string {
  const {
    id,
    waypoints,
    padPx,
    strokeHex,
    strokePt,
    arrowStart = false,
    arrowEnd = true,
    dashed = false,
  } = opts;
  if (waypoints.length < 2) return '';

  const shifted = waypoints.map(([px, py]) => [px + padPx, py + padPx]);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of shifted) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }

  const margin = 12;
  const bx = Math.max(0, Math.round(minX - margin));
  const by = Math.max(0, Math.round(minY - margin));
  const bw = Math.max(24, Math.round(maxX - minX + margin * 2));
  const bh = Math.max(24, Math.round(maxY - minY + margin * 2));

  const pathCmds = shifted
    .map(([px, py], idx) => {
      const lx = Math.round(px - bx);
      const ly = Math.round(py - by);
      return idx === 0 ? `m ${lx},${ly}` : `l ${lx},${ly}`;
    })
    .join(' ');

  const endAttr = arrowEnd ? ' endarrow="classic"' : '';
  const startAttr = arrowStart ? ' startarrow="classic"' : '';
  const dashAttr = dashed ? ' dashstyle="dash"' : '';

  return `<v:shape id="${id}" coordorigin="0,0" coordsize="${bw},${bh}" path="${pathCmds} e" style="position:absolute;left:${bx};top:${by};width:${bw};height:${bh}" filled="f" strokecolor="${strokeHex}" strokeweight="${strokePt}pt">
    <v:stroke joinstyle="round"${startAttr}${endAttr}${dashAttr}/>
  </v:shape>`;
}

function nodeToVmlFallback(
  node: DiagramNode,
  theme: DiagramTheme,
  prefix: string,
  padPx: number
): string {
  const idBase = `${prefix}_${node.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const x = Math.round(node.x + padPx);
  const y = Math.round(node.y + padPx);
  const w = Math.round(node.w);
  const h = Math.round(node.h);

  if (node.type === 'process') {
    const headerH = 30;
    return `
      <v:roundrect id="${idBase}_b" arcsize="6554f" style="position:absolute;left:${x};top:${y};width:${w};height:${h}" fillcolor="${theme.processBodyFill}" strokecolor="${theme.processBorder}" strokeweight="1.5pt">
        <v:textbox inset="4pt,18pt,4pt,4pt"><w:txbxContent>${buildTxbxParagraphs(node.label, theme.processBodyText, 16, true, 'center')}</w:txbxContent></v:textbox>
      </v:roundrect>
      <v:rect id="${idBase}_h" style="position:absolute;left:${x};top:${y};width:${w};height:${headerH}" fillcolor="${theme.processHeaderFill}" strokecolor="${theme.processBorder}" strokeweight="1.25pt">
        ${vmlTextboxContent(node.code ?? '', theme.processHeaderText, 16, true, 'center')}
      </v:rect>`;
  }

  if (node.type === 'entity') {
    return `<v:rect id="${idBase}" style="position:absolute;left:${x};top:${y};width:${w};height:${h}" fillcolor="${theme.entityFill}" strokecolor="${theme.entityBorder}" strokeweight="1.6pt">
      ${vmlTextboxContent(node.label, theme.entityText, 17, true, 'center')}
    </v:rect>`;
  }

  if (node.type === 'datastore') {
    const codeW = 54;
    const bodyW = w - codeW;
    return `
      <v:rect id="${idBase}_bg" style="position:absolute;left:${x};top:${y};width:${bodyW};height:${h}" fillcolor="${theme.datastoreBodyFill}" stroked="f">
        ${vmlTextboxContent(node.label, theme.datastoreBodyText, 15, true, 'center')}
      </v:rect>
      <v:rect id="${idBase}_cd" style="position:absolute;left:${x + bodyW};top:${y};width:${codeW};height:${h}" fillcolor="${theme.datastoreCodeFill}" strokecolor="${theme.datastoreBorder}" strokeweight="1.4pt">
        ${vmlTextboxContent(node.code ?? '', theme.datastoreCodeText, 16, true, 'center')}
      </v:rect>
      ${vmlBoundedPathShape({
        id: `${idBase}_fr`,
        waypoints: [
          [node.x, node.y],
          [node.x + node.w, node.y],
          [node.x + node.w, node.y + node.h],
          [node.x, node.y + node.h],
        ],
        padPx,
        strokeHex: theme.datastoreBorder,
        strokePt: 1.5,
        arrowStart: false,
        arrowEnd: false,
      })}`;
  }

  if (node.type === 'erd_chen_entity') {
    return `<v:roundrect id="${idBase}" arcsize="4000f" style="position:absolute;left:${x};top:${y};width:${w};height:${h}" fillcolor="#FFFFFF" strokecolor="${theme.erdBorder}" strokeweight="1.5pt">
      ${vmlTextboxContent(node.label, theme.processBodyText, 17, true, 'center')}
    </v:roundrect>`;
  }

  if (node.type === 'erd_chen_relation') {
    return `<v:shape id="${idBase}" coordsize="100,100" path="m 50,0 l 100,50 l 50,100 l 0,50 x e" style="position:absolute;left:${x};top:${y};width:${w};height:${h}" fillcolor="#FFFFFF" strokecolor="${theme.erdBorder}" strokeweight="1.5pt">
      ${vmlTextboxContent(node.label, theme.processBodyText, 15, true, 'center')}
    </v:shape>`;
  }

  if (node.type === 'erd_attr') {
    const rot = node.rotation ?? 0;
    return `<v:oval id="${idBase}" style="position:absolute;left:${x};top:${y};width:${w};height:${h};rotation:${rot}" fillcolor="#FFFFFF" strokecolor="${node.isPk ? theme.erdBorder : '#475569'}" strokeweight="${node.isPk ? '1.3' : '0.9'}pt">
      ${vmlTextboxContent(node.label, node.isPk ? theme.titleColor : theme.processBodyText, 13, true, 'center', Boolean(node.isPk))}
    </v:oval>`;
  }

  return `<v:rect id="${idBase}" style="position:absolute;left:${x};top:${y};width:${w};height:${h}" fillcolor="#FFFFFF" strokecolor="${theme.erdBorder}" strokeweight="1.5pt">
    ${vmlTextboxContent(node.label, theme.processBodyText, 15, true, 'center')}
  </v:rect>`;
}

function edgeToVmlFallback(
  edge: DiagramEdge,
  theme: DiagramTheme,
  prefix: string,
  padPx: number
): string {
  const idBase = `${prefix}_${edge.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const arrowXml = vmlBoundedPathShape({
    id: `${idBase}_ln`,
    waypoints: edge.waypoints,
    padPx,
    strokeHex: edge.thinAttrArrow ? '#475569' : theme.edgeStroke,
    strokePt: edge.thinAttrArrow ? 0.9 : 1.25,
    arrowStart: edge.arrowStart === true,
    arrowEnd: edge.arrowEnd !== false,
    dashed: Boolean(edge.dashed),
  });

  let labelXml = '';
  if (edge.label && edge.label.trim().length > 0) {
    const lines = edge.label.split('\n');
    const maxChars = Math.max(...lines.map((l) => l.length));
    const bw = Math.round(edge.labelWidth ?? Math.max(82, maxChars * 7 + 16));
    const bh = lines.length === 1 ? 26 : lines.length * 20 + 10;
    const lx = Math.round(edge.labelPos[0] - bw / 2 + padPx);
    const ly = Math.round(edge.labelPos[1] - bh / 2 + padPx);
    labelXml = `<v:rect id="${idBase}_lb" style="position:absolute;left:${lx};top:${ly};width:${bw};height:${bh}" fillcolor="${theme.edgeLabelBg}" strokecolor="${theme.edgeLabelBorder}" strokeweight="0.5pt">
      ${vmlTextboxContent(edge.label, theme.edgeLabelText, 13, true, 'center')}
    </v:rect>`;
  }

  let cardXml = '';
  if (edge.boxedCardinality && edge.cardinalityStart && edge.cardinalityStartPos) {
    const [cx, cy] = edge.cardinalityStartPos;
    cardXml += `<v:rect id="${idBase}_cs" style="position:absolute;left:${Math.round(cx - 11 + padPx)};top:${Math.round(cy - 11 + padPx)};width:22;height:22" fillcolor="#FFFFFF" strokecolor="${theme.erdBorder}" strokeweight="1pt">
      ${vmlTextboxContent(edge.cardinalityStart, theme.processBodyText, 14, true, 'center')}
    </v:rect>`;
  }
  if (edge.boxedCardinality && edge.cardinalityEnd && edge.cardinalityEndPos) {
    const [cx, cy] = edge.cardinalityEndPos;
    cardXml += `<v:rect id="${idBase}_ce" style="position:absolute;left:${Math.round(cx - 11 + padPx)};top:${Math.round(cy - 11 + padPx)};width:22;height:22" fillcolor="#FFFFFF" strokecolor="${theme.erdBorder}" strokeweight="1pt">
      ${vmlTextboxContent(edge.cardinalityEnd, theme.processBodyText, 14, true, 'center')}
    </v:rect>`;
  }

  return arrowXml + labelXml + cardXml;
}

/**
 * Generates an Editable Native Microsoft Word Diagram Paragraph using:
 * - Primary (<mc:Choice Requires="wpg">): Modern DrawingML Group (<wpg:wgp>) of <wps:wsp> editable shapes & arrows
 * - Fallback (<mc:Fallback>): Properly-bounded VML <v:group> for legacy editors
 */
function diagramToEditableWordParagraph(
  diagram: DiagramSpec,
  theme: DiagramTheme,
  diagramIdx: number,
  nextId: () => number
): string {
  const padPx = 24;
  const totalPxW = diagram.width + padPx * 2;
  const totalPxH = diagram.height + padPx * 2;

  // Landscape A4 inner page box: 10.45 in x 6.65 in -> 9,555,480 x 6,080,760 EMU
  const maxEmuW = 9555480;
  const maxEmuH = 6080760;
  const scaleEmu = Math.min(maxEmuW / totalPxW, maxEmuH / totalPxH);

  const grpCx = Math.round(totalPxW * scaleEmu);
  const grpCy = Math.round(totalPxH * scaleEmu);
  const dispPtW = (grpCx / 12700).toFixed(1);
  const dispPtH = (grpCy / 12700).toFixed(1);

  const ctx: DrawingCtx = { nextId, scaleEmu, padPx };

  // Outer clean border frame (transparent fill so users can click directly on any shape/arrow inside Word!)
  const bgFrameDml = dmlShape({
    id: ctx.nextId(),
    name: `Frame_${diagram.id}`,
    x: 0,
    y: 0,
    w: grpCx,
    h: grpCy,
    prst: 'roundRect',
    roundAdj: 1500,
    fillHex: null,
    strokeHex: theme.frameBorder,
    strokePt: 0.9,
  });

  // Edges first, then Nodes on top (identical layering to SVG!)
  const edgesDml = diagram.edges
    .map((e) => edgeToDrawingML(e, theme, ctx))
    .join('');
  const nodesDml = diagram.nodes
    .map((n) => nodeToDrawingML(n, theme, ctx))
    .join('');

  const docPrId = ctx.nextId();
  const drawingMlBlock = `<w:drawing>
    <wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="${grpCx}" cy="${grpCy}"/>
      <wp:effectExtent l="0" t="0" r="0" b="0"/>
      <wp:docPr id="${docPrId}" name="${xmlEsc(diagram.figureNumber)}"/>
      <wp:cNvGraphicFramePr/>
      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup">
          <wpg:wgp xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup">
            <wpg:cNvGrpSpPr/>
            <wpg:grpSpPr>
              <a:xfrm>
                <a:off x="0" y="0"/>
                <a:ext cx="${grpCx}" cy="${grpCy}"/>
                <a:chOff x="0" y="0"/>
                <a:chExt cx="${grpCx}" cy="${grpCy}"/>
              </a:xfrm>
            </wpg:grpSpPr>
            ${bgFrameDml}
            ${edgesDml}
            ${nodesDml}
          </wpg:wgp>
        </a:graphicData>
      </a:graphic>
    </wp:inline>
  </w:drawing>`;

  const prefix = `d${diagramIdx}`;
  const edgesVml = diagram.edges
    .map((e) => edgeToVmlFallback(e, theme, prefix, padPx))
    .join('');
  const nodesVml = diagram.nodes
    .map((n) => nodeToVmlFallback(n, theme, prefix, padPx))
    .join('');

  const vmlFallbackBlock = `<w:pict>
    <v:group id="grp_${prefix}" style="width:${dispPtW}pt;height:${dispPtH}pt" coordorigin="0,0" coordsize="${totalPxW},${totalPxH}">
      <v:rect id="${prefix}_frame" style="position:absolute;left:0;top:0;width:${totalPxW};height:${totalPxH}" fillcolor="${theme.canvasBg}" strokecolor="${theme.frameBorder}" strokeweight="0.9pt"/>
      ${edgesVml}
      ${nodesVml}
    </v:group>
  </w:pict>`;

  return `<w:p>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="60" w:after="60"/>
    </w:pPr>
    <w:r>
      <mc:AlternateContent>
        <mc:Choice Requires="wpg">
          ${drawingMlBlock}
        </mc:Choice>
        <mc:Fallback>
          ${vmlFallbackBlock}
        </mc:Fallback>
      </mc:AlternateContent>
    </w:r>
  </w:p>`;
}

/**
 * Generates a DrawingML <w:drawing> paragraph for an embedded high-DPI PNG image
 */
function imageToDrawingParagraph(
  relId: string,
  imgW: number,
  imgH: number,
  docPrId: number,
  title: string
): string {
  const maxCx = 9450000;
  const maxCy = 5950000;
  const aspect = imgW / imgH;
  let cx = maxCx;
  let cy = Math.round(cx / aspect);
  if (cy > maxCy) {
    cy = maxCy;
    cx = Math.round(cy * aspect);
  }

  return `<w:p>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="80" w:after="80"/>
    </w:pPr>
    <w:r>
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="${cx}" cy="${cy}"/>
          <wp:effectExtent l="0" t="0" r="0" b="0"/>
          <wp:docPr id="${docPrId}" name="${xmlEsc(title)}"/>
          <wp:cNvGraphicFramePr>
            <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
          </wp:cNvGraphicFramePr>
          <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:nvPicPr>
                  <pic:cNvPr id="${docPrId}" name="${xmlEsc(title)}.png"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${relId}"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm>
                    <a:off x="0" y="0"/>
                    <a:ext cx="${cx}" cy="${cy}"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p>`;
}

function buildDiagramSpecTable(diagram: DiagramSpec, theme: DiagramTheme): string {
  const nodeMap = new Map(diagram.nodes.map((n) => [n.id, n]));

  if (diagram.category === 'erd') {
    const entities = diagram.nodes.filter(
      (n) => n.type === 'erd_entity' || n.type === 'erd_chen_entity'
    );
    const rows = entities.map((e, i) => {
      if (e.attributes && e.attributes.length > 0) {
        return [
          String(i + 1),
          e.label,
          e.attributes
            .map((a) => (a.key ? `${a.name} (${a.key})` : a.name))
            .join(' ، '),
        ];
      }
      const linkedAttrs = diagram.edges
        .filter((ed) => ed.from === e.id && ed.thinAttrArrow)
        .map((ed) => nodeMap.get(ed.to))
        .filter((n): n is DiagramNode => Boolean(n))
        .map((a) => (a.isPk ? `${a.label} (PK)` : a.label));
      return [String(i + 1), e.label, linkedAttrs.join(' ، ')];
    });
    return wTable(
      ['م', 'الكينونة (Entity)', 'الصفات والمفتاح الأساسي (PK)'],
      rows,
      theme.processHeaderFill,
      [900, 4200, 9700]
    );
  }

  const rows = diagram.edges
    .filter((e) => e.label.trim().length > 0)
    .map((e, idx) => {
      const fromNode = nodeMap.get(e.from);
      const toNode = nodeMap.get(e.to);
      const fromName = fromNode
        ? `${fromNode.code ? `[${fromNode.code}] ` : ''}${fromNode.label.replace(/\n/g, ' ')}`
        : e.from;
      const toName = toNode
        ? `${toNode.code ? `[${toNode.code}] ` : ''}${toNode.label.replace(/\n/g, ' ')}`
        : e.to;
      const dir =
        e.arrowStart && e.arrowEnd !== false ? 'ثنائي الاتجاه' : 'أحادي الاتجاه';
      return [String(idx + 1), fromName, toName, e.label.replace(/\n/g, ' '), dir];
    });

  return wTable(
    ['م', 'المصدر', 'الوجهة', 'تدفق البيانات', 'الاتجاه'],
    rows,
    theme.processHeaderFill,
    [800, 3400, 3400, 5200, 2000]
  );
}

async function generateDocxBlob(
  diagrams: DiagramSpec[],
  theme: DiagramTheme,
  options: Omit<WordExportOptions, 'selectedDiagramIds'>,
  isFullBook: boolean
): Promise<Blob> {
  const zip = new JSZip();
  const relsEntries: string[] = [];
  let mediaCounter = 0;
  let idCounter = 100;
  const nextId = () => {
    idCounter += 1;
    return idCounter;
  };

  const bodyChunks: string[] = [];

  if (isFullBook) {
    bodyChunks.push(
      wParagraph('الفصل الثالث: الدراسة التفصيلية (التحليل)', {
        sizeHalfPt: 40,
        bold: true,
        color: theme.titleColor,
        align: 'center',
        spaceBefore: 120,
        spaceAfter: 80,
      })
    );
    bodyChunks.push(
      wParagraph('القسم 3.4: مخططات تدفق البيانات (DFD) ومخطط الكينونات والعلاقات (ERD)', {
        sizeHalfPt: 30,
        bold: true,
        color: '1E293B',
        align: 'center',
        spaceBefore: 40,
        spaceAfter: 140,
      })
    );
    bodyChunks.push(
      wParagraph(
        'مشروع التخرج: منصة جدولة النشر على فيسبوك وإدارة المحتوى التسويقي بمساعدة الذكاء الاصطناعي',
        {
          sizeHalfPt: 26,
          bold: true,
          color: '334155',
          align: 'center',
          spaceBefore: 20,
          spaceAfter: 200,
        }
      )
    );

    if (options.includeAcademicProse) {
      bodyChunks.push(
        wParagraph(
          'يستعرض هذا المستند الحزمة التحليلية الكاملة لمخططات الفصل الثالث وفق منهجية (Gane & Sarson) المعتمدة ونموذج تشين (Chen ERD)، حيث تم بناء جميع المربعات والأسهم والأشكال البيضاوية والمعينات كأشكال وورد أصلية (DrawingML Shapes) قابلة للنقر والتعديل وفك التجميع مباشرة داخل Microsoft Word.',
          {
            sizeHalfPt: 23,
            align: 'both',
            spaceBefore: 40,
            spaceAfter: 180,
          }
        )
      );
    }

    bodyChunks.push(
      wParagraph('فهرس الأشكال والمخططات المضمّنة', {
        sizeHalfPt: 28,
        bold: true,
        color: theme.titleColor,
        align: 'right',
        spaceBefore: 100,
        spaceAfter: 100,
      })
    );

    bodyChunks.push(
      wTable(
        ['رقم الشكل', 'التصنيف', 'عنوان المخطط', 'المتطلبات المغطاة'],
        diagrams.map((d) => [
          d.figureNumber,
          d.categoryLabel,
          d.title,
          `${d.urIds.join('، ')} | ${d.frIds.slice(0, 4).join('، ')}${d.frIds.length > 4 ? '...' : ''}`,
        ]),
        theme.processHeaderFill,
        [1800, 2600, 7000, 3400]
      )
    );

    if (options.includeTables) {
      bodyChunks.push(
        wParagraph('جدول مخازن البيانات الرئيسية في النظام (D1 – D8)', {
          sizeHalfPt: 26,
          bold: true,
          color: theme.titleColor,
          align: 'right',
          spaceBefore: 220,
          spaceAfter: 100,
        })
      );
      bodyChunks.push(
        wTable(
          ['الرمز', 'اسم مخزن البيانات', 'الوصف والبيانات المخزّنة'],
          DATA_STORES_CATALOG.map((ds) => [ds.code, ds.name, ds.description]),
          theme.processHeaderFill,
          [1400, 4200, 9200]
        )
      );
    }
  }

  for (let i = 0; i < diagrams.length; i++) {
    const diagram = diagrams[i];
    const breakPage = isFullBook || i > 0;

    bodyChunks.push(
      wParagraph(`${diagram.sectionNumber} ${diagram.title}`, {
        sizeHalfPt: 26,
        bold: true,
        color: theme.titleColor,
        align: 'right',
        spaceBefore: 30,
        spaceAfter: 50,
        pageBreakBefore: breakPage,
      })
    );

    if (options.includeAcademicProse) {
      bodyChunks.push(
        wParagraph(diagram.description, {
          sizeHalfPt: 20,
          color: '334155',
          align: 'both',
          spaceBefore: 10,
          spaceAfter: 80,
        })
      );
    }

    if (options.mode === 'editable-shapes' || options.mode === 'combined') {
      if (options.mode === 'combined') {
        bodyChunks.push(
          wParagraph(
            'أولاً: نسخة أشكال وورد الأصلية القابلة للتعديل المباشر (انقر مرتين على أي مربع أو سهم للتعديل أو اختر فك التجميع):',
            {
              sizeHalfPt: 19,
              bold: true,
              color: '475569',
              align: 'right',
              spaceBefore: 30,
              spaceAfter: 30,
            }
          )
        );
      }
      bodyChunks.push(
        diagramToEditableWordParagraph(diagram, theme, i + 1, nextId)
      );
      bodyChunks.push(
        wParagraph(`${diagram.figureNumber}: ${diagram.title}`, {
          sizeHalfPt: 22,
          bold: true,
          color: theme.captionColor,
          align: 'center',
          spaceBefore: 40,
          spaceAfter: 100,
        })
      );
    }

    if (options.mode === 'high-res-image' || options.mode === 'combined') {
      if (options.mode === 'combined') {
        bodyChunks.push(
          wParagraph('ثانياً: نسخة الطباعة عالية الدقة (PNG 300 DPI):', {
            sizeHalfPt: 19,
            bold: true,
            color: '475569',
            align: 'right',
            spaceBefore: 80,
            spaceAfter: 40,
            pageBreakBefore: true,
          })
        );
      }
      mediaCounter += 1;
      const imgFile = `image${mediaCounter}.png`;
      const relId = `rIdImg${mediaCounter}`;
      const { bytes, width, height } = await renderDiagramToPngBytes(
        diagram,
        theme,
        2.2,
        options.includeLegend
      );
      zip.file(`word/media/${imgFile}`, bytes);
      relsEntries.push(
        `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imgFile}"/>`
      );
      bodyChunks.push(
        imageToDrawingParagraph(relId, width, height, nextId(), diagram.title)
      );
      bodyChunks.push(
        wParagraph(`${diagram.figureNumber}: ${diagram.title}`, {
          sizeHalfPt: 22,
          bold: true,
          color: theme.captionColor,
          align: 'center',
          spaceBefore: 40,
          spaceAfter: 100,
        })
      );
    }

    if (options.includeTables) {
      const urNames = diagram.urIds
        .map((id) => `${id} (${UR_CATALOG[id] ?? ''})`)
        .join(' ، ');
      const frNames = diagram.frIds
        .map((id) => `${id}: ${FR_CATALOG[id] ?? ''}`)
        .join(' | ');

      bodyChunks.push(
        wParagraph(
          diagram.category === 'erd'
            ? `جدول تفصيل الكينونات والصفات لـ ${diagram.figureNumber}`
            : `جدول تفصيل تدفقات البيانات والعناصر لـ ${diagram.figureNumber}`,
          {
            sizeHalfPt: 22,
            bold: true,
            color: theme.titleColor,
            align: 'right',
            spaceBefore: 120,
            spaceAfter: 60,
          }
        )
      );
      bodyChunks.push(buildDiagramSpecTable(diagram, theme));
      bodyChunks.push(
        wParagraph(`متطلبات المستخدم المرتبطة: ${urNames}`, {
          sizeHalfPt: 18,
          bold: true,
          color: '475569',
          align: 'right',
          spaceBefore: 80,
          spaceAfter: 20,
        })
      );
      bodyChunks.push(
        wParagraph(`المتطلبات الوظيفية المغطاة: ${frNames}`, {
          sizeHalfPt: 18,
          color: '475569',
          align: 'right',
          spaceBefore: 0,
          spaceAfter: 100,
        })
      );
    }
  }

  // Landscape A4 section settings (297mm x 210mm = 16838 x 11906 twips, balanced print margins)
  const sectPr = `<w:sectPr>
    <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
    <w:pgMar w:top="680" w:right="820" w:bottom="680" w:left="820" w:header="400" w:footer="400" w:gutter="0"/>
    <w:bidi/>
  </w:sectPr>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  mc:Ignorable="wp14">
  <w:body>
    ${bodyChunks.join('\n')}
    ${sectPr}
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${relsEntries.join('\n  ')}
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="en-US" w:bidi="ar-SA"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', rootRelsXml);
  zip.file('word/_rels/document.xml.rels', docRelsXml);
  zip.file('word/styles.xml', stylesXml);
  zip.file('word/document.xml', documentXml);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export async function exportSingleDiagramToDocx(
  diagram: DiagramSpec,
  theme: DiagramTheme,
  options: Omit<WordExportOptions, 'selectedDiagramIds'>
): Promise<void> {
  const blob = await generateDocxBlob([diagram], theme, options, false);
  const safeFile = `${diagram.figureNumber.replace(/[() ]+/g, '_')}_${diagram.id}_قابل_للتعديل.docx`;
  downloadBlob(blob, safeFile);
}

export async function exportAllDiagramsToDocx(
  diagrams: DiagramSpec[],
  theme: DiagramTheme,
  options: Omit<WordExportOptions, 'selectedDiagramIds'>
): Promise<void> {
  const blob = await generateDocxBlob(diagrams, theme, options, true);
  downloadBlob(blob, 'الفصل_الثالث_كافة_مخططات_منصة_جدولة_فيسبوك_قابل_للتعديل.docx');
}
