import type { BrandingConfig, BreakRule, TimetableVariant } from "@/lib/types";

interface TimetableExportOptions {
  days: string[];
  slotLabels: string[];
  breaks: BreakRule[];
}

type ExportColumn =
  | { kind: "slot"; label: string }
  | { kind: "break"; label: string; afterSlot: number };

interface VariantGridData {
  columns: ExportColumn[];
  headerRow: string[];
  bodyRows: string[][];
}

interface PdfRenderTuning {
  scale: number;
}

type PdfPageFormat = "a3" | "a2" | "a1" | [number, number];

interface PdfLayoutChoice {
  format: PdfPageFormat;
  scale: number;
}

const PDF_BASE_FORMAT: PdfPageFormat = "a3";
const PDF_FALLBACK_FORMATS: PdfPageFormat[] = [
  "a3",
  "a2",
  "a1",
  [2384, 1684], // slightly larger than A1 landscape
];

function createPdfDoc(jsPDF: any, format: PdfPageFormat = PDF_BASE_FORMAT) {
  return new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: format as any,
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function breakPriority(name: string) {
  const lower = name.trim().toLowerCase();
  if (lower.includes("lunch")) return 0;
  if (lower.includes("tea")) return 1;
  return 2;
}

function sortBreakRules(breaks: BreakRule[]) {
  return [...breaks].sort((a, b) => {
    if (a.afterSlot !== b.afterSlot) return a.afterSlot - b.afterSlot;
    const priorityGap = breakPriority(a.name) - breakPriority(b.name);
    if (priorityGap !== 0) return priorityGap;
    return a.name.localeCompare(b.name);
  });
}

function buildColumns(slotLabels: string[], breaks: BreakRule[]): ExportColumn[] {
  const sortedBreaks = sortBreakRules(breaks);
  const columns: ExportColumn[] = [];
  slotLabels.forEach((slotLabel, index) => {
    const slotIndex = index + 1;
    columns.push({ kind: "slot", label: slotLabel });
    sortedBreaks
      .filter((breakRule) => breakRule.afterSlot === slotIndex)
      .forEach((breakRule) =>
        columns.push({
          kind: "break",
          label: getBreakHeaderLabel(slotLabels, breakRule),
          afterSlot: breakRule.afterSlot,
        })
      );
  });
  return columns;
}

function parseSlotLabel(slotLabel: string) {
  const [start, end] = slotLabel.split("-");
  if (!start || !end) return null;
  return { start: start.trim(), end: end.trim() };
}

function getBreakHeaderLabel(slotLabels: string[], breakRule: BreakRule) {
  const beforeSlot = slotLabels[breakRule.afterSlot - 1];
  const afterSlot = slotLabels[breakRule.afterSlot];
  const before = beforeSlot ? parseSlotLabel(beforeSlot) : null;
  const after = afterSlot ? parseSlotLabel(afterSlot) : null;
  if (!before || !after) return breakRule.name;
  return `${breakRule.name} (${before.end}-${after.start})`;
}

function slotCellText(variant: TimetableVariant, day: string, slotLabel: string) {
  const slot = variant.slots.find(
    (candidate) => candidate.day === day && candidate.slotLabel === slotLabel
  );
  if (!slot) return "-";
  return `${slot.subject}\n${slot.faculty}\n${slot.room}`;
}

function slotSubject(variant: TimetableVariant, day: string, slotLabel: string) {
  const slot = variant.slots.find(
    (candidate) => candidate.day === day && candidate.slotLabel === slotLabel
  );
  return slot?.subject ?? "";
}

// Gentle pastel tints per subject using a hash
function subjectColorTint(subject: string): [number, number, number] | null {
  if (!subject || subject === "-") return null;
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  // Convert HSL(hue, 45%, 85%) to RGB for a visible but soft pastel
  const s = 0.45, l = 0.85;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (hue < 60) { r1 = c; g1 = x; }
  else if (hue < 120) { r1 = x; g1 = c; }
  else if (hue < 180) { g1 = c; b1 = x; }
  else if (hue < 240) { g1 = x; b1 = c; }
  else if (hue < 300) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

function formatDayLabel(day: string) {
  const trimmed = day.trim();
  if (trimmed.length <= 3) return trimmed.toUpperCase();
  return trimmed.slice(0, 3).toUpperCase();
}

function buildGridData(
  variant: TimetableVariant,
  options: TimetableExportOptions
): VariantGridData {
  const columns = buildColumns(options.slotLabels, options.breaks);
  const headerRow = ["DAY", ...columns.map((column) => column.label)];
  const bodyRows = options.days.map((day) => [
    formatDayLabel(day),
    ...columns.map((column) =>
      column.kind === "break"
        ? ""
        : slotCellText(variant, day, column.label)
    ),
  ]);
  return { columns, headerRow, bodyRows };
}

function toSafeFileName(value: string, fallback = "timetable-variant") {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function longestLineLength(value: string) {
  return value
    .split("\n")
    .reduce((max, line) => Math.max(max, line.trim().length), 0);
}

function getBreakCellTheme(label: string) {
  const lower = label.trim().toLowerCase();
  if (lower.includes("lunch")) {
    return {
      fill: "DFECFF",
      text: "2E5688",
    };
  }
  if (lower.includes("tea")) {
    return {
      fill: "D4E6FF",
      text: "2A4F80",
    };
  }
  return {
    fill: "EAF3FF",
    text: "3D6392",
  };
}

function timestampLabel() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getDocPageCount(doc: any) {
  if (typeof doc.getNumberOfPages === "function") {
    return Number(doc.getNumberOfPages()) || 1;
  }
  const internalCount = doc?.internal?.getNumberOfPages?.();
  return Number(internalCount) || 1;
}

// Helper to draw a single variant onto an existing jsPDF instance
export async function drawVariantOnDoc(
  doc: any, // jsPDF instance
  variant: TimetableVariant,
  options: TimetableExportOptions,
  autoTable: any, // jspdf-autotable plugin
  tuning: PdfRenderTuning = { scale: 1 },
  branding?: BrandingConfig | null
) {
  const { columns, headerRow, bodyRows } = buildGridData(variant, options);
  const layoutScale = clamp(tuning.scale || 1, 0.26, 1.15);
  const pageWidth = doc.internal.pageSize.getWidth();
  const createdAt = new Date().toLocaleString();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 10;
  const marginRight = 10;
  const marginBottom = 28; // must be >= footer bar height (22pt) to avoid overlap
  const headerBlockHeight = Math.max(80, Math.floor(130 * layoutScale)); // taller header for bigger text
  const slotColumnCount = columns.filter((column) => column.kind === "slot").length;
  const breakColumnCount = columns.length - slotColumnCount;
  const availableTableWidth = pageWidth - marginLeft - marginRight;
  const dayWeight = 1.2;
  const slotWeight = 1;
  const breakWeight = 0.72;
  const totalWeight = dayWeight + slotColumnCount * slotWeight + breakColumnCount * breakWeight;
  const unitWidth = totalWeight > 0 ? availableTableWidth / totalWeight : availableTableWidth;
  const dayColumnWidth = unitWidth * dayWeight;
  const slotColumnWidth = unitWidth * slotWeight;
  const breakColumnWidth = breakColumnCount > 0 ? unitWidth * breakWeight : 0;
  const densityScore =
    ((columns.length + 1) * Math.max(1, bodyRows.length)) / (11 * 6);
  const densityScale = clamp(1 / Math.sqrt(Math.max(1, densityScore)), 0.68, 1);
  const shouldSplitHorizontally = false;
  const gridFontSize = clamp(
    (slotColumnWidth * 0.17 + 1.45) * layoutScale * densityScale,
    8,    // min raised for readability
    15.5  // max raised for bigger body text
  );
  const gridCellPadding = clamp(
    slotColumnWidth * 0.09 * layoutScale * densityScale,
    2.5,  // min raised — more breathing room
    8     // max raised — less congested cells
  );
  const startY = headerBlockHeight + 10;
  const availableHeight = pageHeight - startY - marginBottom;
  const maxBodyAreaHeight = Math.max(140, availableHeight - 20);
  const rowHeightCeiling =
    maxBodyAreaHeight / Math.max(1, bodyRows.length) - 2;
  const threeLineHeight = gridFontSize * 3.6 + gridCellPadding * 2;
  const minRowHeight = clamp(Math.min(rowHeightCeiling, threeLineHeight), 12, 120); // taller rows
  const columnStyles: Record<number, { cellWidth: number }> = {
    0: { cellWidth: dayColumnWidth },
  };
  columns.forEach((column, index) => {
    columnStyles[index + 1] = {
      cellWidth: column.kind === "break" ? breakColumnWidth : slotColumnWidth,
    };
  });

  // ----- HEADER RENDERING -----
  if (branding && branding.institutionName) {
    // WHITE-LABEL BRANDED HEADER
    const brandColor = branding.primaryColor || "#3b82f6";
    const r = parseInt(brandColor.slice(1, 3), 16);
    const g = parseInt(brandColor.slice(3, 5), 16);
    const b = parseInt(brandColor.slice(5, 7), 16);

    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageWidth, headerBlockHeight, "F");

    // Logo (if provided as base64 data URI)
    let textStartX = 30;
    if (branding.logoUrl && branding.logoUrl.startsWith("data:image")) {
      try {
        const logoSize = Math.min(headerBlockHeight - 12, 60);
        doc.addImage(branding.logoUrl, "PNG", 16, 6, logoSize, logoSize);
        textStartX = 16 + logoSize + 10;
      } catch {
        // Logo rendering failed, skip it
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(clamp(32 * layoutScale, 16, 32));
    doc.text(branding.institutionName, textStartX, clamp(44 * layoutScale, 28, 44));
    doc.setFontSize(clamp(20 * layoutScale, 11, 20));
    doc.text(`${variant.name} — Score: ${variant.score}%`, textStartX, clamp(74 * layoutScale, 48, 74));
    doc.setFontSize(clamp(13 * layoutScale, 9, 13));
    doc.text(`Exported: ${createdAt}`, textStartX, clamp(100 * layoutScale, 64, 100));
    // "Powered by" watermark
    const poweredText = "Powered by Schedulr AI";
    doc.setFontSize(10);
    const poweredWidth = doc.getTextWidth(poweredText);
    doc.text(poweredText, pageWidth - 16 - poweredWidth, clamp(100 * layoutScale, 64, 100));
  } else {
    // DEFAULT SCHEDULR AI HEADER — Premium gradient look
    // Dark navy gradient band
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, headerBlockHeight * 0.65, "F");
    // Steel blue lower band
    doc.setFillColor(30, 58, 95);
    doc.rect(0, headerBlockHeight * 0.65, pageWidth, headerBlockHeight * 0.35, "F");
    // Gold accent line
    doc.setFillColor(234, 179, 8);
    doc.rect(0, headerBlockHeight - 3, pageWidth, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(clamp(42 * layoutScale, 20, 42));  // bigger TIMETABLE title
    doc.text("TIMETABLE", 30, clamp(44 * layoutScale, 28, 44));

    // Variant name — larger, more readable
    doc.setTextColor(148, 197, 248);
    doc.setFontSize(clamp(22 * layoutScale, 12, 22));
    doc.text(`Schedulr AI  ·  ${variant.name}`, 30, clamp(74 * layoutScale, 48, 74));

    // Score badge — pill shape, bigger
    const scoreText = `Score: ${variant.score}%`;
    doc.setFontSize(clamp(15 * layoutScale, 9, 15));
    const scoreWidth = doc.getTextWidth(scoreText) + 22;
    const badgeY = clamp(102 * layoutScale, 68, 102);
    const badgeH = 20;
    doc.setFillColor(52, 211, 153);
    doc.roundedRect(30, badgeY - badgeH + 4, scoreWidth, badgeH, 5, 5, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(scoreText, 41, badgeY);

    // Export date on right side — bigger
    doc.setTextColor(180, 200, 230);
    doc.setFontSize(clamp(13 * layoutScale, 9, 13));
    const exportedText = `Exported: ${createdAt}`;
    doc.text(
      exportedText,
      pageWidth - 30 - doc.getTextWidth(exportedText),
      clamp(104 * layoutScale, 70, 104)
    );
  }
  doc.setTextColor(44, 67, 98);

  const previousLineHeightFactor =
    typeof doc.getLineHeightFactor === "function" ? doc.getLineHeightFactor() : 1.15;
  if (typeof doc.setLineHeightFactor === "function") {
    doc.setLineHeightFactor(clamp(1.04 * densityScale, 0.9, 1.08));
  }

  autoTable(doc, {
    startY,
    margin: { left: marginLeft, right: marginRight, bottom: marginBottom },
    head: [headerRow],
    body: bodyRows,
    theme: "grid",
    tableWidth: availableTableWidth,
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    horizontalPageBreak: shouldSplitHorizontally,
    horizontalPageBreakRepeat: 0,
    horizontalPageBreakBehaviour: "afterAllRows",
    showHead: "everyPage",
    styles: {
      fontSize: gridFontSize,
      cellPadding: gridCellPadding,
      lineColor: [160, 184, 217],
      lineWidth: 0.45,
      textColor: [45, 69, 100],
      overflow: "linebreak",
      valign: "middle",
      halign: "center",
    },
    bodyStyles: {
      minCellHeight: minRowHeight,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [220, 235, 255],
      fontStyle: "bold",
      fontSize: gridFontSize + 0.8,
      minCellHeight: Math.max(18, Math.floor(minRowHeight * 0.45)),
    },
    columnStyles,
    didParseCell: (data: any) => {
      if (data.section !== "body") return;
      const rowIndex = data.row.index;
      const isEvenRow = rowIndex % 2 === 0;
      data.cell.styles.minCellHeight = minRowHeight;

      if (data.column.index === 0) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = isEvenRow ? [230, 240, 255] : [240, 247, 255];
        data.cell.styles.textColor = [20, 50, 90];
        return;
      }
      const column = columns[data.column.index - 1];
      if (column?.kind === "break") {
        const breakLabel = column.label.toLowerCase();
        if (breakLabel.includes("lunch")) {
          data.cell.styles.fillColor = [210, 228, 255];
          data.cell.styles.textColor = [35, 65, 110];
        } else if (breakLabel.includes("tea")) {
          data.cell.styles.fillColor = [200, 222, 255];
          data.cell.styles.textColor = [35, 65, 110];
        } else {
          data.cell.styles.fillColor = [220, 235, 255];
          data.cell.styles.textColor = [45, 75, 120];
        }
        data.cell.styles.fontStyle = "bold";
        return;
      }

      // Subject-based subtle color tinting + zebra stripes
      if (column?.kind === "slot") {
        const slotLabel = column.label;
        const day = options.days[rowIndex];
        const subject = day ? slotSubject(variant, day, slotLabel) : "";
        const tint = subjectColorTint(subject);
        if (tint) {
          // Blend the subject tint with the zebra base
          const zebraBase = isEvenRow ? 255 : 248;
          data.cell.styles.fillColor = [
            Math.round((tint[0] + zebraBase) / 2),
            Math.round((tint[1] + zebraBase) / 2),
            Math.round((tint[2] + zebraBase) / 2),
          ];
        } else {
          data.cell.styles.fillColor = isEvenRow ? [255, 255, 255] : [247, 250, 255];
        }
      }
    },
    didDrawPage: () => {
      // Professional footer bar — sits within the marginBottom region (28pt)
      const footerBarHeight = 20;
      const footerY = pageHeight - footerBarHeight;
      doc.setFillColor(15, 23, 42);
      doc.rect(0, footerY, pageWidth, footerBarHeight, "F");
      doc.setFontSize(7);
      doc.setTextColor(140, 170, 210);
      const footerTextY = footerY + footerBarHeight / 2 + 2.5;
      doc.text("Generated by Schedulr AI  ·  timetabiq.com", 16, footerTextY);
      const pageInfo = `${variant.name}  ·  Score: ${variant.score}%`;
      doc.text(pageInfo, pageWidth - 16 - doc.getTextWidth(pageInfo), footerTextY);
    },
  });

  if (typeof doc.setLineHeightFactor === "function") {
    doc.setLineHeightFactor(previousLineHeightFactor);
  }
}

async function findSinglePageScale(
  jsPDF: any,
  autoTable: any,
  variant: TimetableVariant,
  options: TimetableExportOptions,
  format: PdfPageFormat,
  branding?: BrandingConfig | null
) {
  const minScale = 0.26;
  const maxScale = 1.15;
  let low = minScale;
  let high = maxScale;
  let best = minScale;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const mid = (low + high) / 2;
    const trialDoc = createPdfDoc(jsPDF, format);
    await drawVariantOnDoc(trialDoc, variant, options, autoTable, { scale: mid }, branding);
    const pages = getDocPageCount(trialDoc);

    if (pages <= 1) {
      best = mid;
      low = mid;
      continue;
    }

    high = mid;
  }

  let verifiedScale = best;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const trialDoc = createPdfDoc(jsPDF, format);
    await drawVariantOnDoc(trialDoc, variant, options, autoTable, { scale: verifiedScale }, branding);
    if (getDocPageCount(trialDoc) <= 1) return verifiedScale;
    verifiedScale = Math.max(minScale, verifiedScale * 0.95);
  }

  return minScale;
}

async function findSinglePageLayout(
  jsPDF: any,
  autoTable: any,
  variant: TimetableVariant,
  options: TimetableExportOptions,
  branding?: BrandingConfig | null
): Promise<PdfLayoutChoice> {
  for (const format of PDF_FALLBACK_FORMATS) {
    const scale = await findSinglePageScale(
      jsPDF,
      autoTable,
      variant,
      options,
      format,
      branding
    );
    const trialDoc = createPdfDoc(jsPDF, format);
    await drawVariantOnDoc(trialDoc, variant, options, autoTable, { scale }, branding);
    if (getDocPageCount(trialDoc) <= 1) {
      return { format, scale };
    }
  }

  const fallbackFormat: PdfPageFormat = [2800, 2000];
  const fallbackScale = await findSinglePageScale(
    jsPDF,
    autoTable,
    variant,
    options,
    fallbackFormat,
    branding
  );
  return { format: fallbackFormat, scale: fallbackScale };
}

export async function exportVariantToPdf(
  variant: TimetableVariant,
  options: TimetableExportOptions,
  branding?: BrandingConfig | null
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const layout = await findSinglePageLayout(jsPDF, autoTable, variant, options, branding);
  const doc = createPdfDoc(jsPDF, layout.format);
  await drawVariantOnDoc(doc, variant, options, autoTable, { scale: layout.scale }, branding);
  doc.save(`${toSafeFileName(variant.name)}.pdf`);
}

export async function exportAllVariantsToPdf(
  variants: TimetableVariant[],
  options: TimetableExportOptions,
  branding?: BrandingConfig | null
) {
  if (variants.length === 0) return;
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const firstLayout = await findSinglePageLayout(jsPDF, autoTable, variants[0], options, branding);
  const doc = createPdfDoc(jsPDF, firstLayout.format);

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    const layout =
      i === 0 ? firstLayout : await findSinglePageLayout(jsPDF, autoTable, variant, options, branding);
    if (i > 0) {
      doc.addPage(layout.format as any, "landscape");
    }
    await drawVariantOnDoc(doc, variant, options, autoTable, { scale: layout.scale }, branding);
  }

  doc.save("all-variants-schedulr.pdf");
}

function createVariantWorkbook(
  XLSX: any,
  variant: TimetableVariant,
  options: TimetableExportOptions
) {
  const { columns, headerRow, bodyRows } = buildGridData(variant, options);
  const exportedAt = new Date().toLocaleString();
  const timetableRows = [
    ["TIMETABLE"],
    [`Schedulr AI - ${variant.name}`],
    [`Score: ${variant.score}%   |   Exported: ${exportedAt}`],
    [""],
    headerRow,
    ...bodyRows,
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(timetableRows);
  const totalColumnCount = Math.max(1, headerRow.length);
  const metadataMergeEnd = totalColumnCount - 1;
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: metadataMergeEnd } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: metadataMergeEnd } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: metadataMergeEnd } },
  ];
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 4, c: 0 },
      e: { r: 4, c: metadataMergeEnd },
    }),
  };

  const dayColumnValues = bodyRows.map((row) => String(row[0] ?? ""));
  const dayColumnLength = Math.max(
    longestLineLength(headerRow[0] ?? "DAY"),
    ...dayColumnValues.map(longestLineLength)
  );
  const excelColumns = [{ wch: clamp(dayColumnLength + 3, 10, 16) }];
  columns.forEach((column, index) => {
    const colIndex = index + 1;
    const cellValues = bodyRows.map((row) => String(row[colIndex] ?? ""));
    const longest = Math.max(
      longestLineLength(headerRow[colIndex] ?? ""),
      ...cellValues.map(longestLineLength)
    );
    const minWidth = column.kind === "break" ? 12 : 17;
    const maxWidth = column.kind === "break" ? 22 : 34;
    const padding = column.kind === "break" ? 3 : 5;
    excelColumns.push({ wch: clamp(longest + padding, minWidth, maxWidth) });
  });
  worksheet["!cols"] = excelColumns;

  const timetableBodyRowHeights = bodyRows.map((row) => {
    const maxLineCount = row.reduce((max, cell) => {
      const value = String(cell ?? "");
      return Math.max(max, value.split("\n").length);
    }, 1);
    return { hpt: clamp(14 + maxLineCount * 12, 28, 64) };
  });
  worksheet["!rows"] = [
    { hpt: 30 },
    { hpt: 24 },
    { hpt: 20 },
    { hpt: 10 },
    { hpt: 28 },
    ...timetableBodyRowHeights,
  ];

  const border = {
    top: { style: "thin", color: { rgb: "B9CEE9" } },
    right: { style: "thin", color: { rgb: "B9CEE9" } },
    bottom: { style: "thin", color: { rgb: "B9CEE9" } },
    left: { style: "thin", color: { rgb: "B9CEE9" } },
  };
  const toCell = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
  const ensureCell = (r: number, c: number) => {
    const address = toCell(r, c);
    if (!worksheet[address]) {
      worksheet[address] = { t: "s", v: "" };
    }
    return worksheet[address];
  };

  const applyStyle = (r: number, c: number, style: any) => {
    const cell = ensureCell(r, c);
    cell.s = style;
  };

  const headerMetaStyle = {
    fill: { patternType: "solid", fgColor: { rgb: "0F172A" } },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 16 },
    alignment: { horizontal: "left", vertical: "center", wrapText: true },
  };
  const subMetaStyle = {
    fill: { patternType: "solid", fgColor: { rgb: "1E3A5F" } },
    font: { bold: true, color: { rgb: "94C5F8" }, sz: 11 },
    alignment: { horizontal: "left", vertical: "center", wrapText: true },
  };
  const scoreMetaStyle = {
    fill: { patternType: "solid", fgColor: { rgb: "1E3A5F" } },
    font: { bold: false, color: { rgb: "B4C8E6" }, sz: 10 },
    alignment: { horizontal: "left", vertical: "center", wrapText: true },
  };
  const tableHeaderStyle = {
    fill: { patternType: "solid", fgColor: { rgb: "0F172A" } },
    font: { bold: true, color: { rgb: "DCE8FF" }, sz: 11 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border,
  };

  applyStyle(0, 0, headerMetaStyle);
  applyStyle(1, 0, subMetaStyle);
  applyStyle(2, 0, scoreMetaStyle);

  for (let colIndex = 0; colIndex < totalColumnCount; colIndex += 1) {
    applyStyle(4, colIndex, tableHeaderStyle);
  }

  // Helper to get subject-based Excel color
  function subjectExcelColor(subject: string): string | null {
    if (!subject || subject === "-") return null;
    const tint = subjectColorTint(subject);
    if (!tint) return null;
    return tint.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  for (let rowOffset = 0; rowOffset < bodyRows.length; rowOffset += 1) {
    const rowIndex = 5 + rowOffset;
    const isEven = rowOffset % 2 === 0;
    // Day column with zebra
    const dayStyle = {
      fill: { patternType: "solid" as const, fgColor: { rgb: isEven ? "E6F0FF" : "F0F7FF" } },
      font: { bold: true, color: { rgb: "14325A" }, sz: 10 },
      alignment: { horizontal: "center" as const, vertical: "center" as const, wrapText: true },
      border,
    };
    applyStyle(rowIndex, 0, dayStyle);

    for (let colIndex = 1; colIndex < totalColumnCount; colIndex += 1) {
      const column = columns[colIndex - 1];
      if (column?.kind === "break") continue; // handled separately below

      // Get subject for this cell
      const day = options.days[rowOffset];
      const slotLabel = column?.label ?? "";
      const subject = day ? slotSubject(variant, day, slotLabel) : "";
      const subjectColor = subjectExcelColor(subject);

      let bgColor = isEven ? "FFFFFF" : "F7FAFF";
      if (subjectColor) {
        // Blend subject color with zebra base
        const base = isEven ? 255 : 248;
        const tint = subjectColorTint(subject)!;
        bgColor = [
          Math.round((tint[0] + base) / 2),
          Math.round((tint[1] + base) / 2),
          Math.round((tint[2] + base) / 2),
        ].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
      }

      const cellStyle = {
        fill: { patternType: "solid" as const, fgColor: { rgb: bgColor } },
        font: { color: { rgb: "3A5D86" }, sz: 10 },
        alignment: { horizontal: "center" as const, vertical: "center" as const, wrapText: true },
        border,
      };
      applyStyle(rowIndex, colIndex, cellStyle);
    }
  }

  columns.forEach((column, index) => {
    if (column.kind !== "break") return;
    const columnIndex = index + 1;
    const theme = getBreakCellTheme(column.label);
    const breakHeaderStyle = {
      fill: { patternType: "solid", fgColor: { rgb: theme.fill } },
      font: { bold: true, color: { rgb: theme.text }, sz: 11 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border,
    };
    const breakBodyStyle = {
      fill: { patternType: "solid", fgColor: { rgb: theme.fill } },
      font: { bold: true, color: { rgb: theme.text }, sz: 10 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border,
    };
    applyStyle(4, columnIndex, breakHeaderStyle);
    for (let rowOffset = 0; rowOffset < bodyRows.length; rowOffset += 1) {
      const rowIndex = 5 + rowOffset;
      applyStyle(rowIndex, columnIndex, breakBodyStyle);
    }
  });

  // Freeze panes: lock header row (row 5) and day column (col 1)
  worksheet["!freeze"] = { xSplit: 1, ySplit: 5 };

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Schedulr AI Timetable Export"],
    [""],
    ["Variant", variant.name],
    ["Score", `${variant.score}%`],
    ["Generated At", exportedAt],
    ["Layout", "Days vertical, time slots horizontal"],
    ["Days", options.days.join(", ")],
    ["Slots", options.slotLabels.length],
    ["Breaks", options.breaks.length],
    [""],
    ["Platform", "Schedulr AI — timetabiq.com"],
  ]);
  summarySheet["!cols"] = [{ wch: 24 }, { wch: 48 }];
  // Style summary header
  const summaryHeaderStyle = {
    fill: { patternType: "solid" as const, fgColor: { rgb: "0F172A" } },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
    alignment: { horizontal: "left" as const, vertical: "center" as const, wrapText: true },
  };
  const summaryAddr = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (!summarySheet[summaryAddr]) summarySheet[summaryAddr] = { t: "s", v: "Schedulr AI Timetable Export" };
  summarySheet[summaryAddr].s = summaryHeaderStyle;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Timetable");
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  return workbook;
}

async function loadStyledXlsx() {
  const xlsxPackage = (await import("xlsx-js-style")) as any;
  return xlsxPackage.default ?? xlsxPackage;
}

export async function exportVariantToExcel(
  variant: TimetableVariant,
  options: TimetableExportOptions
) {
  const XLSX = await loadStyledXlsx();
  const workbook = createVariantWorkbook(XLSX, variant, options);
  XLSX.writeFile(workbook, `${toSafeFileName(variant.name)}.xlsx`, {
    cellStyles: true,
  });
}

export async function exportAllVariantsToPdfZip(
  variants: TimetableVariant[],
  options: TimetableExportOptions,
  branding?: BrandingConfig | null
) {
  if (variants.length === 0) return;
  const [{ default: JSZip }, { default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jszip"),
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const zip = new JSZip();
  const pdfFolder = zip.folder("pdf-variants");
  if (!pdfFolder) {
    throw new Error("Failed to create PDF folder in ZIP.");
  }

  for (const variant of variants) {
    const layout = await findSinglePageLayout(jsPDF, autoTable, variant, options, branding);
    const doc = createPdfDoc(jsPDF, layout.format);
    await drawVariantOnDoc(doc, variant, options, autoTable, { scale: layout.scale }, branding);
    pdfFolder.file(`${toSafeFileName(variant.name)}.pdf`, doc.output("arraybuffer"));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `timetable-pdf-variants-${timestampLabel()}.zip`);
}

export async function exportAllVariantsToExcelZip(
  variants: TimetableVariant[],
  options: TimetableExportOptions
) {
  if (variants.length === 0) return;
  const [{ default: JSZip }, XLSX] = await Promise.all([
    import("jszip"),
    loadStyledXlsx(),
  ]);

  const zip = new JSZip();
  const excelFolder = zip.folder("excel-variants");
  if (!excelFolder) {
    throw new Error("Failed to create Excel folder in ZIP.");
  }

  for (const variant of variants) {
    const workbook = createVariantWorkbook(XLSX, variant, options);
    const data = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
      cellStyles: true,
    });
    excelFolder.file(`${toSafeFileName(variant.name)}.xlsx`, data);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `timetable-excel-variants-${timestampLabel()}.zip`);
}

