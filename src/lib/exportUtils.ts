// Export utilities for reports (CSV and PDF)
import Papa from 'papaparse';

export const exportToCSV = (filename: string, data: any[]) => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportToPDF = (reportData: any[], totals: any) => {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.innerHTML = getPDFTemplate(reportData, totals);
  document.body.appendChild(container);

  const opt = {
    margin: 0,
    filename: 'TransitOps_Financial_Report.pdf',
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' as const }
  };

  import('html2pdf.js').then((html2pdfModule) => {
    const html2pdf = html2pdfModule.default;
    html2pdf().set(opt).from(container).save().then(() => {
      document.body.removeChild(container);
    });
  });
};

const getPDFTemplate = (reportData: any[], totals: any) => {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  const formatCurrency = (val: number) => `₹${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercent = (val: number) => `${val.toFixed(2)}%`;
  
  // Find max profit for bar scaling (Chart 1)
  const maxProfit = Math.max(...reportData.map(v => v.netProfit), 1);
  const maxROI = Math.max(...reportData.map(v => v.roiPercentage), 1);
  const maxCost = Math.max(...reportData.map(v => v.totalCosts), 1);
  
  const generateChart1Bars = () => reportData.map((v, i) => {
    const x = 55 + (i * 85);
    const height = Math.max((v.netProfit / maxProfit) * 100, 2);
    const y = 115 - height;
    const color = v.netProfit >= 0 ? '#34d399' : '#ef4444';
    return `
      <rect x="${x}" y="${y}" width="46" height="${height}" rx="3" fill="${color}"/>
      <text x="${x + 23}" y="128" font-size="8" fill="#94a3b8" text-anchor="middle">${v.registrationNumber}</text>
      <text x="${x + 23}" y="${y - 5}" font-size="7.5" fill="#d7e0ef" text-anchor="middle">${formatCurrency(v.netProfit)}</text>
    `;
  }).join('');

  const generateChart2Bars = () => reportData.map((v, i) => {
    const x = 55 + (i * 85);
    const height = Math.max((v.roiPercentage / maxROI) * 100, 2);
    const y = 115 - height;
    return `
      <rect x="${x}" y="${y}" width="46" height="${height}" rx="3" fill="#3b82f6"/>
      <text x="${x + 23}" y="128" font-size="8" fill="#94a3b8" text-anchor="middle">${v.registrationNumber}</text>
      <text x="${x + 23}" y="${y - 5}" font-size="7.5" fill="#d7e0ef" text-anchor="middle">${formatPercent(v.roiPercentage)}</text>
    `;
  }).join('');

  const generateChart3Bars = () => reportData.map((v, i) => {
    const x = 110 + (i * 160);
    const totalV = v.fuelCost + v.maintenanceCost + v.otherExpenses || 1;
    const fuelH = (v.fuelCost / maxCost) * 100;
    const maintH = (v.maintenanceCost / maxCost) * 100;
    const tollH = (v.otherExpenses / maxCost) * 100;
    
    return `
      <rect x="${x}" y="${115 - fuelH - maintH - tollH}" width="60" height="${tollH}" fill="#64748b"/>
      <rect x="${x}" y="${115 - fuelH - maintH}" width="60" height="${maintH}" fill="#8b5cf6"/>
      <rect x="${x}" y="${115 - fuelH}" width="60" height="${fuelH}" fill="#3b82f6"/>
      <text x="${x + 30}" y="130" font-size="8.5" fill="#94a3b8" text-anchor="middle">${v.registrationNumber}</text>
    `;
  }).join('');

  const generateTableRows = () => reportData.map(v => `
    <tr>
      <td class="vehicle-cell left"><div class="v-id">${v.registrationNumber}</div><div class="v-model">${v.model}</div></td>
      <td>${formatCurrency(v.fuelCost)}</td>
      <td>${formatCurrency(v.maintenanceCost)}</td>
      <td>${formatCurrency(v.otherExpenses)}</td>
      <td>${formatCurrency(v.totalCosts)}</td>
      <td>${formatCurrency(v.totalRevenues)}</td>
      <td class="profit-pos" style="color: ${v.netProfit >= 0 ? '#34d399' : '#ef4444'}">${formatCurrency(v.netProfit)}</td>
      <td>${v.fuelEfficiency.toFixed(1)} km/L</td>
      <td><span class="roi-badge">${formatPercent(v.roiPercentage)}</span></td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 0; size: A4 landscape; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'DejaVu Sans', Arial, sans-serif; background: #0b1220; color: #e7edf5; }
  .page { padding: 30px 36px 34px 36px; background: #0b1220; width: 1122px; min-height: 793px; }
  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid #1e2b42; margin-bottom: 20px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-icon { width: 34px; height: 34px; background: #3b82f6; border-radius: 9px; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; font-weight: bold; }
  .brand-text .title { font-size: 14px; font-weight: 700; color: #ffffff; }
  .brand-text .subtitle { font-size: 7.5px; color: #6b8bbf; letter-spacing: 1.4px; margin-top: 1px; }
  .meta { text-align: right; font-size: 8px; color: #7d8fab; line-height: 1.5; }
  .report-title-block { margin-bottom: 20px; }
  .report-title { font-size: 19px; font-weight: 700; color: #ffffff; margin: 0; }
  .report-subtitle { font-size: 9px; color: #8ba3c7; margin-top: 3px; }
  .kpi-row { display: flex; gap: 14px; margin-bottom: 22px; }
  .kpi-card { flex: 1; background: #111c30; border: 1px solid #1e2b42; border-radius: 10px; padding: 16px 16px; position: relative; }
  .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 10px 10px 0 0; }
  .kpi-card.profit::before { background: #22c55e; }
  .kpi-card.cost::before { background: #64748b; }
  .kpi-card.roi::before { background: #3b82f6; }
  .kpi-label { font-size: 7.5px; letter-spacing: 1.1px; color: #7d8fab; text-transform: uppercase; font-weight: 600; margin-bottom: 8px; }
  .kpi-value { font-size: 22px; font-weight: 700; margin-bottom: 5px; }
  .kpi-card.profit .kpi-value { color: #34d399; }
  .kpi-card.cost .kpi-value { color: #cbd5e1; }
  .kpi-card.roi .kpi-value { color: #60a5fa; }
  .kpi-footnote { font-size: 7.5px; color: #64748b; }
  .section-title { font-size: 11px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; }
  .chart-row { display: flex; gap: 14px; margin-bottom: 22px; }
  .chart-card { flex: 1; background: #0d1626; border: 1px solid #1e2b42; border-radius: 10px; padding: 14px 16px 10px 16px; }
  .chart-card-title { font-size: 8.5px; font-weight: 700; color: #d7e0ef; margin-bottom: 2px; }
  .chart-card-sub { font-size: 7px; color: #64748b; margin-bottom: 8px; }
  .legend { display: flex; gap: 14px; margin-top: 6px; font-size: 7px; color: #94a3b8; }
  .legend-item { display: flex; align-items: center; gap: 5px; }
  .legend-dot { width: 7px; height: 7px; border-radius: 2px; display: inline-block; }
  .ledger-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
  .ledger-title { font-size: 11px; font-weight: 700; color: #ffffff; }
  .ledger-note { font-size: 8px; color: #7d8fab; }
  table { width: 100%; table-layout: fixed; border-collapse: collapse; background: #0d1626; border-radius: 8px; border: 1px solid #1e2b42; }
  colgroup col.c-vehicle { width: 15%; }
  colgroup col.c-num { width: 10.625%; }
  thead th { background: #131f36; color: #8ba3c7; font-size: 7px; letter-spacing: 0.6px; text-transform: uppercase; font-weight: 700; padding: 9px 8px; text-align: right; border-bottom: 1px solid #1e2b42; white-space: nowrap; }
  thead th.left { text-align: left; }
  tbody td { padding: 10px 8px; font-size: 8.5px; border-bottom: 1px solid #16223a; color: #d7e0ef; text-align: right; font-variant-numeric: tabular-nums; }
  tbody td.left { text-align: left; }
  tbody tr:last-child td { border-bottom: none; }
  .vehicle-cell .v-id { font-weight: 700; color: #ffffff; font-size: 9px; }
  .vehicle-cell .v-model { font-size: 7.5px; color: #7d8fab; margin-top: 1px; }
  .profit-pos { color: #34d399; font-weight: 700; }
  .roi-badge { display: inline-block; background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.35); border-radius: 20px; padding: 2px 9px; font-size: 8px; font-weight: 700; min-width: 42px; text-align: center; }
  tbody tr.total-row td { background: #131f36; border-top: 2px solid #2a3c5c; font-weight: 700; color: #ffffff; }
  .footer { margin-top: 22px; padding-top: 12px; border-top: 1px solid #1e2b42; display: flex; justify-content: space-between; font-size: 7px; color: #5c6d8a; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      <div class="brand-icon">T</div>
      <div class="brand-text">
        <div class="title">TransitOps</div>
        <div class="subtitle">SMART TRANSPORT OPERATIONS PLATFORM</div>
      </div>
    </div>
    <div class="meta">
      Generated: ${dateStr} · ${timeStr}<br>
      Reporting Period: Live Snapshot
    </div>
  </div>

  <div class="report-title-block">
    <div class="report-title">Financial Reports &amp; ROI</div>
    <div class="report-subtitle">Fleet profit metrics and scenario-modeled operational performance</div>
  </div>

  <div class="kpi-row">
    <div class="kpi-card profit">
      <div class="kpi-label">Simulated Net Profit</div>
      <div class="kpi-value">${formatCurrency(totals.netProfit)}</div>
      <div class="kpi-footnote">Revenues: ${formatCurrency(totals.revenues)}</div>
    </div>
    <div class="kpi-card cost">
      <div class="kpi-label">Simulated Fleet Costs</div>
      <div class="kpi-value">${formatCurrency(totals.costs)}</div>
      <div class="kpi-footnote">Includes slider adjustments</div>
    </div>
    <div class="kpi-card roi">
      <div class="kpi-label">Average Fleet ROI</div>
      <div class="kpi-value">${formatPercent(totals.roi)}</div>
      <div class="kpi-footnote">Returns against acquisition</div>
    </div>
  </div>

  <div class="section-title">Fleet Performance Visualized</div>
  <div class="chart-row">
    <div class="chart-card">
      <div class="chart-card-title">Net Profit by Vehicle</div>
      <div class="chart-card-sub">INR (₹), current reporting period</div>
      <svg width="100%" height="150" viewBox="0 0 340 150">
        <line x1="30" y1="10" x2="330" y2="10" stroke="#1e2b42" stroke-width="1"/>
        <line x1="30" y1="45" x2="330" y2="45" stroke="#16223a" stroke-width="1"/>
        <line x1="30" y1="80" x2="330" y2="80" stroke="#16223a" stroke-width="1"/>
        <line x1="30" y1="115" x2="330" y2="115" stroke="#1e2b42" stroke-width="1.2"/>
        ${generateChart1Bars()}
      </svg>
    </div>
    <div class="chart-card">
      <div class="chart-card-title">ROI % by Vehicle</div>
      <div class="chart-card-sub">Return on acquisition cost</div>
      <svg width="100%" height="150" viewBox="0 0 340 150">
        <line x1="30" y1="10" x2="330" y2="10" stroke="#1e2b42" stroke-width="1"/>
        <line x1="30" y1="45" x2="330" y2="45" stroke="#16223a" stroke-width="1"/>
        <line x1="30" y1="80" x2="330" y2="80" stroke="#16223a" stroke-width="1"/>
        <line x1="30" y1="115" x2="330" y2="115" stroke="#1e2b42" stroke-width="1.2"/>
        ${generateChart2Bars()}
      </svg>
    </div>
  </div>

  <div class="chart-row">
    <div class="chart-card" style="flex: 1 1 100%;">
      <div class="chart-card-title">Cost Breakdown by Category</div>
      <div class="chart-card-sub">Fuel vs. Service vs. Toll expenses per vehicle</div>
      <svg width="100%" height="150" viewBox="0 0 720 150">
        <line x1="40" y1="10" x2="700" y2="10" stroke="#1e2b42" stroke-width="1"/>
        <line x1="40" y1="115" x2="700" y2="115" stroke="#1e2b42" stroke-width="1.2"/>
        ${generateChart3Bars()}
      </svg>
      <div class="legend">
        <div class="legend-item"><span class="legend-dot" style="background:#3b82f6;"></span> Fuel Costs</div>
        <div class="legend-item"><span class="legend-dot" style="background:#8b5cf6;"></span> Service Costs</div>
        <div class="legend-item"><span class="legend-dot" style="background:#64748b;"></span> Toll Expenses</div>
      </div>
    </div>
  </div>

  <div class="ledger-header">
    <div class="ledger-title">Vehicle Ledger Performance Summary</div>
    <div class="ledger-note">Trip revenue rate set to ₹4.00/km</div>
  </div>

  <table>
    <colgroup>
      <col class="c-vehicle"><col class="c-num"><col class="c-num"><col class="c-num">
      <col class="c-num"><col class="c-num"><col class="c-num"><col class="c-num"><col class="c-num">
    </colgroup>
    <thead>
      <tr>
        <th class="left">Vehicle</th>
        <th>Fuel Costs</th>
        <th>Service Costs</th>
        <th>Toll Expenses</th>
        <th>Total Costs</th>
        <th>Trip Revenue</th>
        <th>Net Profit</th>
        <th>Fuel Efficiency</th>
        <th>ROI %</th>
      </tr>
    </thead>
    <tbody>
      ${generateTableRows()}
      <tr class="total-row">
        <td class="left">FLEET TOTAL</td>
        <td>${formatCurrency(totals.fuel)}</td>
        <td>${formatCurrency(totals.maintenance)}</td>
        <td>${formatCurrency(totals.other)}</td>
        <td>${formatCurrency(totals.costs)}</td>
        <td>${formatCurrency(totals.revenues)}</td>
        <td class="profit-pos" style="color: ${totals.netProfit >= 0 ? '#34d399' : '#ef4444'}">${formatCurrency(totals.netProfit)}</td>
        <td>—</td>
        <td><span class="roi-badge">${formatPercent(totals.roi)}</span></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>TransitOps · Confidential Financial Report</div>
    <div>Page 1 of 1 · Generated from System Dashboard</div>
  </div>
</div>
</body>
</html>
  `;
};
