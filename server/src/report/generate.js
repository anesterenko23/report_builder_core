import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(__dirname, '../../templates/daily-report-v1.xlsx');

function findSheet(workbook, preferred, fallbackIndex = 0) {
  return workbook.getWorksheet(preferred) || workbook.worksheets[fallbackIndex] || null;
}

function replaceTokens(workbook, tokens) {
  for (const ws of workbook.worksheets) {
    ws.eachRow(row => row.eachCell(cell => {
      if (typeof cell.value !== 'string') return;
      let text = cell.value;
      for (const [key, value] of Object.entries(tokens)) text = text.split(`{{${key}}}`).join(String(value ?? ''));
      cell.value = text;
    }));
  }
}

function writeTable(ws, startRow, headers, rows) {
  if (!ws) return;
  const headerRow = ws.getRow(startRow);
  headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
  rows.forEach((values, r) => {
    const row = ws.getRow(startRow + 1 + r);
    values.forEach((value, c) => { row.getCell(c + 1).value = value ?? ''; });
  });
}

export async function generateReport(analysis, outputPath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE);

  replaceTokens(workbook, {
    TOTAL_CB: analysis.metrics.totalChargebacks,
    TOTAL_AMOUNT: analysis.metrics.totalTransactionAmount.toFixed(2),
    PROVIDER_AMOUNT: analysis.metrics.totalProviderDisputeAmount.toFixed(2),
    UNIQUE_CLIENTS: analysis.metrics.uniqueClients,
    REPEAT_CLIENTS: analysis.metrics.repeatClients,
    MATCH_RATE: `${analysis.qa.matchRate}%`
  });

  const txSheet = findSheet(workbook, 'Транзакции (детализация)', 4);
  const clientSheet = findSheet(workbook, 'Клиенты (детализация)', 5);

  const txHeaders = ['PM ID','Provider','Project','Merchant','Email','Customer ID','Amount','Currency','Reason','Reason Code','Country','Card Country','PAN','Status'];
  const txRows = analysis.rows.map(({dispute, transaction}) => [
    dispute.pm, dispute.provider, transaction?.projectName, transaction?.merchantIdentifier,
    transaction?.email, transaction?.customerId, transaction?.amount, transaction?.currency,
    dispute.reason, dispute.reasonCode, transaction?.country, transaction?.cardCountry,
    transaction?.pan, transaction?.status
  ]);
  writeTable(txSheet, 2, txHeaders, txRows);

  const clientHeaders = ['Email','Customer ID','Name','Country','CB Count','Total Amount','Providers','Merchants','Projects','Cards','Card Countries'];
  const clientRows = analysis.clients.map(c => [c.email,c.customerId,c.name,c.country,c.count,c.amount,c.providers.join(', '),c.merchants.join(', '),c.projects.join(', '),c.cards.join(', '),c.cardCountries.join(', ')]);
  writeTable(clientSheet, 2, clientHeaders, clientRows);

  let qa = workbook.getWorksheet('QA');
  if (!qa) qa = workbook.addWorksheet('QA');
  qa.spliceRows(1, qa.rowCount || 1);
  const qaRows = [
    ['Metric','Value'],
    ['Disputes loaded', analysis.qa.disputesLoaded],
    ['Unique dispute PM', analysis.qa.uniqueDisputePm],
    ['Transactions loaded', analysis.qa.transactionsLoaded],
    ['Unique transaction PM', analysis.qa.uniqueTransactionPm],
    ['Matched', analysis.qa.matched],
    ['Unmatched', analysis.qa.unmatched],
    ['Match rate', `${analysis.qa.matchRate}%`],
    ['Missing PM rows', analysis.qa.missingPmRows.join(', ')],
    ['Unmatched PM', analysis.qa.unmatchedPm.join(', ')],
    ['Duplicate dispute PM', analysis.qa.duplicateDisputePm.map(x => `${x.pm} (${x.count})`).join(', ')],
    ['Duplicate transaction PM', analysis.qa.duplicateTransactionPm.map(x => `${x.pm} (${x.count})`).join(', ')]
  ];
  qaRows.forEach((values, r) => values.forEach((value, c) => qa.getRow(r+1).getCell(c+1).value = value));
  qa.columns = [{width:28},{width:90}];

  await workbook.xlsx.writeFile(outputPath);
}
