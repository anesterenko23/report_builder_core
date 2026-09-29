import { normalizeDispute, normalizeTransaction } from './normalize.js';
import { uniq } from '../utils/fields.js';

function duplicateIds(rows) {
  const counts = new Map();
  for (const row of rows) {
    if (!row.pm) continue;
    counts.set(row.pm, (counts.get(row.pm) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([pm, count]) => ({ pm, count }));
}

function group(rows, keyFn, amountFn = () => 0) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row) || 'Unknown';
    if (!map.has(key)) map.set(key, { name: key, count: 0, amount: 0, clients: new Set() });
    const item = map.get(key);
    item.count += 1;
    item.amount += Number(amountFn(row) || 0);
    const client = row.transaction?.email || row.transaction?.customerId;
    if (client) item.clients.add(client);
  }
  return [...map.values()].map(x => ({ name: x.name, count: x.count, amount: +x.amount.toFixed(2), uniqueClients: x.clients.size })).sort((a,b) => b.count-a.count || b.amount-a.amount);
}

export function analyze(disputeRows, transactionRows) {
  const disputes = disputeRows.map(normalizeDispute);
  const transactions = transactionRows.map(normalizeTransaction);
  const txByPm = new Map();
  for (const tx of transactions) if (tx.pm && !txByPm.has(tx.pm)) txByPm.set(tx.pm, tx);

  const joined = disputes.map(dispute => ({ dispute, transaction: dispute.pm ? txByPm.get(dispute.pm) || null : null }));
  const missingPm = joined.filter(x => !x.dispute.pm).map(x => x.dispute._sourceIndex);
  const unmatched = joined.filter(x => x.dispute.pm && !x.transaction).map(x => x.dispute.pm);
  const matchedRows = joined.filter(x => x.transaction);
  const disputeDuplicates = duplicateIds(disputes);
  const transactionDuplicates = duplicateIds(transactions);

  const clientMap = new Map();
  for (const row of matchedRows) {
    const tx = row.transaction;
    const key = tx.email || tx.customerId || 'Unknown';
    if (!clientMap.has(key)) clientMap.set(key, {
      key, email: tx.email, customerId: tx.customerId,
      name: [tx.firstName, tx.lastName].filter(Boolean).join(' '), country: tx.country,
      count: 0, amount: 0, providers: new Set(), merchants: new Set(), projects: new Set(), cards: new Set(), cardCountries: new Set()
    });
    const client = clientMap.get(key);
    client.count += 1;
    client.amount += Number(tx.amount || 0);
    if (row.dispute.provider) client.providers.add(row.dispute.provider);
    if (tx.merchantIdentifier) client.merchants.add(tx.merchantIdentifier);
    if (tx.projectName) client.projects.add(tx.projectName);
    if (tx.pan) client.cards.add(tx.pan);
    if (tx.cardCountry) client.cardCountries.add(tx.cardCountry);
  }

  const clients = [...clientMap.values()].map(c => ({
    ...c,
    amount: +c.amount.toFixed(2),
    providers: [...c.providers], merchants: [...c.merchants], projects: [...c.projects], cards: [...c.cards], cardCountries: [...c.cardCountries]
  })).sort((a,b) => b.count-a.count || b.amount-a.amount);

  const totalTransactionAmount = matchedRows.reduce((sum, row) => sum + Number(row.transaction.amount || 0), 0);
  const totalProviderDisputeAmount = joined.reduce((sum, row) => sum + Number(row.dispute.providerDisputeAmount || 0), 0);

  return {
    qa: {
      disputesLoaded: disputes.length,
      uniqueDisputePm: uniq(disputes.map(x => x.pm)).length,
      transactionsLoaded: transactions.length,
      uniqueTransactionPm: uniq(transactions.map(x => x.pm)).length,
      matched: matchedRows.length,
      unmatched: unmatched.length,
      matchRate: disputes.length ? +(matchedRows.length / disputes.length * 100).toFixed(2) : 0,
      missingPmRows: missingPm,
      unmatchedPm: unmatched,
      duplicateDisputePm: disputeDuplicates,
      duplicateTransactionPm: transactionDuplicates
    },
    metrics: {
      totalChargebacks: disputes.length,
      totalTransactionAmount: +totalTransactionAmount.toFixed(2),
      totalProviderDisputeAmount: +totalProviderDisputeAmount.toFixed(2),
      averageTransactionAmount: matchedRows.length ? +(totalTransactionAmount / matchedRows.length).toFixed(2) : 0,
      uniqueClients: clients.length,
      repeatClients: clients.filter(x => x.count > 1).length,
      uniqueProviders: uniq(disputes.map(x => x.provider)).length,
      uniqueMerchants: uniq(matchedRows.map(x => x.transaction.merchantIdentifier)).length,
      uniqueProjects: uniq(matchedRows.map(x => x.transaction.projectName)).length
    },
    providers: group(joined, x => x.dispute.provider, x => x.transaction?.amount),
    merchants: group(matchedRows, x => x.transaction.merchantIdentifier, x => x.transaction.amount),
    projects: group(matchedRows, x => x.transaction.projectName, x => x.transaction.amount),
    clients,
    rows: joined
  };
}
