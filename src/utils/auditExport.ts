import jsPDF from "jspdf";

interface AuditLog {
  _id: string;
  userName: string;
  action: string;
  target: string;
  result: string;
  ip: string;
  createdAt: string;
}

interface ExportStats {
  totalEvents: number;
  successCount: number;
  failedCount: number;
  activeUsers: number;
}

// ─── NetSight Brand Colors ───────────────────────────────────────────
const COLORS = {
  bgDark: [10, 10, 10] as [number, number, number],
  bgCard: [26, 26, 26] as [number, number, number],
  bgRow: [20, 20, 20] as [number, number, number],
  bgRowAlt: [30, 30, 30] as [number, number, number],
  border: [42, 42, 42] as [number, number, number],
  gold: [212, 175, 55] as [number, number, number],
  goldLight: [245, 158, 11] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  textPrimary: [245, 245, 245] as [number, number, number],
  textSecondary: [156, 163, 175] as [number, number, number],
  textTertiary: [107, 114, 128] as [number, number, number],
  greenBg: [22, 101, 52] as [number, number, number],
  greenText: [74, 222, 128] as [number, number, number],
  redBg: [127, 29, 29] as [number, number, number],
  redText: [248, 113, 113] as [number, number, number],
};

function drawRoundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor: [number, number, number],
  borderColor?: [number, number, number]
) {
  doc.setFillColor(...fillColor);
  if (borderColor) {
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, r, r, "FD");
  } else {
    doc.roundedRect(x, y, w, h, r, r, "F");
  }
}

