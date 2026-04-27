import { jsPDF } from "jspdf";

interface LatencyPoint { time: string; value: number; packetLoss: number; }
interface TrafficPoint { period: string; value: number; }
interface DeviceRef { name: string; ip: string; latency: number; packetLoss: number; status: string; }

const C = {
  bg: [10, 10, 10] as [number, number, number],
  card: [26, 26, 26] as [number, number, number],
  border: [42, 42, 42] as [number, number, number],
  gold: [212, 175, 55] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  text: [220, 220, 220] as [number, number, number],
  muted: [156, 163, 175] as [number, number, number],
  dim: [107, 114, 128] as [number, number, number],
  green: [74, 222, 128] as [number, number, number],
  red: [248, 113, 113] as [number, number, number],
  amber: [251, 191, 36] as [number, number, number],
  greenBg: [22, 101, 52] as [number, number, number],
  redBg: [127, 29, 29] as [number, number, number],
};

function gradientBar(doc: jsPDF, x: number, y: number, w: number, h: number) {
  const steps = 30;
  const sw = w / steps;
  for (let i = 0; i < steps; i++) {
    const r = i / steps;
    doc.setFillColor(
      Math.round(C.gold[0] + (245 - C.gold[0]) * r),
      Math.round(C.gold[1] + (158 - C.gold[1]) * r),
      Math.round(C.gold[2] + (11 - C.gold[2]) * r)
    );
    doc.rect(x + i * sw, y, sw + 0.5, h, "F");
  }
}

function roundRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fill: [number, number, number], border?: [number, number, number]) {
  doc.setFillColor(...fill);
  if (border) { doc.setDrawColor(...border); doc.setLineWidth(0.3); doc.roundedRect(x, y, w, h, r, r, "FD"); }
  else doc.roundedRect(x, y, w, h, r, r, "F");
}

