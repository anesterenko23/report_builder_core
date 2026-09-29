import { normalizeDispute, normalizeTransaction } from './normalize.js';
import { uniq } from '../utils/fields.js';

const round2 = n => +Number(n || 0).toFixed(2);
const cleanEmail = v => v ? String(v).trim().toLowerCase() : null;

function duplicateIds(rows) {
  const counts = new Map();
  for (const row of rows) if (row.pm) counts.set(row.pm, (counts.get(row.pm) || 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([pm, count]) => ({ pm, count }));
}

function group(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row) || 'Unknown';
    if (!map.has(key)) map.set(key, { name:key, count:0, amount:0, disputeAmount:0, clients:new Set() });
    const item = map.get(key);
    item.count += 1;
    item.amount += Number(row.transaction?.amount || 0);
    item.disputeAmount += Number(row.dispute?.providerDisputeAmount || 0);
    const client = cleanEmail(row.transaction?.email) || row.transaction?.customerId;
    if (client) item.clients.add(client);
  }
  return [...map.values()].map(x => ({
    name:x.name, count:x.count, amount:round2(x.amount), disputeAmount:round2(x.disputeAmount), uniqueClients:x.clients.size
  })).sort((a,b) => b.count-a.count || b.amount-a.amount);
}

export function analyze(disputeRows, transactionRows) {
  const disputes = disputeRows.map(normalizeDispute);
  const transactions = transactionRows.map(normalizeTransaction);
  const txByPm = new Map();
  for (const tx of transactions) if (tx.pm && !txByPm.has(tx.pm)) txByPm.set(tx.pm, tx);

  const joined = disputes.map(dispute => ({ dispute, transaction: dispute.pm ? txByPm.get(dispute.pm) || null : null }));
  const matchedRows = joined.filter(x => x.transaction);
  const unmatchedPm = joined.filter(x => x.dispute.pm && !x.transaction).map(x => x.dispute.pm);
  const missingPmRows = joined.filter(x => !x.dispute.pm).map(x => x.dispute._sourceIndex);

  const clientMap = new Map();
  for (const row of matchedRows) {
    const tx = row.transaction;
    const key = cleanEmail(tx.email) || String(tx.customerId || 'Unknown');
    if (!clientMap.has(key)) clientMap.set(key, {
      key, email:cleanEmail(tx.email), customerId:tx.customerId,
      name:[tx.firstName, tx.lastName].filter(Boolean).join(' ').trim(), country:tx.country,
      count:0, amount:0, providers:new Set(), merchants:new Set(), projects:new Set(), cards:new Set(), cardCountries:new Set(), panIds:new Set()
    });
    const c = clientMap.get(key);
    c.count += 1; c.amount += Number(tx.amount || 0);
    if (row.dispute.provider) c.providers.add(row.dispute.provider);
    if (tx.merchantName) c.merchants.add(tx.merchantName);
    if (tx.projectName) c.projects.add(tx.projectName);
    if (tx.pan) c.cards.add(tx.pan);
    if (tx.cardCountry) c.cardCountries.add(tx.cardCountry);
    if (tx.panId) c.panIds.add(tx.panId);
  }

  const clients = [...clientMap.values()].map(c => ({...c, amount:round2(c.amount), providers:[...c.providers], merchants:[...c.merchants], projects:[...c.projects], cards:[...c.cards], cardCountries:[...c.cardCountries], panIds:[...c.panIds]})).sort((a,b)=>b.count-a.count||b.amount-a.amount);
  const totalTransactionAmount = matchedRows.reduce((s,r)=>s+Number(r.transaction.amount||0),0);
  const totalProviderDisputeAmount = joined.reduce((s,r)=>s+Number(r.dispute.providerDisputeAmount||0),0);
  const statuses = Object.fromEntries([...new Set(matchedRows.map(r=>r.transaction.status||'Unknown'))].map(status=>[status,matchedRows.filter(r=>(r.transaction.status||'Unknown')===status).length]));

  return {
    qa:{
      disputesLoaded:disputes.length, uniqueDisputePm:uniq(disputes.map(x=>x.pm)).length,
      transactionsLoaded:transactions.length, uniqueTransactionPm:uniq(transactions.map(x=>x.pm)).length,
      matched:matchedRows.length, unmatched:unmatchedPm.length,
      matchRate:disputes.length?round2(matchedRows.length/disputes.length*100):0,
      missingPmRows, unmatchedPm,
      duplicateDisputePm:duplicateIds(disputes), duplicateTransactionPm:duplicateIds(transactions)
    },
    metrics:{
      totalChargebacks:disputes.length, totalTransactionAmount:round2(totalTransactionAmount), totalProviderDisputeAmount:round2(totalProviderDisputeAmount),
      averageTransactionAmount:matchedRows.length?round2(totalTransactionAmount/matchedRows.length):0,
      uniqueClients:clients.length, repeatClients:clients.filter(x=>x.count>1).length,
      uniqueProviders:uniq(disputes.map(x=>x.provider)).length,
      uniqueMerchants:uniq(matchedRows.map(x=>x.transaction.merchantName)).length,
      uniqueProjects:uniq(matchedRows.map(x=>x.transaction.projectName)).length,
      statuses
    },
    providers:group(joined,r=>r.dispute.provider),
    merchants:group(matchedRows,r=>r.transaction.merchantName),
    projects:group(matchedRows,r=>r.transaction.projectName),
    clients, rows:joined
  };
}