function drawGradientBar(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const steps = 40;
  const stepW = w / steps;
  for (let i = 0; i < steps; i++) {
    const ratio = i / steps;
    const r = Math.round(COLORS.gold[0] + (COLORS.goldLight[0] - COLORS.gold[0]) * ratio);
    const g = Math.round(COLORS.gold[1] + (COLORS.goldLight[1] - COLORS.gold[1]) * ratio);
    const b = Math.round(COLORS.gold[2] + (COLORS.goldLight[2] - COLORS.gold[2]) * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(x + i * stepW, y, stepW + 0.5, h, "F");
  }
}

// ─── PDF EXPORT ──────────────────────────────────────────────────────
export function exportAuditPDF(logs: AuditLog[], stats: ExportStats) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 0;

  const generateDate = new Date().toLocaleString();

  function drawPageBackground() {
    doc.setFillColor(...COLORS.bgDark);
    doc.rect(0, 0, pageW, pageH, "F");
  }

  function drawFooter(pageNum: number, totalPages: number) {
    const footerY = pageH - 10;
    // divider
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 3, pageW - margin, footerY - 3);
    // left
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textTertiary);
    doc.text(`Generated: ${generateDate}`, margin, footerY);
    // center
    doc.text("CONFIDENTIAL — NetSight Audit Report", pageW / 2, footerY, { align: "center" });
    // right
    doc.text(`Page ${pageNum} of ${totalPages}`, pageW - margin, footerY, { align: "right" });
  }

  // ─── PAGE 1 ──────────────────────────────────────────────────────
  drawPageBackground();

  // ═══ HEADER SECTION ═══
  y = margin;

  // Gold gradient bar at top
  drawGradientBar(doc, 0, 0, pageW, 3);

  y = 14;

  // Logo area
  drawRoundedRect(doc, margin, y, 10, 10, 2, COLORS.gold);
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.bgDark);
  doc.setFont("helvetica", "bold");
  doc.text("N", margin + 3.4, y + 7.4);

  // Title
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.text("NetSight", margin + 14, y + 5);

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gold);
  doc.setFont("helvetica", "normal");
  doc.text("Security Audit Report", margin + 14, y + 10);

  // Report metadata - right side
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textSecondary);
  doc.text(`Report Generated: ${generateDate}`, pageW - margin, y + 3, { align: "right" });
  doc.text(`Total Records: ${stats.totalEvents}`, pageW - margin, y + 7, { align: "right" });
  doc.text(`Report ID: RPT-${Date.now().toString(36).toUpperCase()}`, pageW - margin, y + 11, { align: "right" });

  y += 18;

  // Separator line
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ═══ SUMMARY STATS CARDS ═══
  const cardW = (contentW - 6) / 4;
  const cardH = 20;
  const statsData = [
    { label: "Total Events", value: stats.totalEvents.toString(), accent: COLORS.gold },
    { label: "Successful", value: stats.successCount.toString(), accent: COLORS.greenText },
    { label: "Failed", value: stats.failedCount.toString(), accent: COLORS.redText },
    { label: "Active Users", value: stats.activeUsers.toString(), accent: COLORS.gold },
  ];

  statsData.forEach((stat, i) => {
    const cardX = margin + i * (cardW + 2);
    drawRoundedRect(doc, cardX, y, cardW, cardH, 2, COLORS.bgCard, COLORS.border);

    // Top accent line
    doc.setFillColor(...stat.accent);
    doc.rect(cardX + 3, y + 2, 12, 1.2, "F");

    // Label
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textSecondary);
    doc.setFont("helvetica", "normal");
    doc.text(stat.label, cardX + 3, y + 8);

    // Value
    doc.setFontSize(16);
    doc.setTextColor(...stat.accent);
    doc.setFont("helvetica", "bold");
    doc.text(stat.value, cardX + 3, y + 16);
  });

  y += cardH + 8;

  // ═══ AUDIT LOG TABLE ═══
  // Section header
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.text("Audit Log Entries", margin, y);

  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textTertiary);
  doc.text(`Showing ${logs.length} records`, pageW - margin, y, { align: "right" });

  y += 6;

  // Table configuration
  const colWidths = [36, 30, 28, 38, 20, 28];
  const colLabels = ["Timestamp", "User", "Action", "Target", "Result", "IP Address"];
  const rowH = 8;

  // Table header
  drawRoundedRect(doc, margin, y, contentW, rowH + 1, 1.5, [15, 15, 15]);
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.gold);
  doc.setFont("helvetica", "bold");

  let colX = margin + 3;
  colLabels.forEach((label, i) => {
    doc.text(label, colX, y + 5.5);
    colX += colWidths[i];
  });

  y += rowH + 2;

  // Table rows
  let pageNum = 1;
  const maxY = pageH - 20;

  logs.forEach((log, rowIdx) => {
    if (y + rowH > maxY) {
      // Footer for current page
      drawFooter(pageNum, -1);
      pageNum++;
      doc.addPage();
      drawPageBackground();
      y = margin;

      // Mini header on continuation pages
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.gold);
      doc.setFont("helvetica", "bold");
      doc.text("NetSight — Security Audit Report (continued)", margin, y + 4);
      y += 10;

      // Re-draw table header
      drawRoundedRect(doc, margin, y, contentW, rowH + 1, 1.5, [15, 15, 15]);
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.gold);
      doc.setFont("helvetica", "bold");

      let hx = margin + 3;
      colLabels.forEach((label, i) => {
        doc.text(label, hx, y + 5.5);
        hx += colWidths[i];
      });

      y += rowH + 2;
    }

    // Alternating row background
    const rowBg = rowIdx % 2 === 0 ? COLORS.bgRow : COLORS.bgRowAlt;
    doc.setFillColor(...rowBg);
    doc.rect(margin, y, contentW, rowH, "F");

    // Row border
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.1);
    doc.line(margin, y + rowH, margin + contentW, y + rowH);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);

    colX = margin + 3;

    // Timestamp
    doc.setTextColor(...COLORS.textTertiary);
    const ts = new Date(log.createdAt).toLocaleString();
    doc.text(ts.substring(0, 22), colX, y + 5);
    colX += colWidths[0];

    // User
    doc.setTextColor(...COLORS.textPrimary);
    doc.setFont("helvetica", "bold");
    const userName = log.userName.length > 16 ? log.userName.substring(0, 16) + "…" : log.userName;
    doc.text(userName, colX, y + 5);
    colX += colWidths[1];

    // Action
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "normal");
    const action = log.action.length > 16 ? log.action.substring(0, 16) + "…" : log.action;
    doc.text(action, colX, y + 5);
    colX += colWidths[2];

    // Target
    doc.setTextColor(...COLORS.textSecondary);
    const target = log.target.length > 22 ? log.target.substring(0, 22) + "…" : log.target;
    doc.text(target, colX, y + 5);
    colX += colWidths[3];

    // Result badge
    if (log.result === "Success") {
      doc.setFillColor(22, 101, 52);
      doc.roundedRect(colX - 1, y + 1.5, 16, 5, 1, 1, "F");
      // Draw dot indicator natively
      doc.setFillColor(...COLORS.greenText);
      doc.circle(colX + 1, y + 4, 0.8, "F");
      doc.setTextColor(...COLORS.greenText);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      doc.text("Success", colX + 3, y + 5);
    } else {
      doc.setFillColor(127, 29, 29);
      doc.roundedRect(colX - 1, y + 1.5, 14, 5, 1, 1, "F");
      // Draw dot indicator natively
      doc.setFillColor(...COLORS.redText);
      doc.circle(colX + 1, y + 4, 0.8, "F");
      doc.setTextColor(...COLORS.redText);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      doc.text("Failed", colX + 3, y + 5);
    }
    colX += colWidths[4];

    // IP
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textTertiary);
    const ip = log.ip?.length > 16 ? log.ip.substring(0, 16) + "…" : (log.ip || "N/A");
    doc.text(ip, colX, y + 5);

    y += rowH;
  });

  // ═══ FINALIZE ═══
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  // Bottom gold bar on last page
  doc.setPage(totalPages);
  drawGradientBar(doc, 0, pageH - 3, pageW, 3);

  doc.save(`NetSight_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── CSV EXPORT ──────────────────────────────────────────────────────
export function exportAuditCSV(logs: AuditLog[]) {
  const headers = ["Timestamp", "User", "Action", "Target", "Result", "IP Address"];

  const escapeCSV = (val: string) => {
    if (!val) return '""';
    const str = val.toString().replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = logs.map((log) => [
    escapeCSV(new Date(log.createdAt).toLocaleString()),
    escapeCSV(log.userName),
    escapeCSV(log.action),
    escapeCSV(log.target),
    escapeCSV(log.result),
    escapeCSV(log.ip || "N/A"),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  // BOM for Excel UTF-8 compatibility
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `NetSight_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
