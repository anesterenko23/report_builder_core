import cors from 'cors';
import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadCsv, loadXlsx } from './engine/loaders.js';
import { analyze } from './engine/analyze.js';
import { generateReport } from './report/generate.js';
const app=express(),upload=multer({storage:multer.memoryStorage(),limits:{fileSize:30*1024*1024}}),__dirname=path.dirname(fileURLToPath(import.meta.url)),outputDir=path.resolve(__dirname,'../output'),configPath=path.resolve(__dirname,'../../shared/report-config.json');
await fs.mkdir(outputDir,{recursive:true});app.use(cors());app.use(express.json({limit:'3mb'}));
const fields=[{name:'disputes',maxCount:1},{name:'transactions',maxCount:1}];
const readConfig=async()=>JSON.parse(await fs.readFile(configPath,'utf8'));
function getFiles(req){const disputes=req.files?.disputes?.[0],transactions=req.files?.transactions?.[0];if(!disputes||!transactions)throw Error('Both disputes XLSX and transactions CSV are required.');return{disputes,transactions};}
async function analyzeRequest(req){const {disputes,transactions}=getFiles(req),config=await readConfig();return{result:analyze(await loadXlsx(disputes.buffer),loadCsv(transactions.buffer),config),config};}
app.get('/api/health',(_q,r)=>r.json({ok:true}));app.get('/api/config',async(_q,r)=>r.json(await readConfig()));
app.put('/api/config',async(req,res)=>{try{const c=req.body;if(!c||!Array.isArray(c.sheets)||!Array.isArray(c.customSheets))throw Error('Invalid report config');const tx=c.sheets.find(x=>x.id==='transactions');if(!tx||!Array.isArray(tx.columns)||!tx.columns.length)throw Error('Transactions sheet must contain at least one column');await fs.writeFile(configPath,JSON.stringify(c,null,2));res.json({ok:true,config:c});}catch(e){res.status(400).json({error:e.message});}});
app.post('/api/validate',upload.fields(fields),async(req,res)=>{try{const{result}=await analyzeRequest(req);res.json({qa:result.qa,metrics:result.metrics,providers:result.providers,merchants:result.merchants,projects:result.projects,mids:result.mids,clients:result.clients.map(({rows,...x})=>x)});}catch(e){res.status(400).json({error:e.message});}});
app.post('/api/generate',upload.fields(fields),async(req,res)=>{try{const{result,config}=await analyzeRequest(req);if(config.strictMatchRequired&&(result.qa.unmatched||result.qa.missingPmRows.length||result.qa.duplicateDisputePm.length||result.qa.duplicateTransactionPm.length))throw Error(`QA failed: matched ${result.qa.matched}/${result.qa.disputesLoaded}. Fix missing/duplicate PM IDs before report generation.`);const date=String(req.body?.date||new Date().toISOString().slice(0,10)),fileName=`chargeback_report_${date.replaceAll('-','_')}.xlsx`,filePath=path.join(outputDir,fileName);await generateReport(result,filePath,{date,config});res.download(filePath,fileName);}catch(e){res.status(400).json({error:e.message});}});
app.listen(process.env.PORT||3001,()=>console.log(`Report Builder API listening on http://localhost:${process.env.PORT||3001}`));
