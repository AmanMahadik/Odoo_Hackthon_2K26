// Export utilities for reports (CSV and professional light PDF)
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

export const exportToPDF = async (reportData: any[], totals: any, formatCurrency: (val: number) => string = (v) => `$${v.toFixed(2)}`) => {
  const html = getPDFTemplate(reportData, totals, formatCurrency);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '900px';
  iframe.style.height = '1200px';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.border = 'none';
  iframe.srcdoc = html;
  document.body.appendChild(iframe);

  const cleanup = () => {
    if (iframe.parentElement) document.body.removeChild(iframe);
  };

  const capture = async () => {
    try {
      const doc = iframe.contentDocument;
      if (!doc?.body) throw new Error('Iframe document unavailable');

      // Wait for layout
      await new Promise((r) => setTimeout(r, 200));

      const html2canvasModule = await import('html2canvas');
      const jsPDFModule = await import('jspdf');
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;

      const canvas = await html2canvas(doc.body as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 900,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pageW - margin * 2;
      const imgH = (canvas.height / canvas.width) * usableW;

      let heightLeft = imgH;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, usableW, imgH);
      heightLeft -= pageH - margin * 2;

      while (heightLeft > 0) {
        position = margin - (imgH - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, usableW, imgH);
        heightLeft -= pageH - margin * 2;
      }

      const stamp = new Date().toISOString().slice(0, 10);
      pdf.save(`TransitOps_Fleet_Report_${stamp}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      // Fallback: open printable HTML window
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 400);
      }
    } finally {
      cleanup();
    }
  };

  iframe.onload = () => capture();
  setTimeout(capture, 600);
};

const getPDFTemplate = (reportData: any[], totals: any, formatCurrency: (val: number) => string) => {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const money = (val: number) => formatCurrency(val);
  const pct = (val: number) => `${Number(val).toFixed(1)}%`;

  const rows = reportData
    .map(
      (v) => `
    <tr>
      <td class="left">
        <div class="vid">${v.registrationNumber}</div>
        <div class="vmodel">${v.model}</div>
      </td>
      <td>${money(v.fuelCost)}</td>
      <td>${money(v.maintenanceCost)}</td>
      <td>${money(v.otherExpenses)}</td>
      <td>${money(v.totalCosts)}</td>
      <td>${money(v.totalRevenues)}</td>
      <td class="${v.netProfit >= 0 ? 'pos' : 'neg'}">${money(v.netProfit)}</td>
      <td>${v.fuelEfficiency > 0 ? `${v.fuelEfficiency.toFixed(1)} km/L` : '—'}</td>
      <td class="${v.roiPercentage >= 0 ? 'pos' : 'neg'}">${pct(v.roiPercentage)}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>TransitOps Fleet Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
    background: #ffffff;
    color: #0f172a;
    font-size: 12px;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 860px;
    margin: 0 auto;
    padding: 36px 40px 48px;
    background: #fff;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 18px;
    border-bottom: 2px solid #0f172a;
    margin-bottom: 22px;
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .logo {
    width: 36px; height: 36px; border-radius: 8px;
    background: #0f172a; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 600; font-size: 15px;
  }
  .brand h1 { font-size: 18px; font-weight: 600; letter-spacing: -0.02em; }
  .brand p { font-size: 10px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.08em; }
  .meta { text-align: right; font-size: 11px; color: #64748b; }
  .meta strong { color: #0f172a; font-weight: 500; }
  .title-block { margin-bottom: 20px; }
  .title-block h2 { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; }
  .title-block p { font-size: 12px; color: #64748b; margin-top: 4px; }
  .kpis {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }
  .kpi {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 16px;
    background: #f8fafc;
  }
  .kpi .label {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
    color: #64748b; margin-bottom: 6px; font-weight: 500;
  }
  .kpi .value { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
  .kpi .note { font-size: 10px; color: #94a3b8; margin-top: 4px; }
  .kpi.profit .value { color: #059669; }
  .kpi.cost .value { color: #0f172a; }
  .kpi.roi .value { color: #0369a1; }
  h3 {
    font-size: 13px; font-weight: 600; margin-bottom: 10px;
    color: #0f172a;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }
  thead th {
    background: #f1f5f9;
    color: #475569;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
    padding: 10px 8px;
    text-align: right;
    border-bottom: 1px solid #e2e8f0;
  }
  thead th.left { text-align: left; }
  tbody td {
    padding: 9px 8px;
    border-bottom: 1px solid #f1f5f9;
    text-align: right;
    color: #334155;
    font-variant-numeric: tabular-nums;
    font-weight: 400;
  }
  tbody td.left { text-align: left; }
  tbody tr:last-child td { border-bottom: none; }
  .vid { font-weight: 600; color: #0f172a; font-size: 11px; }
  .vmodel { font-size: 10px; color: #94a3b8; margin-top: 1px; }
  .pos { color: #059669; font-weight: 500; }
  .neg { color: #dc2626; font-weight: 500; }
  .total-row td {
    background: #f8fafc;
    border-top: 2px solid #e2e8f0;
    font-weight: 600;
    color: #0f172a;
  }
  .footer {
    margin-top: 28px;
    padding-top: 14px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #94a3b8;
  }
  .disclaimer {
    margin-top: 16px;
    font-size: 9px;
    color: #94a3b8;
    line-height: 1.5;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">T</div>
        <div>
          <h1>TransitOps</h1>
          <p>Smart Transport Operations</p>
        </div>
      </div>
      <div class="meta">
        <div><strong>Generated</strong> ${dateStr}</div>
        <div>${timeStr}</div>
        <div style="margin-top:4px">Confidential · Internal use</div>
      </div>
    </div>

    <div class="title-block">
      <h2>Fleet Financial Report &amp; ROI</h2>
      <p>Vehicle-level costs, revenue, profit, and return on acquisition</p>
    </div>

    <div class="kpis">
      <div class="kpi profit">
        <div class="label">Net profit</div>
        <div class="value">${money(totals.netProfit)}</div>
        <div class="note">Revenue ${money(totals.revenues)}</div>
      </div>
      <div class="kpi cost">
        <div class="label">Fleet costs</div>
        <div class="value">${money(totals.costs)}</div>
        <div class="note">Fuel + service + tolls</div>
      </div>
      <div class="kpi roi">
        <div class="label">Average ROI</div>
        <div class="value">${pct(totals.roi)}</div>
        <div class="note">Vs acquisition cost</div>
      </div>
    </div>

    <h3>Vehicle performance ledger</h3>
    <table>
      <thead>
        <tr>
          <th class="left">Vehicle</th>
          <th>Fuel</th>
          <th>Service</th>
          <th>Tolls</th>
          <th>Total cost</th>
          <th>Revenue</th>
          <th>Net profit</th>
          <th>Efficiency</th>
          <th>ROI</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td class="left">Fleet total</td>
          <td>${money(totals.fuel)}</td>
          <td>${money(totals.maintenance)}</td>
          <td>${money(totals.other)}</td>
          <td>${money(totals.costs)}</td>
          <td>${money(totals.revenues)}</td>
          <td class="${totals.netProfit >= 0 ? 'pos' : 'neg'}">${money(totals.netProfit)}</td>
          <td>—</td>
          <td class="${totals.roi >= 0 ? 'pos' : 'neg'}">${pct(totals.roi)}</td>
        </tr>
      </tbody>
    </table>

    <p class="disclaimer">
      Trip revenue modeled at ${formatCurrency(4.00)} per completed km. Figures reflect current sandbox / live data
      at generation time and may include what-if slider adjustments from the Reports workspace.
      This document is intended for internal operational review and printing.
    </p>

    <div class="footer">
      <span>TransitOps · Fleet Financial Report</span>
      <span>Page 1 · ${dateStr}</span>
    </div>
  </div>
</body>
</html>`;
};
