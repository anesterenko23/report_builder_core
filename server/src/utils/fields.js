export function pick(row, names) {
  for (const name of names) {
    const value = row?.[name];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}

export function normalizePm(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim().toUpperCase();
  const match = text.match(/PM[A-Z0-9]+/);
  return match ? match[0] : null;
}

export function number(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value).replace(/\s/g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function uniq(values) {
  return [...new Set(values.filter(v => v !== undefined && v !== null && String(v).trim() !== ''))];
}
