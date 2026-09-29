import ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';

export async function loadXlsx(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(cell.value ?? '').trim();
  });

  const rows = [];
  for (let r = 2; r <= worksheet.rowCount; r += 1) {
    const obj = {};
    let hasValue = false;
    worksheet.getRow(r).eachCell({ includeEmpty: true }, (cell, col) => {
      const key = headers[col];
      if (!key) return;
      const value = cell.value && typeof cell.value === 'object' && 'text' in cell.value ? cell.value.text : cell.value;
      obj[key] = value ?? null;
      if (value !== null && value !== undefined && String(value).trim() !== '') hasValue = true;
    });
    if (hasValue) rows.push(obj);
  }
  return rows;
}

export function loadCsv(buffer) {
  return parse(buffer.toString('utf8'), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    trim: true
  });
}
