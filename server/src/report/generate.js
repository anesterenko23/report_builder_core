import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE=path.resolve(__dirname,'../../templates/daily-report-v1.xlsx');
const dash='—';
const clone=v=>v?JSON.parse(JSON.stringify(v)):v;
const fmt=n=>Number(n||0).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
const dateLabel=iso=>{const [y,m,d]=iso.split('-');return `${d}.${m}.${y}`;};
function copyRowStyle(ws,from,to,maxCol){const src=ws.getRow(from),dst=ws.getRow(to);dst.height=src.height;for(let c=1;c<=maxCol;c++){const a=src.getCell(c),b=dst.getCell(c);b.style=clone(a.style);b.numFmt=a.numFmt;b.alignment=clone(a.alignment);b.border=clone(a.border);b.fill=clone(a.fill);b.font=clone(a.font);b.protection=clone(a.protection);}}
function resetRows(ws,start,end,count,styleRow,maxCol){if(end>=start)ws.spliceRows(start,end-start+1);for(let i=0;i<count;i++){ws.spliceRows(start+i,0,[]);copyRowStyle(ws,styleRow<start?styleRow:start+count,start+i,maxCol);}}
function set(ws,row,col,value){ws.getRow(row).getCell(col).value=value??dash;}
function sourceValue(item,source){if(source==='computed.fullName')return [item.transaction?.firstName,item.transaction?.lastName].filter(Boolean).join(' ')||dash;if(source==='computed.disputeEur')return item.dispute?.providerCurrency==='EUR'?item.dispute?.providerDisputeAmount:dash;if(source==='computed.comment')return item.computedComment||dash;const [root,...rest]=source.split('.');let v=item[root];for(const k of rest)v=v?.[k];return v??dash;}
function clientComment(row,analysis){const email=row.transaction?.email?.toLowerCase();const c=analysis.clients.find(x=>x.email===email);if(!c||c.count<2)return dash;const peers=analysis.rows.filter(x=>x.transaction?.email?.toLowerCase()===email);const pos=peers.findIndex(x=>x.dispute.pm===row.dispute.pm)+1;return `${pos}-й из ${c.count} диспутов клиента в этом отчёте`;}

