import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [disputes, setDisputes] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const form = () => {
    const fd = new FormData();
    fd.append('disputes', disputes);
    fd.append('transactions', transactions);
    fd.append('date', date);
    return fd;
  };

  async function validate() {
    setBusy(true); setError('');
    try {
      const r = await fetch(`${API}/api/validate`, { method:'POST', body: form() });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Validation failed');
      setResult(json);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function generate() {
    setBusy(true); setError('');
    try {
      const r = await fetch(`${API}/api/generate`, { method:'POST', body: form() });
      if (!r.ok) { const json = await r.json(); throw new Error(json.error || 'Generation failed'); }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `chargeback_report_${date.replaceAll('-','_')}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const ready = disputes && transactions;
  return <main>
    <header><h1>Report Builder Core</h1><p>Chargeback report MVP</p></header>
    <section className="card">
      <h2>Generate daily report</h2>
      <label>Report date<input type="date" value={date} onChange={e=>setDate(e.target.value)} /></label>
      <label>Disputes merged (.xlsx)<input type="file" accept=".xlsx" onChange={e=>setDisputes(e.target.files[0] || null)} /></label>
      <label>Transactions ID (.csv)<input type="file" accept=".csv" onChange={e=>setTransactions(e.target.files[0] || null)} /></label>
      <div className="actions"><button disabled={!ready || busy} onClick={validate}>Validate files</button><button disabled={!ready || busy} onClick={generate}>Generate report</button></div>
      {error && <div className="error">{error}</div>}
    </section>
    {result && <>
      <section className="grid">
        <Stat name="Disputes" value={result.qa.disputesLoaded}/><Stat name="Matched" value={result.qa.matched}/><Stat name="Missing" value={result.qa.unmatched}/><Stat name="Match rate" value={`${result.qa.matchRate}%`}/><Stat name="Amount" value={`€${result.metrics.totalTransactionAmount.toFixed(2)}`}/><Stat name="Clients" value={result.metrics.uniqueClients}/>
      </section>
      {(result.qa.unmatchedPm?.length > 0 || result.qa.duplicateDisputePm?.length > 0) && <section className="card warning"><h2>QA warnings</h2>{result.qa.unmatchedPm?.length>0 && <p>Unmatched PM: {result.qa.unmatchedPm.join(', ')}</p>}{result.qa.duplicateDisputePm?.length>0 && <p>Duplicate dispute PM: {result.qa.duplicateDisputePm.map(x=>`${x.pm} (${x.count})`).join(', ')}</p>}</section>}
      <section className="card"><h2>Providers</h2><Table rows={result.providers}/></section>
      <section className="card"><h2>Merchants</h2><Table rows={result.merchants}/></section>
    </>}
  </main>;
}
function Stat({name,value}) { return <div className="stat"><span>{name}</span><strong>{value}</strong></div> }
function Table({rows}) { return <table><thead><tr><th>Name</th><th>CB</th><th>Amount</th><th>Clients</th></tr></thead><tbody>{rows.map(r=><tr key={r.name}><td>{r.name}</td><td>{r.count}</td><td>{r.amount.toFixed(2)}</td><td>{r.uniqueClients}</td></tr>)}</tbody></table> }

createRoot(document.getElementById('root')).render(<App/>);
