import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { arrayUnion, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  ExternalLink,
  FileText,
  Gauge,
  HeartPulse,
  Mail,
  MessageSquareText,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wifi,
  RefreshCw,
} from "lucide-react";
import { auth, db } from "../firebase";
import { STATUS_FLOW } from "../services/providerIntelligence";
import { buildLeadWorkspace } from "../services/leadWorkspace";
import { buildWorkspaceJournalEvents, JOURNAL_EVENT_TYPES } from "../services/opportunityJournal";

function currency(value) {
  return value ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value) : "Verify price";
}

function dateTime(value) {
  return value instanceof Date ? value.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Recently";
}

function JournalIcon({ type }) {
  const Icon = {
    [JOURNAL_EVENT_TYPES.STATUS_CHANGE]: RefreshCw,
    [JOURNAL_EVENT_TYPES.ADVISOR_NOTE]: FileText,
    [JOURNAL_EVENT_TYPES.FOLLOW_UP]: CalendarClock,
    [JOURNAL_EVENT_TYPES.ADVISOR_ACTIVITY]: ClipboardList,
    lead_created: Users,
    recommendation_generated: Sparkles,
    quote_generated: CircleDollarSign,
  }[type] || Clock3;
  return <Icon size={16} />;
}

function qualityClass(value) {
  return String(value || "needs-review").toLowerCase().replace(/\s+/g, "-");
}

function Detail({ label, value }) {
  return <div className="lead502-detail"><span>{label}</span><strong>{value || "Not captured"}</strong></div>;
}

function Panel({ eyebrow, title, icon: Icon, children, className = "" }) {
  return (
    <section className={`lead502-panel ${className}`}>
      <header><div className="lead502-panel-icon"><Icon size={18} /></div><div><span>{eyebrow}</span><h2>{title}</h2></div></header>
      {children}
    </section>
  );
}