export async function generateReport(analysis,outputPath,{date,config}){
 const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(TEMPLATE);const dl=dateLabel(date);
 // Transaction details: canonical source of all daily numbers.
 const tx=wb.getWorksheet('Транзакции (детализация)');const txCfg=config.sheets.find(s=>s.id==='transactions');
 tx.getCell('A1').value=`Детализация: ${analysis.metrics.totalChargebacks} диспутов, полученных ${dl} (${analysis.providers.map(x=>x.name).join(' + ')})`;
 tx.spliceRows(5,9);for(let i=0;i<analysis.rows.length;i++){tx.spliceRows(5+i,0,[]);copyRowStyle(tx,14,5+i,27);} // style from total row is corrected below from original header palette
 const originalStyleRow=4;
 // restore data-row palette by explicit column styles sampled from template row 5-equivalent colors via header families
 for(let i=0;i<analysis.rows.length;i++){const r=5+i;for(let c=1;c<=27;c++){const cell=tx.getRow(r).getCell(c);const header=tx.getRow(originalStyleRow).getCell(c);cell.border=clone(header.border);cell.alignment={vertical:'top',wrapText:true};cell.font={name:'Calibri',size:10};cell.fill=clone(header.fill);cell.numFmt=(c===3||c===4)?'dd.mm.yyyy hh:mm':(c===14||c===15||c===17)?'#,##0.00':'General';}}
 const columns=txCfg?.columns||[];
 analysis.rows.forEach((item,i)=>{item.computedComment=clientComment(item,analysis);const r=5+i;columns.slice(0,27).forEach((col,j)=>set(tx,r,j+1,sourceValue(item,col.source)));});
 const totalRow=5+analysis.rows.length;tx.spliceRows(totalRow,0,[]);set(tx,totalRow,13,'Итого');set(tx,totalRow,14,analysis.metrics.totalTransactionAmount);set(tx,totalRow,17,analysis.metrics.totalProviderDisputeAmount);set(tx,totalRow,18,'сумма диспутов в EUR по всем провайдерам');
 // Overview
 const ov=wb.getWorksheet('Обзор');ov.getCell('A1').value=`Ежедневный отчёт по чарджбекам — ${dl}`;ov.getCell('A2').value=`${analysis.providers.map(x=>x.name).join(' + ')}. Все ${analysis.metrics.totalChargebacks} диспутов получены от провайдеров ${dl}.`;ov.getCell('A3').value='[AI_INSIGHT_OVERVIEW]';
 const providerStart=8,oldProviderCount=2;ov.spliceRows(providerStart,oldProviderCount);analysis.providers.forEach((p,i)=>{ov.spliceRows(providerStart+i,0,[]);copyRowStyle(ov,providerStart+analysis.providers.length,providerStart+i,6);set(ov,providerStart+i,1,p.name);set(ov,providerStart+i,2,p.count);set(ov,providerStart+i,3,p.amount);set(ov,providerStart+i,4,p.disputeAmount);set(ov,providerStart+i,5,p.uniqueClients);});
 const total=providerStart+analysis.providers.length;set(ov,total,1,'Итого');set(ov,total,2,analysis.metrics.totalChargebacks);set(ov,total,3,analysis.metrics.totalTransactionAmount);set(ov,total,4,analysis.metrics.totalProviderDisputeAmount);set(ov,total,5,analysis.metrics.uniqueClients);
 // KPI section follows template positions shifted by provider delta.
 const shift=analysis.providers.length-oldProviderCount;const k=15+shift;set(ov,k,2,analysis.metrics.totalChargebacks);set(ov,k+1,2,analysis.metrics.totalTransactionAmount);set(ov,k+2,2,analysis.metrics.averageTransactionAmount);set(ov,k+3,2,analysis.metrics.uniqueClients);set(ov,k+4,2,analysis.metrics.repeatClients);set(ov,k+6,2,analysis.metrics.uniqueMerchants);set(ov,k+7,2,analysis.metrics.totalChargebacks);
 // Merchant table: find heading and rebuild below it.
 let merchantHeading=0;for(let r=1;r<=ov.rowCount;r++)if(ov.getCell(r,1).value==='По мерчантам'){merchantHeading=r;break;}if(merchantHeading){const header=merchantHeading+1;analysis.merchants.forEach((m,i)=>{const r=header+1+i;set(ov,r,1,m.name);set(ov,r,2,m.count);set(ov,r,3,m.amount);set(ov,r,4,m.uniqueClients);});}
 // Clients
 const cs=wb.getWorksheet('Клиенты (детализация)');cs.getCell('A1').value=`Детализация: ${analysis.metrics.uniqueClients} клиента с чарджбеками, полученными ${dl}`;cs.spliceRows(5,4);analysis.clients.forEach((c,i)=>{const r=5+i;cs.spliceRows(r,0,[]);set(cs,r,1,c.email);set(cs,r,2,c.name||dash);set(cs,r,3,c.country||dash);set(cs,r,4,c.count);set(cs,r,5,c.amount);set(cs,r,6,c.providers.join(', '));set(cs,r,7,c.merchants.join(', '));set(cs,r,8,c.cards.join(', '));set(cs,r,9,dash);set(cs,r,10,'BLOCK');});
 // Cases: only deterministic same-day concentration; historical repeat requires history input.
 const cases=wb.getWorksheet('Кейсы');cases.getCell('A1').value='Кейсы — концентрация диспутов и повторные клиенты';cases.getCell('A3').value=`Клиенты с несколькими диспутами в отчёте (${analysis.metrics.repeatClients})`;cases.spliceRows(7,2);const repeats=analysis.clients.filter(c=>c.count>1);repeats.forEach((c,i)=>{const r=7+i;cases.spliceRows(r,0,[]);[c.email,c.name,c.providers.join(', '),c.merchants.join(', '),c.count,c.amount,c.cards.join(', '),'BLOCK все транзакции'].forEach((v,j)=>set(cases,r,j+1,v));});
 // Never leave stale 27.09 history/comparison in a new report.
 const comp=wb.getWorksheet('Сравнение с 26.09');if(comp){comp.name='Сравнение';comp.spliceRows(1,comp.rowCount);comp.getCell('A1').value='Сравнение с предыдущим отчётом';comp.getCell('A2').value='Исторический источник не подключён. После подключения history dataset этот лист будет рассчитываться автоматически.';}
 const hist=wb.getWorksheet('История по кейсам');hist.spliceRows(1,hist.rowCount);hist.getCell('A1').value='История чарджбеков клиентов';hist.getCell('A2').value='Исторический источник не подключён — текущий отчёт не подставляет данные 27.09 как историю.';
 const sum=wb.getWorksheet('Итог');sum.getCell('A1').value='Итог';sum.getCell('A2').value='[AI_INSIGHT_FINAL]';
 await wb.xlsx.writeFile(outputPath);
}
