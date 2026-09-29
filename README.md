# Report Builder Core — MVP

React + Node.js MVP for deterministic chargeback report generation.

## Goal

Input:
- `disputes_merged_*.xlsx`
- `transactions_id_*.csv`

Processing:
- normalize source fields
- merge by PM / transaction identifier
- validate missing and duplicate IDs
- calculate report metrics in JavaScript only
- populate an Excel report based on the 27.09 master template

Output:
- `.xlsx` report
- `metrics.json`-compatible response for a later AI narrative layer

AI is intentionally excluded from calculations.

## Run

```bash
npm install
npm run dev
```

- UI: http://localhost:5173
- API: http://localhost:3001

## MVP workflow

1. Open the UI.
2. Upload disputes XLSX and transactions CSV.
3. Click **Validate files**.
4. Review QA: dispute count, unique PMs, matched, missing, duplicate IDs.
5. Click **Generate report**.
6. Download the generated Excel file.

## Architecture

- `web/` — React UI. No business calculations.
- `server/` — Node.js API, parsers, validator, metrics engine and Excel writer.
- `shared/report-config.json` — report structure configuration used as the starting point for future UI editing.
- `server/templates/daily-report-v1.xlsx` — master Excel template based on the 27.09 report.

## Extending the report

The direction is configuration-first:

- New field: add a normalized source field / metric, then map it in `shared/report-config.json`.
- New sheet: add a new sheet config and a renderer for its dataset/aggregation type.
- Existing visual design stays in the Excel master template when possible.

This MVP intentionally focuses on a stable reporting engine first. A visual report builder can be layered on top of the same config later.