export function exportNetworkReport(
  stats: any,
  latencyData: LatencyPoint[],
  trafficData: TrafficPoint[],
  devices: DeviceRef[],
  startDate: string,
  endDate: string,
  timeRange: string
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 14;
  const cw = pw - m * 2;
  const genDate = new Date().toLocaleString();
  let y = 0;
  let pageNum = 1;

  // ── Computed insights ──
  const avgLat = stats?.avgLatency || 0;
  const maxLat = latencyData.length ? Math.max(...latencyData.map(d => d.value || 0)) : 0;
  const maxPL = latencyData.length ? Math.max(...latencyData.map(d => d.packetLoss || 0)) : 0;
  const uptime = stats?.uptimePercent || 0;
  const alerts = stats?.criticalAlerts || 0;
  const totalMB = ((stats?.totalTrafficIn || 0) + (stats?.totalTrafficOut || 0)) / 1048576;
  const onlineDev = devices.filter(d => d.status === "Online").length;
  const offlineDev = devices.filter(d => d.status !== "Online").length;

  const latSpikeTime = latencyData.find(d => d.value === maxLat)?.time || "N/A";
  const plSpikeTime = latencyData.find(d => d.packetLoss === maxPL)?.time || "N/A";

  let health = "Good";
  let healthColor = C.green;
  if (uptime < 95 || maxPL > 10 || alerts > 5) { health = "Critical"; healthColor = C.red; }
  else if (uptime < 99 || maxLat > 100 || alerts > 0) { health = "Moderate"; healthColor = C.amber; }

  const timeLabel = startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `Since ${startDate}` : endDate ? `Until ${endDate}` : { "24h": "Last 24 Hours", "7d": "Last 7 Days", "30d": "Last 30 Days", "90d": "Last 90 Days" }[timeRange] || timeRange;

  // ── Helpers ──
  function bg() { doc.setFillColor(...C.bg); doc.rect(0, 0, pw, ph, "F"); }

  function footer() {
    const fy = ph - 10;
    doc.setDrawColor(...C.border); doc.setLineWidth(0.3); doc.line(m, fy - 3, pw - m, fy - 3);
    doc.setFontSize(7); doc.setTextColor(...C.dim);
    doc.text(`Generated: ${genDate}`, m, fy);
    doc.text("CONFIDENTIAL — NetSight Network Analysis Report", pw / 2, fy, { align: "center" });
    doc.text(`Page ${pageNum}`, pw - m, fy, { align: "right" });
  }

  function newPage() { footer(); pageNum++; doc.addPage(); bg(); return m + 6; }

  function checkSpace(need: number): number { if (y + need > ph - 18) { y = newPage(); } return y; }

  function sectionTitle(title: string) {
    y = checkSpace(14);
    doc.setFontSize(13); doc.setTextColor(...C.gold); doc.setFont("helvetica", "bold");
    doc.text(title, m, y); y += 2;
    doc.setDrawColor(...C.gold); doc.setLineWidth(0.4); doc.line(m, y, m + 50, y);
    y += 6;
  }

  function bullet(text: string, indent = 0) {
    y = checkSpace(8);
    doc.setFontSize(8.5); doc.setTextColor(...C.text); doc.setFont("helvetica", "normal");
    const bx = m + 3 + indent;
    doc.setFillColor(...C.gold); doc.circle(bx, y - 1.2, 0.8, "F");
    const lines = doc.splitTextToSize(text, cw - 8 - indent);
    doc.text(lines, bx + 3, y);
    y += lines.length * 4.2;
  }

  function para(text: string) {
    y = checkSpace(10);
    doc.setFontSize(8.5); doc.setTextColor(...C.text); doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, cw - 4);
    doc.text(lines, m + 2, y);
    y += lines.length * 4.2 + 2;
  }

  // ══════════════════ PAGE 1 — COVER ══════════════════
  bg();
  gradientBar(doc, 0, 0, pw, 3);
  y = 14;

  // Logo
  roundRect(doc, m, y, 10, 10, 2, C.gold);
  doc.setFontSize(14); doc.setTextColor(...C.bg); doc.setFont("helvetica", "bold");
  doc.text("N", m + 3.4, y + 7.4);

  doc.setFontSize(22); doc.setTextColor(...C.white); doc.text("NetSight", m + 14, y + 5);
  doc.setFontSize(10); doc.setTextColor(...C.gold); doc.setFont("helvetica", "normal");
  doc.text("Network Analytics Report", m + 14, y + 10);

  // Meta right
  doc.setFontSize(7.5); doc.setTextColor(...C.muted);
  doc.text(`Report Generated: ${genDate}`, pw - m, y + 3, { align: "right" });
  doc.text(`Period: ${timeLabel}`, pw - m, y + 7, { align: "right" });
  doc.text(`Report ID: RPT-${Date.now().toString(36).toUpperCase()}`, pw - m, y + 11, { align: "right" });
  y += 18;

  doc.setDrawColor(...C.border); doc.setLineWidth(0.3); doc.line(m, y, pw - m, y); y += 4;

  // Health badge
  roundRect(doc, m, y, cw, 14, 2, C.card, C.border);
  doc.setFontSize(9); doc.setTextColor(...C.muted); doc.setFont("helvetica", "normal");
  doc.text("Overall Network Health:", m + 4, y + 6);
  doc.setFontSize(16); doc.setTextColor(...healthColor); doc.setFont("helvetica", "bold");
  doc.text(health.toUpperCase(), m + 52, y + 6.5);

  doc.setFontSize(8); doc.setTextColor(...C.muted); doc.setFont("helvetica", "normal");
  doc.text(`Uptime: ${uptime}%  |  Avg Latency: ${avgLat}ms  |  Alerts: ${alerts}  |  Devices: ${onlineDev} online, ${offlineDev} offline`, m + 4, y + 11.5);
  y += 20;

  // ══════════════════ 1. EXECUTIVE SUMMARY ══════════════════
  sectionTitle("1. Executive Summary");
  bullet(`Overall network health is ${health}. Network uptime stands at ${uptime}% over the monitored period.`);
  bullet(`${alerts} critical alerts are currently active, requiring immediate attention.`);
  if (maxPL > 5) bullet(`A severe packet loss event peaking at ${maxPL}% was detected around ${plSpikeTime}, causing significant connectivity degradation.`);
  else bullet("Packet loss remained within acceptable levels, ensuring stable connections throughout.");
  if (maxLat > 100) bullet(`A major latency spike of ${maxLat}ms occurred near ${latSpikeTime}, indicating a temporary but severe network disruption.`);
  else bullet(`Latency remained stable around ${avgLat}ms with no major spikes detected.`);
  bullet(`Total bandwidth usage was ${totalMB.toFixed(1)} MB. ${onlineDev} of ${devices.length} monitored devices are currently online.`);
  y += 4;

  // ══════════════════ 2. KEY METRICS OVERVIEW ══════════════════
  sectionTitle("2. Key Metrics Overview");

  const metrics = [
    { label: "Avg Latency", val: `${avgLat}ms`, interp: avgLat < 50 ? "Optimal" : "High", impact: avgLat < 50 ? "Smooth experience for browsing, VoIP, and video calls." : "Users may experience lag in real-time apps like video conferencing and VoIP.", color: avgLat < 50 ? C.green : C.red },
    { label: "Max Packet Loss", val: `${maxPL}%`, interp: maxPL > 5 ? "Critical" : "Acceptable", impact: maxPL > 5 ? "Causes dropped calls, frozen video, and forced retransmissions slowing speeds." : "No noticeable impact on user connections.", color: maxPL > 5 ? C.red : C.green },
    { label: "Total Bandwidth", val: `${totalMB.toFixed(1)} MB`, interp: "Monitored", impact: "Sudden surges can bottleneck the network and starve critical applications of bandwidth.", color: C.gold },
    { label: "Network Uptime", val: `${uptime}%`, interp: uptime >= 99 ? "Excellent" : uptime >= 95 ? "Degraded" : "Critical", impact: uptime >= 99 ? "Users have consistent, reliable access." : "Users face periods of total connectivity loss.", color: uptime >= 99 ? C.green : C.red },
  ];

  metrics.forEach(met => {
    y = checkSpace(26);
    roundRect(doc, m, y, cw, 22, 2, C.card, C.border);
    // Left accent bar
    doc.setFillColor(...met.color); doc.rect(m + 1, y + 3, 1.5, 16, "F");
    // Label
    doc.setFontSize(7.5); doc.setTextColor(...C.muted); doc.setFont("helvetica", "normal");
    doc.text(met.label, m + 6, y + 6);
    // Value
    doc.setFontSize(14); doc.setTextColor(...C.white); doc.setFont("helvetica", "bold");
    doc.text(met.val, m + 6, y + 13);
    // Badge (right-aligned)
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
    const badgeTxt = met.interp.toUpperCase();
    const badgeW = doc.getTextWidth(badgeTxt) + 6;
    const badgeX = m + cw - badgeW - 5;
    // Tinted background (darker version of accent)
    doc.setFillColor(Math.round(met.color[0] * 0.2), Math.round(met.color[1] * 0.2), Math.round(met.color[2] * 0.2));
    doc.roundedRect(badgeX, y + 4, badgeW, 6, 1, 1, "F");
    doc.setTextColor(...met.color);
    doc.text(badgeTxt, badgeX + 3, y + 8.5);
    // Impact
    doc.setFontSize(7.5); doc.setTextColor(...C.muted); doc.setFont("helvetica", "normal");
    const impLines = doc.splitTextToSize(`Impact: ${met.impact}`, cw - 12);
    doc.text(impLines, m + 6, y + 18);
    y += 24;
  });

  // ══════════════════ 3. DETECTED ISSUES & ANOMALIES ══════════════════
  sectionTitle("3. Detected Issues & Anomalies");

  if (maxPL > 5) {
    bullet(`Packet Loss Event (${plSpikeTime}): Loss spiked to ${maxPL}%. Possible causes include hardware failure, extreme congestion, or routing problems. Severity: HIGH.`);
  } else {
    bullet("No significant packet loss anomalies detected during the monitoring period.");
  }
  if (maxLat > 100) {
    bullet(`Extreme Latency Spike (${latSpikeTime}): Latency jumped to ${maxLat}ms. Likely caused by a large unthrottled file transfer or temporary network saturation. Severity: HIGH.`);
  }
  if (alerts > 0) {
    bullet(`${alerts} active critical alerts are currently unresolved across the infrastructure. Severity: HIGH.`);
  }
  if (offlineDev > 0) {
    bullet(`${offlineDev} device(s) are currently offline and unreachable. Severity: ${offlineDev > 2 ? "HIGH" : "MEDIUM"}.`);
  }
  if (maxPL <= 5 && maxLat <= 100 && alerts === 0 && offlineDev === 0) {
    para("No anomalies or issues detected. The network is operating within normal parameters.");
  }
  y += 2;

  // ══════════════════ 4. TREND ANALYSIS ══════════════════
  sectionTitle("4. Trend Analysis");

  if (maxLat > 100) {
    para(`Latency: The average latency of ${avgLat}ms indicates generally acceptable performance. However, a sharp spike to ${maxLat}ms was observed near ${latSpikeTime}, representing a ${Math.round(maxLat / avgLat)}x increase over the baseline. This spike was temporary but severe enough to disrupt real-time services during that window.`);
  } else {
    para(`Latency: Network latency remained consistently stable around ${avgLat}ms throughout the monitoring period with no significant deviations, indicating a healthy and well-managed network path.`);
  }

  if (maxPL > 5) {
    para(`Packet Loss: A progressive escalation in packet loss was observed, culminating in a peak of ${maxPL}% around ${plSpikeTime}. This pattern suggests either a degrading hardware component (e.g., a failing switch port) or a routing instability event that eventually resolved.`);
  } else {
    para("Packet Loss: Packet loss remained near zero throughout the entire period, contributing to stable and reliable connections for all users.");
  }

  if (trafficData.length > 0) {
    const maxTraffic = Math.max(...trafficData.map(t => t.value || 0));
    const maxTrafficPeriod = trafficData.find(t => t.value === maxTraffic)?.period || "N/A";
    para(`Bandwidth: Traffic peaked at ${maxTraffic.toFixed(0)} MB during the ${maxTrafficPeriod} window. ${maxTraffic > totalMB * 0.5 ? "This single burst accounted for a disproportionate share of total traffic, suggesting an automated backup, large file transfer, or software update." : "Traffic distribution was relatively even across the monitoring period."}`);
  }

  // ══════════════════ 5. IMPACT ON USERS ══════════════════
  sectionTitle("5. Impact on Users");

  if (health === "Critical") {
    bullet("Users likely experienced dropped VPN sessions, failed VoIP calls, and complete connectivity blackouts during downtime windows.");
    bullet("Video conferencing would have suffered severe freezing and audio dropouts during the packet loss event.");
    bullet("Web applications and cloud services would have been intermittently unreachable.");
  } else if (health === "Moderate") {
    bullet("Users may have noticed occasional buffering on video streams and sluggish response times during peak usage.");
    if (maxLat > 100) bullet(`During the ${latSpikeTime} latency spike, page loads and application responses would have been noticeably delayed.`);
    if (alerts > 0) bullet("Active alerts may indicate degraded service for specific network segments.");
  } else {
    bullet("Users enjoyed a seamless, stable network experience with no noticeable interruptions or performance degradation.");
  }
  y += 2;

  // ══════════════════ 6. RECOMMENDATIONS ══════════════════
  sectionTitle("6. Recommendations");

  if (alerts > 0) bullet(`Review Alerts: Immediately investigate the ${alerts} active critical alerts to identify and resolve the root causes.`);
  if (maxPL > 5) bullet(`Check Hardware: Inspect switch interfaces, cables, and port error counters around the ${plSpikeTime} timeframe for failing components.`);
  if (maxLat > 100) bullet(`Traffic Shaping: Implement QoS (Quality of Service) policies to prevent large, unthrottled transfers from saturating the network and spiking latency.`);
  if (offlineDev > 0) bullet(`Restore Offline Devices: Investigate the ${offlineDev} offline device(s) — check power, cabling, and remote management interfaces.`);
  if (uptime < 99) bullet(`Improve Redundancy: An uptime of ${uptime}% suggests single points of failure. Consider redundant links, failover switches, or UPS backup power.`);
  bullet("Set Thresholds: Configure automated alerts for latency > 100ms, packet loss > 2%, and uptime drops below 99% for proactive monitoring.");
  if (health === "Good") bullet("Maintain Monitoring: No critical action required. Continue baseline monitoring to catch emerging trends early.");
  y += 4;

  // ══════════════════ DEVICE TABLE ══════════════════
  if (devices.length > 0) {
    sectionTitle("7. Device Performance Summary");

    const colW = [42, 38, 24, 24, 22, 28];
    const headers = ["Device", "IP Address", "Latency", "Pkt Loss", "Status", "Health"];
    const rowH = 7;

    y = checkSpace(12 + rowH);
    roundRect(doc, m, y, cw, rowH + 1, 1.5, [15, 15, 15]);
    doc.setFontSize(7); doc.setTextColor(...C.gold); doc.setFont("helvetica", "bold");
    let cx = m + 3;
    headers.forEach((h, i) => { doc.text(h, cx, y + 5); cx += colW[i]; });
    y += rowH + 2;

    devices.forEach((dev, ri) => {
      y = checkSpace(rowH + 1);
      const rbg = ri % 2 === 0 ? [20, 20, 20] as [number, number, number] : [30, 30, 30] as [number, number, number];
      doc.setFillColor(...rbg); doc.rect(m, y, cw, rowH, "F");
      doc.setDrawColor(...C.border); doc.setLineWidth(0.1); doc.line(m, y + rowH, m + cw, y + rowH);

      cx = m + 3;
      doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...C.white);
      doc.text((dev.name || "").substring(0, 24), cx, y + 4.5); cx += colW[0];

      doc.setFont("helvetica", "normal"); doc.setTextColor(...C.dim);
      doc.text(dev.ip || "", cx, y + 4.5); cx += colW[1];

      doc.setTextColor(...C.text);
      doc.text(`${dev.latency}ms`, cx, y + 4.5); cx += colW[2];
      doc.text(`${dev.packetLoss}%`, cx, y + 4.5); cx += colW[3];

      // Status badge
      const isOnline = dev.status === "Online";
      doc.setFillColor(...(isOnline ? C.greenBg : C.redBg));
      doc.roundedRect(cx - 1, y + 1, 16, 5, 1, 1, "F");
      doc.setFillColor(...(isOnline ? C.green : C.red));
      doc.circle(cx + 1, y + 3.5, 0.7, "F");
      doc.setTextColor(...(isOnline ? C.green : C.red));
      doc.setFontSize(5.5); doc.setFont("helvetica", "bold");
      doc.text(dev.status, cx + 3, y + 4.5);
      cx += colW[4];

      // Health bar
      const barW = colW[5] - 6;
      doc.setFillColor(30, 30, 30); doc.rect(cx, y + 2.5, barW, 2.5, "F");
      const pct = isOnline ? 1 : 0;
      doc.setFillColor(...(isOnline ? C.green : C.red));
      doc.rect(cx, y + 2.5, barW * pct, 2.5, "F");

      y += rowH;
    });
  }

  // ══════════════════ FINALIZE ══════════════════
  footer();
  // Bottom gold bar on last page
  gradientBar(doc, 0, ph - 3, pw, 3);

  doc.save(`NetSight_Network_Report_${startDate || "live"}_to_${endDate || "now"}.pdf`);
}