export default function LeadDetail() {
  const { leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("New Lead");
  const [advisorNotes, setAdvisorNotes] = useState("");
  const [activityNote, setActivityNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [noteCategory, setNoteCategory] = useState("General");
  const [notePriority, setNotePriority] = useState("Normal");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ref = doc(db, "leads", leadId);
    return onSnapshot(ref, (snapshot) => {
      if (!snapshot.exists()) {
        setError("This lead could not be found.");
        setLoading(false);
        return;
      }
      const data = { id: snapshot.id, ...snapshot.data() };
      setLead(data);
      setStatus(data.status || data.readinessStatus || "New Lead");
      setAdvisorNotes("");
      setFollowUpDate(data.followUpDate || "");
      setError("");
      setLoading(false);
    }, (snapshotError) => {
      console.error(snapshotError);
      setError("Unable to load this lead. Check Firestore access and try again.");
      setLoading(false);
    });
  }, [leadId]);

  const workspace = useMemo(() => buildLeadWorkspace(lead || {}), [lead]);

  async function saveWorkspace() {
    if (!lead) return;
    setSaving(true);
    try {
      const currentStatus = lead.status || lead.readinessStatus || "New Lead";
      const currentFollowUp = lead.followUpDate || "";
      const events = buildWorkspaceJournalEvents({
        previousStatus: currentStatus,
        nextStatus: status,
        previousFollowUp: currentFollowUp,
        nextFollowUp: followUpDate,
        note: advisorNotes,
        noteCategory,
        notePriority,
        activityNote,
        advisor: auth.currentUser,
      });

      const actorName = auth.currentUser?.displayName || auth.currentUser?.email || "Unknown Advisor";
      const update = {
        status,
        followUpDate,
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
        lastModifiedBy: actorName,
      };
      if (advisorNotes.trim()) update.advisorNotes = advisorNotes.trim();
      if (events.length) update.opportunityJournal = arrayUnion(...events);

      await updateDoc(doc(db, "leads", leadId), update);
      setAdvisorNotes("");
      setActivityNote("");
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="lead502-state"><Clock3 className="is-spinning" /><strong>Loading customer workspace…</strong></section>;
  if (error) return <section className="lead502-state lead502-state-error"><strong>{error}</strong><Link to="/admin">Return to dashboard</Link></section>;

  const { customer, household, recommendation, coaching, timeline, health } = workspace;

  return (
    <section className="lead502-page">
      <Link to="/admin" className="lead502-back"><ArrowLeft size={16} /> Back to Advisor Dashboard</Link>

      <header className="lead502-hero">
        <div className="lead502-customer-id">
          <div className="lead502-avatar">{customer.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <span className="lead502-eyebrow"><Sparkles size={14} /> Customer 360</span>
            <h1>{customer.name}</h1>
            <p>{customer.address}</p>
          </div>
        </div>
        <div className="lead502-hero-badges">
          <span className={`lead502-quality lead502-quality-${qualityClass(workspace.quality)}`}>{workspace.quality}</span>
          <span className="lead502-status">{workspace.status}</span>
          <span className="lead502-score">{workspace.readiness}% ready</span>
        </div>
        <div className="lead502-quick-actions">
          {customer.phone !== "Not captured" && <a href={`tel:${customer.phone}`}><Phone size={16} /> Call</a>}
          {customer.email !== "Not captured" && <a href={`mailto:${customer.email}`}><Mail size={16} /> Email</a>}
          <button type="button" onClick={() => document.getElementById("advisor-workflow")?.scrollIntoView({ behavior: "smooth" })}><ClipboardList size={16} /> Update lead</button>
        </div>
      </header>

      <div className="lead502-snapshot-grid">
        <article><Users size={18} /><div><span>Household</span><strong>{household.people || "—"} people</strong><small>{household.devices || "—"} devices</small></div></article>
        <article><Target size={18} /><div><span>Primary priority</span><strong>{household.priority}</strong><small>{household.usage.join(" · ") || "Usage not captured"}</small></div></article>
        <article><CircleDollarSign size={18} /><div><span>Budget / quote</span><strong>{currency(household.budget)} target</strong><small>{currency(recommendation.monthlyPrice)} estimated</small></div></article>
        <article><HeartPulse size={18} /><div><span>Lead health</span><strong>{health.score}% complete</strong><small>{health.missing.length ? `Missing: ${health.missing.join(", ")}` : "Advisor-ready record"}</small></div></article>
      </div>

      <div className="lead502-main-grid">
        <div className="lead502-column">
          <Panel eyebrow="Customer profile" title="Who you are helping" icon={Users}>
            <div className="lead502-detail-grid">
              <Detail label="Email" value={customer.email} />
              <Detail label="Phone" value={customer.phone} />
              <Detail label="Current provider" value={household.currentProvider} />
              <Detail label="Contact consent" value={customer.consent ? "Confirmed" : "Not confirmed"} />
              <Detail label="Household" value={household.people ? `${household.people} people` : "Not captured"} />
              <Detail label="Connected devices" value={household.devices ? `${household.devices} devices` : "Not captured"} />
            </div>
            <div className="lead502-tags">{household.usage.length ? household.usage.map((item) => <span key={item}>{item}</span>) : <small>No usage preferences captured.</small>}</div>
          </Panel>

          <Panel eyebrow="Conversation intelligence" title="What the customer told ConnectIQ" icon={MessageSquareText}>
            <p className="lead502-summary">{workspace.conversationSummary}</p>
          </Panel>

          <Panel eyebrow="Customer timeline" title="Opportunity history" icon={Clock3}>
            <div className="lead502-timeline">
              {timeline.length ? timeline.map((event, index) => (
                <div key={event.id || `${event.type}-${index}`} className={`lead502-journal-event lead502-journal-${event.type}`}>
                  <i><JournalIcon type={event.type} /></i>
                  <div>
                    <strong>{event.title || event.type}</strong>
                    <p>{event.detail}</p>
                    {event.metadata?.category && <div className="lead502-journal-meta"><span>{event.metadata.category}</span><span>{event.metadata.priority}</span></div>}
                    <small>{event.createdBy?.name ? `By ${event.createdBy.name} · ` : ""}{dateTime(event.date)}</small>
                  </div>
                </div>
              )) : <p className="lead502-muted">No timeline events recorded yet.</p>}
            </div>
          </Panel>
        </div>

        <div className="lead502-column">
          <Panel eyebrow="ConnectIQ recommendation" title="Best-fit offer" icon={Wifi} className="lead502-recommendation-panel">
            <div className="lead502-rec-head"><div><span>Recommended provider</span><h3>{recommendation.provider}</h3><p>{recommendation.plan}</p></div><div className="lead502-match"><strong>{recommendation.matchScore || "—"}</strong><span>match</span></div></div>
            <div className="lead502-offer-grid">
              <Detail label="Monthly estimate" value={currency(recommendation.monthlyPrice)} />
              <Detail label="Confidence" value={recommendation.confidence ? `${recommendation.confidence}%` : "Not scored"} />
              <Detail label="Technology" value={recommendation.technology} />
              <Detail label="Download / upload" value={`${recommendation.download || "—"} / ${recommendation.upload || "—"} Mbps`} />
              <Detail label="Installation" value={recommendation.installationMethod} />
              <Detail label="Scheduling" value={recommendation.installationWindow} />
            </div>
            <div className="lead502-reasons"><strong>Why it fits</strong>{recommendation.reasons.length ? recommendation.reasons.map((reason) => <p key={reason}><CheckCircle2 size={14} /> {reason}</p>) : <p><CheckCircle2 size={14} /> Best available fit based on the completed customer profile.</p>}</div>
            {recommendation.nextBest && <div className="lead502-next-best"><span>Next-best alternative</span><strong>{recommendation.nextBest.provider}</strong><small>{recommendation.nextBest.matchScore || "—"} match · {recommendation.nextBest.technology}</small></div>}
          </Panel>

          <Panel eyebrow="AI coaching" title="How to advance this lead" icon={Sparkles} className="lead502-coaching">
            <div><span>Likely objection</span><p>{coaching.likelyObjection}</p></div>
            <div><span>Primary selling point</span><p>{coaching.primarySellingPoint}</p></div>
            <div><span>Recommended next action</span><p>{coaching.nextAction}</p></div>
            {coaching.talkingPoints.length > 0 && <ul>{coaching.talkingPoints.map((point) => <li key={point}>{point}</li>)}</ul>}
          </Panel>
        </div>

        <aside className="lead502-column lead502-actions-column">
          <Panel eyebrow="Advisor actions" title="Move the opportunity forward" icon={Gauge} className="lead502-actions-panel">
            <a className="lead502-action-primary" href={customer.phone !== "Not captured" ? `tel:${customer.phone}` : undefined}><Phone size={16} /> Call customer</a>
            <a href={customer.email !== "Not captured" ? `mailto:${customer.email}?subject=${encodeURIComponent(`Your ConnectIQ recommendation: ${recommendation.provider}`)}` : undefined}><Mail size={16} /> Email recommendation</a>
            <button type="button" onClick={() => document.getElementById("advisor-workflow")?.scrollIntoView({ behavior: "smooth" })}><FileText size={16} /> Add advisor note</button>
            <button type="button" disabled><ExternalLink size={16} /> Prepare order <small>Coming in 5.0.4</small></button>
          </Panel>

          <Panel eyebrow="Record health" title="Ready to act?" icon={ShieldCheck}>
            <div className="lead502-health-ring"><strong>{health.score}%</strong><span>complete</span></div>
            {health.missing.length ? <div className="lead502-missing"><span>Missing information</span>{health.missing.map((item) => <p key={item}>• {item}</p>)}</div> : <p className="lead502-ready"><CheckCircle2 size={16} /> This record contains the core details needed for advisor outreach.</p>}
          </Panel>

          <Panel eyebrow="Advisor workflow" title="Update lead" icon={CalendarClock} className="lead502-workflow" >
            <div id="advisor-workflow">
              <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}>{STATUS_FLOW.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Follow-up date and time<input type="datetime-local" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} /></label>
              <div className="lead502-note-options">
                <label>Note category<select value={noteCategory} onChange={(event) => setNoteCategory(event.target.value)}>{["General", "Scheduling", "Pricing", "Technical", "Competition", "Installation", "Billing", "Escalation"].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Priority<select value={notePriority} onChange={(event) => setNotePriority(event.target.value)}>{["Low", "Normal", "High", "Urgent"].map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
              <label>Advisor note<textarea value={advisorNotes} onChange={(event) => setAdvisorNotes(event.target.value)} placeholder="Document objections, commitments, and next steps. This note will be added to Opportunity History." /></label>
              <label>Activity note<input value={activityNote} onChange={(event) => setActivityNote(event.target.value)} placeholder="Example: Called customer and reviewed quote" /></label>
              <button type="button" className="lead502-save" onClick={saveWorkspace} disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save workspace"}</button>
              {saved && <p className="lead502-saved"><CheckCircle2 size={15} /> Saved successfully.</p>}
            </div>
          </Panel>
        </aside>
      </div>
    </section>
  );
}
