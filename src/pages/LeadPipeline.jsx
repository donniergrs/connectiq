import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { ArrowRight, BriefcaseBusiness, CalendarClock, CircleDollarSign, Filter, GripVertical, HeartPulse, RefreshCw, Search, Sparkles, Undo2, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { buildLeadPipeline, PIPELINE_STAGES } from "../domains/lead/pipeline/pipelineService";
import { assignLeadOwner, moveLeadStage } from "../services/pipelineActions";
import { activeAdvisors, normalizeAdvisor } from "../services/salesTeam";

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
}
function formatDate(value) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(value);
}
function relativeTime(value) {
  if (!value) return "No activity";
  const minutes = Math.max(0, Math.floor((Date.now() - value.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}
function qualityClass(quality) {
  return String(quality || "Needs Review").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
function Metric({ icon: Icon, label, value, detail }) {
  return <article className="pipeline503-metric"><Icon size={20} /><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

function LeadCard({ lead, advisors, onAssign, onDragStart, busy }) {
  return (
    <article className={`pipeline503-card pipeline503-card-compact ${busy ? "is-busy" : ""}`} draggable={!busy} onDragStart={(event) => onDragStart(event, lead)}>
      <div className="pipeline503-card-top">
        <span className={`pipeline503-quality pipeline503-quality-${qualityClass(lead.quality)}`}>{lead.quality}</span>
        <span className="pipeline503-drag"><GripVertical size={14} /> {lead.readiness}%</span>
      </div>
      <div className="pipeline503-person">
        <div>{String(lead.name || "?").slice(0, 1).toUpperCase()}</div>
        <section><h3>{lead.name || "Unknown customer"}</h3><p>{lead.provider} · {lead.plan}</p></section>
      </div>
      <div className="pipeline503-compact-row"><strong>{lead.monthlyPrice ? `${currency(lead.monthlyPrice)}/mo` : "Verify price"}</strong><span>{lead.matchScore || 0}% match</span><span>Health {lead.health}%</span></div>
      <label className="pipeline503-owner" onClick={(event) => event.stopPropagation()}>
        <UserRound size={13} />
        <select value={lead.owner === "Unassigned" ? "" : (lead.assignedAdvisor?.uid || lead.assignedAdvisorUid || lead.owner)} onChange={(event) => onAssign(lead, event.target.value)} disabled={busy}>
          <option value="">Unassigned</option>
          {advisors.map((advisor) => <option value={advisor.uid || advisor.id} key={advisor.uid || advisor.id}>{advisor.name}</option>)}
        </select>
      </label>
      <div className="pipeline503-signals"><span><CalendarClock size={13} /> {formatDate(lead.followUpDate)}</span><span><HeartPulse size={13} /> {relativeTime(lead.lastActivityDate)}</span></div>
      <footer><small>{lead.address || "No address"}</small><Link to={`/admin/leads/${lead.id}`}>Open <ArrowRight size={14} /></Link></footer>
    </article>
  );
}

export default function LeadPipeline() {
  const [leads, setLeads] = useState([]);
  const [advisorRecords, setAdvisorRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("All");
  const [quality, setQuality] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [busyLead, setBusyLead] = useState("");
  const [dragging, setDragging] = useState(null);
  const [dropStage, setDropStage] = useState("");
  const [undoMove, setUndoMove] = useState(null);

  useEffect(() => {
    const leadQuery = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    return onSnapshot(leadQuery, (snapshot) => {
      setLeads(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      setLoading(false); setError("");
    }, (snapshotError) => {
      console.error(snapshotError); setError("Unable to load the lead pipeline. Check Firestore access and try again."); setLoading(false);
    });
  }, []);

  useEffect(() => onSnapshot(collection(db, "advisors"), (snapshot) => {
    setAdvisorRecords(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, (snapshotError) => console.warn("Advisor directory unavailable", snapshotError)), []);

  const advisors = useMemo(() => {
    const records = activeAdvisors(advisorRecords);
    const current = auth.currentUser ? normalizeAdvisor({ id: auth.currentUser.uid, uid: auth.currentUser.uid, name: auth.currentUser.displayName || auth.currentUser.email, email: auth.currentUser.email, role: "Administrator" }) : null;
    if (current && !records.some((advisor) => (advisor.uid || advisor.id) === current.uid)) records.unshift(current);
    return records;
  }, [advisorRecords]);

  const allPipeline = useMemo(() => buildLeadPipeline(leads), [leads]);
  const providers = useMemo(() => ["All", ...new Set(allPipeline.leads.map((lead) => lead.provider).filter(Boolean))], [allPipeline.leads]);
  const qualities = useMemo(() => ["All", ...new Set(allPipeline.leads.map((lead) => lead.quality).filter(Boolean))], [allPipeline.leads]);
  const filteredLeads = useMemo(() => allPipeline.leads.filter((lead) => {
    const haystack = [lead.name, lead.address, lead.email, lead.phone, lead.provider, lead.plan, lead.owner].join(" ").toLowerCase();
    const currentUid = auth.currentUser?.uid;
    const ownerMatch = ownerFilter === "All" || (ownerFilter === "Unassigned" && lead.owner === "Unassigned") || (ownerFilter === "Mine" && currentUid && (lead.assignedAdvisor?.uid === currentUid || lead.assignedAdvisorUid === currentUid)) || lead.owner === ownerFilter;
    return haystack.includes(search.trim().toLowerCase()) && (provider === "All" || lead.provider === provider) && (quality === "All" || lead.quality === quality) && ownerMatch;
  }), [allPipeline.leads, search, provider, quality, ownerFilter]);
  const pipeline = useMemo(() => buildLeadPipeline(filteredLeads), [filteredLeads]);

  async function handleDrop(stage) {
    if (!dragging || dragging.stageId === stage.id) { setDragging(null); setDropStage(""); return; }
    const fromStage = PIPELINE_STAGES.find((item) => item.id === dragging.stageId);
    setBusyLead(dragging.id);
    try {
      await moveLeadStage({ db, leadId: dragging.id, fromStatus: fromStage?.label || dragging.status, toStatus: stage.label, advisor: auth.currentUser });
      setUndoMove({ leadId: dragging.id, fromStatus: fromStage?.label || "New", toStatus: stage.label, name: dragging.name });
      window.setTimeout(() => setUndoMove(null), 8000);
    } catch (moveError) {
      console.error(moveError); setError("The lead could not be moved. Please try again.");
    } finally { setBusyLead(""); setDragging(null); setDropStage(""); }
  }

  async function handleUndo() {
    if (!undoMove) return;
    setBusyLead(undoMove.leadId);
    try {
      await moveLeadStage({ db, leadId: undoMove.leadId, fromStatus: undoMove.toStatus, toStatus: undoMove.fromStatus, advisor: auth.currentUser });
      setUndoMove(null);
    } finally { setBusyLead(""); }
  }

  async function handleAssign(lead, advisorId) {
    const advisorRecord = advisors.find((advisor) => (advisor.uid || advisor.id) === advisorId) || null;
    setBusyLead(lead.id);
    try {
      await assignLeadOwner({ db, leadId: lead.id, previousOwner: lead.owner, advisorRecord, assignedBy: auth.currentUser });
    } catch (assignError) {
      console.error(assignError); setError("The lead owner could not be updated. Please try again.");
    } finally { setBusyLead(""); }
  }

  return (
    <section className="pipeline503-page pipeline503-rc1">
      <div className="pipeline503-sticky-shell">
        <header className="pipeline503-hero"><div><span><BriefcaseBusiness size={15} /> Sales Operations</span><h1>Move, assign, and prioritize every opportunity.</h1><p>Drag leads between stages, keep ownership clear, and work a board designed for large lead volumes.</p></div><div className="pipeline503-hero-actions"><Link to="/admin/team" className="pipeline503-back">Manage team</Link><Link to="/admin" className="pipeline503-back">Dashboard</Link></div></header>
        <div className="pipeline503-metrics"><Metric icon={BriefcaseBusiness} label="Total Leads" value={pipeline.metrics.totalLeads} detail="Visible in this view" /><Metric icon={CircleDollarSign} label="Pipeline Value" value={`${currency(pipeline.metrics.totalMonthlyRevenue)}/mo`} detail="Estimated recurring revenue" /><Metric icon={Sparkles} label="Average Match" value={`${pipeline.metrics.averageMatch}%`} detail="Recommendation fit" /><Metric icon={CalendarClock} label="Need Follow-up" value={pipeline.metrics.needsFollowUp} detail="Due or overdue" /></div>
        <div className="pipeline503-toolbar"><label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, provider, plan, advisor..." /></label><div><Filter size={15} /><select value={provider} onChange={(event) => setProvider(event.target.value)}>{providers.map((item) => <option key={item}>{item}</option>)}</select><select value={quality} onChange={(event) => setQuality(event.target.value)}>{qualities.map((item) => <option key={item}>{item}</option>)}</select><select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}><option>All</option><option>Mine</option><option>Unassigned</option>{advisors.map((advisor) => <option key={advisor.uid || advisor.id}>{advisor.name}</option>)}</select></div></div>
      </div>
      {error && <div className="pipeline503-error">{error}</div>}
      {loading ? <div className="pipeline503-state"><RefreshCw className="is-spinning" /> Loading pipeline intelligence…</div> : <div className="pipeline503-board-wrap"><div className="pipeline503-board">{pipeline.stages.map((stage) => <section className={`pipeline503-column ${dropStage === stage.id ? "is-drop-target" : ""}`} key={stage.id} onDragOver={(event) => { event.preventDefault(); setDropStage(stage.id); }} onDragLeave={() => setDropStage("")} onDrop={() => handleDrop(stage)}><header><div><span>{stage.label}</span><strong>{stage.count}</strong></div><small>{currency(stage.monthlyRevenue)}/mo</small></header><div className="pipeline503-stack">{stage.leads.length ? stage.leads.map((lead) => <LeadCard lead={lead} advisors={advisors} onAssign={handleAssign} onDragStart={(event, item) => { event.dataTransfer.effectAllowed = "move"; setDragging(item); }} busy={busyLead === lead.id} key={lead.id} />) : <div className="pipeline503-empty">Drop a lead here.</div>}</div></section>)}</div></div>}
      {undoMove && <div className="pipeline503-toast"><span>{undoMove.name} moved to {undoMove.toStatus}</span><button type="button" onClick={handleUndo}><Undo2 size={15} /> Undo</button></div>}
    </section>
  );
}
