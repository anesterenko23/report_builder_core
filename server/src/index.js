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
const upload = multer({ storage:multer.memoryStorage(), limits:{fileSize:30*1024*1024} });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '../output');
const configPath = path.resolve(__dirname, '../../shared/report-config.json');
await fs.mkdir(outputDir,{recursive:true});
app.use(cors()); app.use(express.json({limit:'2mb'}));

const fields=[{name:'disputes',maxCount:1},{name:'transactions',maxCount:1}];
function getFiles(req){const disputes=req.files?.disputes?.[0],transactions=req.files?.transactions?.[0];if(!disputes||!transactions)throw new Error('Both disputes XLSX and transactions CSV are required.');return{disputes,transactions};}
async function readConfig(){return JSON.parse(await fs.readFile(configPath,'utf8'));}
async function analyzeRequest(req){const {disputes,transactions}=getFiles(req);return analyze(await loadXlsx(disputes.buffer),loadCsv(transactions.buffer));}

app.get('/api/health',(_req,res)=>res.json({ok:true}));
app.get('/api/config',async(_req,res)=>res.json(await readConfig()));
app.put('/api/config',async(req,res)=>{try{const cfg=req.body;if(!cfg||!Array.isArray(cfg.sheets))throw new Error('Invalid report config');await fs.writeFile(configPath,JSON.stringify(cfg,null,2));res.json({ok:true,config:cfg});}catch(e){res.status(400).json({error:e.message});}});

app.post('/api/validate',upload.fields(fields),async(req,res)=>{try{const result=await analyzeRequest(req);res.json({qa:result.qa,metrics:result.metrics,providers:result.providers,merchants:result.merchants,projects:result.projects,clients:result.clients});}catch(e){res.status(400).json({error:e.message});}});
app.post('/api/generate',upload.fields(fields),async(req,res)=>{try{const result=await analyzeRequest(req);const cfg=await readConfig();if(cfg.strictMatchRequired&&(result.qa.unmatched||result.qa.missingPmRows.length||result.qa.duplicateDisputePm.length))throw new Error(`QA failed: matched ${result.qa.matched}/${result.qa.disputesLoaded}. Fix missing/duplicate PM IDs before report generation.`);const date=String(req.body?.date||new Date().toISOString().slice(0,10));const fileName=`chargeback_report_${date.replaceAll('-','_')}.xlsx`;const filePath=path.join(outputDir,fileName);await generateReport(result,filePath,{date,config:cfg});res.download(filePath,fileName);}catch(e){res.status(400).json({error:e.message});}});

const port=process.env.PORT||3001;app.listen(port,()=>console.log(`Report Builder API listening on http://localhost:${port}`));
