import { useMemo, useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { advisorReadiness, dataCompletenessScore, detectColumnMappings, importHealth, normalizeHeader, normalizeLeadRow, parseCsv, validateLead } from "../services/smartLeadIntake";
import { processLeadBatch } from "../services/leadIntakeService";

const FIELD_OPTIONS = [
  ["unmapped", "Ignore column"], ["firstName", "First name"], ["lastName", "Last name"], ["fullName", "Full name"],
  ["email", "Email"], ["phone", "Phone"], ["address", "Street or full address"], ["city", "City"], ["state", "State"], ["zip", "ZIP"],
  ["currentCarrier", "Current carrier"], ["notes", "Notes"], ["campaign", "Campaign"], ["leadSource", "Lead source"], ["vendor", "Vendor"],
  ["costPerLead", "Cost per lead"], ["purchaseDate", "Purchase date"],
];

function formatPercent(value) { return `${Math.max(0, Math.min(100, Number(value) || 0))}%`; }

export default function LeadIntakeCenter() {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [step, setStep] = useState("upload");
  const [metadata, setMetadata] = useState({ leadSource: "Purchased List", campaign: "", vendor: "", costPerLead: "", purchaseDate: new Date().toISOString().slice(0, 10), batchName: "" });
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [learnedMappings, setLearnedMappings] = useState(() => {
    try { return JSON.parse(localStorage.getItem("connectiq.leadIntake.headerMappings") || "{}"); } catch { return {}; }
  });

  const leads = useMemo(() => rows.map((row) => normalizeLeadRow(row, mappings, metadata)), [rows, mappings, metadata]);
  const validation = useMemo(() => leads.map(validateLead), [leads]);
  const validLeads = useMemo(() => leads.filter((_, index) => validation[index]?.valid), [leads, validation]);
  const invalidCount = validation.filter((item) => !item.valid).length;
  const lowConfidence = mappings.filter((item) => item.confidence < 70 && item.field !== "unmapped").length;

  async function handleFile(selected) {
    if (!selected) return;
    setError("");
    if (!selected.name.toLowerCase().endsWith(".csv") && !selected.name.toLowerCase().endsWith(".tsv")) {
      setError("Please upload a CSV or TSV file.");
      return;
    }
    const text = await selected.text();
    const parsed = parseCsv(text);
    if (!parsed.headers.length || !parsed.rows.length) {
      setError("The file does not contain a header row and at least one lead.");
      return;
    }
    setFile(selected);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMappings(detectColumnMappings(parsed.headers, parsed.rows, { __headerToField: learnedMappings }));
    setMetadata((current) => ({ ...current, batchName: selected.name.replace(/\.(csv|tsv)$/i, "") }));
    setStep("review");
  }

  function updateMapping(source, field) {
    setMappings((current) => {
      const next = current.map((mapping) => {
        if (mapping.source === source) return { ...mapping, field, confidence: 100, reason: "confirmed" };
        if (field !== "unmapped" && mapping.field === field) return { ...mapping, field: "unmapped", confidence: 0, reason: `review: remapped to ${source}` };
        return mapping;
      });
      return next;
    });
    if (field !== "unmapped") {
      const nextLearned = { ...learnedMappings, [normalizeHeader(source)]: field };
      setLearnedMappings(nextLearned);
      localStorage.setItem("connectiq.leadIntake.headerMappings", JSON.stringify(nextLearned));
    }
  }

  async function runImport() {
    setError("");
    setStep("processing");
    try {
      const response = await processLeadBatch(validLeads, { ...metadata, filename: file?.name || "", actor: "ConnectIQ Administrator" }, setProgress);
      setResult(response);
      setStep("complete");
    } catch (importError) {
      setError(importError.message || "The import could not be completed.");
      setStep("review");
    }
  }

  function reset() {
    setFile(null); setRows([]); setHeaders([]); setMappings([]); setProgress(null); setResult(null); setError(""); setStep("upload");
  }

  return (
    <div className="lead-intake-page">
      <header className="lead-intake-hero">
        <div><span className="eyebrow">Revenue Operations</span><h1>Lead Intake Center</h1><p>Upload a lead list. ConnectIQ identifies the columns, validates each record, creates lead cards, runs FCC availability, excludes the current carrier, and prepares advisor-ready recommendations.</p></div>
        {step !== "upload" && <button className="secondary-button" onClick={reset}><RotateCcw size={16}/>Start another import</button>}
      </header>

      {error && <div className="intake-alert error"><AlertTriangle size={18}/>{error}</div>}

      {step === "upload" && (
        <section className="intake-upload-card">
          <input id="lead-csv" type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={(event) => handleFile(event.target.files?.[0])} hidden />
          <label htmlFor="lead-csv" className="intake-drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFile(event.dataTransfer.files?.[0]); }}>
            <UploadCloud size={42}/><h2>Drop your CSV here</h2><p>ConnectIQ recognizes flexible headers such as Address, Physical Address, Account Name, Mobile, ISP, and many more. Only a usable address is required.</p><span className="primary-button">Browse files</span>
          </label>
          <div className="intake-promise-grid"><div><CheckCircle2/>No spreadsheet reformatting</div><div><CheckCircle2/>Current-carrier detection</div><div><CheckCircle2/>FCC enrichment and recommendation</div><div><CheckCircle2/>Automatic lead-card creation</div></div>
        </section>
      )}

      {step === "review" && (
        <>
          <section className="intake-summary-grid">
            <div><span>File</span><strong><FileSpreadsheet size={18}/>{file?.name}</strong></div>
            <div><span>Rows found</span><strong>{rows.length}</strong></div>
            <div><span>Ready to import</span><strong>{validLeads.length}</strong></div>
            <div><span>Needs review</span><strong>{invalidCount}</strong></div>
            <div><span>Mapping confidence</span><strong>{formatPercent(Math.round(mappings.reduce((sum, item) => sum + item.confidence, 0) / Math.max(1, mappings.length)))}</strong></div>
          </section>

          <section className="intake-panel">
            <div className="intake-panel-heading"><div><span className="eyebrow">Automatic mapping</span><h2>ConnectIQ recognized {mappings.filter((item) => item.field !== "unmapped").length} of {headers.length} columns</h2></div>{lowConfidence > 0 && <span className="warning-pill">{lowConfidence} need confirmation</span>}</div>
            <div className="mapping-table">
              {mappings.map((mapping) => <div className="mapping-row" key={mapping.source}><div><strong>{mapping.source}</strong><small>{mapping.reason}</small></div><span className={`confidence ${mapping.confidence >= 85 ? "high" : mapping.confidence >= 65 ? "medium" : "low"}`}>{mapping.confidence}%</span><select value={mapping.field} onChange={(event) => updateMapping(mapping.source, event.target.value)}>{FIELD_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>)}
            </div>
          </section>

          <section className="intake-panel">
            <div className="intake-panel-heading"><div><span className="eyebrow">Import settings</span><h2>Campaign and assignment context</h2></div></div>
            <div className="intake-form-grid">
              <label>Batch name<input value={metadata.batchName} onChange={(e)=>setMetadata({...metadata,batchName:e.target.value})}/></label>
              <label>Lead source<input value={metadata.leadSource} onChange={(e)=>setMetadata({...metadata,leadSource:e.target.value})}/></label>
              <label>Campaign<input value={metadata.campaign} onChange={(e)=>setMetadata({...metadata,campaign:e.target.value})} placeholder="Greenville July Outreach"/></label>
              <label>List vendor<input value={metadata.vendor} onChange={(e)=>setMetadata({...metadata,vendor:e.target.value})}/></label>
              <label>Cost per lead<input type="number" min="0" step="0.01" value={metadata.costPerLead} onChange={(e)=>setMetadata({...metadata,costPerLead:e.target.value})}/></label>
              <label>Purchase date<input type="date" value={metadata.purchaseDate} onChange={(e)=>setMetadata({...metadata,purchaseDate:e.target.value})}/></label>
            </div>
          </section>

          <section className="intake-panel">
            <div className="intake-panel-heading"><div><span className="eyebrow">Dry run preview</span><h2>First 10 normalized leads</h2></div><span className="health-pill">Import health {formatPercent(Math.round(((validLeads.length / Math.max(1, leads.length)) * 100)))}</span></div>
            <div className="preview-table-wrap"><table className="preview-table"><thead><tr><th>Status</th><th>Lead</th><th>Contact</th><th>Service address</th><th>Completeness</th><th>Current carrier</th></tr></thead><tbody>{leads.slice(0,10).map((lead,index)=>{ const readiness = advisorReadiness(lead); return <tr key={`${lead.email || lead.address}-${index}`}><td>{validation[index].valid ? <span className={readiness === "needs_contact_research" ? "review-text" : "ready-text"}>{readiness === "ready_to_call" ? "Ready to call" : readiness === "ready_to_email" ? "Ready to email" : "Needs contact research"}</span> : <span className="review-text">Review</span>}</td><td><strong>{lead.name}</strong></td><td>{lead.phone || lead.email || "Not available"}</td><td>{lead.fullAddress || "Missing"}</td><td>{dataCompletenessScore(lead)}%</td><td>{lead.currentCarrier || "Unknown"}</td></tr>})}</tbody></table></div>
            {invalidCount > 0 && <div className="intake-alert warning"><AlertTriangle size={18}/>{invalidCount} rows will be excluded only because they do not contain a usable address. Address-only leads are accepted and marked Needs Contact Research.</div>}
            <div className="intake-actions"><button className="primary-button" disabled={!validLeads.length} onClick={runImport}>Import and enrich {validLeads.length} leads</button></div>
          </section>
        </>
      )}

      {step === "processing" && (
        <section className="intake-panel processing-panel"><Loader2 className="spin" size={38}/><span className="eyebrow">ConnectIQ Factory</span><h2>Creating sales-ready lead cards</h2><p>{progress?.current?.name || "Preparing import..."}</p><div className="progress-track"><div style={{width: `${((progress?.counters?.processed || 0) / Math.max(1, progress?.counters?.total || validLeads.length)) * 100}%`}}/></div><div className="processing-stats"><div><span>Processed</span><strong>{progress?.counters?.processed || 0}/{progress?.counters?.total || validLeads.length}</strong></div><div><span>FCC ready</span><strong>{progress?.counters?.ready || 0}</strong></div><div><span>Needs enrichment</span><strong>{progress?.counters?.needsEnrichment || 0}</strong></div><div><span>Merged</span><strong>{progress?.counters?.merged || 0}</strong></div><div><span>Exceptions</span><strong>{progress?.counters?.failed || 0}</strong></div></div></section>
      )}

      {step === "complete" && (
        <section className="intake-panel completion-panel"><CheckCircle2 size={46}/><span className="eyebrow">Import complete</span><h2>Your lead cards are ready</h2><p>Batch {result?.batchId} has been processed. Imported leads are now available in the Lead Pipeline. Large batches are checkpointed and provider enrichment is deferred to protect the browser.</p><div className="processing-stats"><div><span>FCC ready</span><strong>{result?.results.filter((item)=>item.status==="ready").length || 0}</strong></div><div><span>Queued for provider enrichment</span><strong>{result?.results.filter((item)=>item.status==="queued").length || 0}</strong></div><div><span>Needs address enrichment</span><strong>{result?.results.filter((item)=>item.status==="needs_enrichment").length || 0}</strong></div><div><span>Merged</span><strong>{result?.results.filter((item)=>item.status==="merged").length || 0}</strong></div><div><span>Exceptions</span><strong>{result?.results.filter((item)=>item.status==="failed").length || 0}</strong></div><div><span>Import health</span><strong>{importHealth(validLeads, result?.results || [])}%</strong></div></div><div className="intake-actions"><a className="primary-button" href="/admin/pipeline">Open Lead Pipeline</a><a className="secondary-button" href="/admin/leads">View Lead List</a></div></section>
      )}
    </div>
  );
}
