import cors from 'cors';
import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadCsv, loadXlsx } from './engine/loaders.js';
import { analyze } from './engine/analyze.js';
import { generateReport } from './report/generate.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '../output');
await fs.mkdir(outputDir, { recursive: true });

app.use(cors());
app.use(express.json());

function getFiles(req) {
  const disputes = req.files?.disputes?.[0];
  const transactions = req.files?.transactions?.[0];
  if (!disputes || !transactions) throw new Error('Both disputes XLSX and transactions CSV are required.');
  return { disputes, transactions };
}

async function analyzeRequest(req) {
  const { disputes, transactions } = getFiles(req);
  const disputeRows = await loadXlsx(disputes.buffer);
  const transactionRows = loadCsv(transactions.buffer);
  return analyze(disputeRows, transactionRows);
}

const fields = [
  { name: 'disputes', maxCount: 1 },
  { name: 'transactions', maxCount: 1 }
];

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/config', async (_req, res) => {
  const file = await fs.readFile(path.resolve(__dirname, '../../shared/report-config.json'), 'utf8');
  res.type('json').send(file);
});

app.post('/api/validate', upload.fields(fields), async (req, res) => {
  try {
    const result = await analyzeRequest(req);
    res.json({ qa: result.qa, metrics: result.metrics, providers: result.providers, merchants: result.merchants, projects: result.projects });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/generate', upload.fields(fields), async (req, res) => {
  try {
    const result = await analyzeRequest(req);
    const date = String(req.body?.date || new Date().toISOString().slice(0,10)).replaceAll('-', '_');
    const fileName = `chargeback_report_${date}.xlsx`;
    const filePath = path.join(outputDir, fileName);
    await generateReport(result, filePath);
    res.download(filePath, fileName);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Report Builder API listening on http://localhost:${port}`));
