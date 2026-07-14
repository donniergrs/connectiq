import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, onSnapshot, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { CheckCircle2, Plus, Users } from "lucide-react";
import { db } from "../firebase";
import { activeAdvisors, normalizeAdvisor, TEAM_ROLES } from "../services/salesTeam";

export default function TeamDirectory() {
  const [records, setRecords] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Sales Advisor");
  const [capacity, setCapacity] = useState(50);
  const [message, setMessage] = useState("");
  useEffect(() => onSnapshot(collection(db, "advisors"), (snapshot) => setRecords(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))), []);
  const advisors = useMemo(() => records.map(normalizeAdvisor).sort((a, b) => a.name.localeCompare(b.name)), [records]);
  async function addAdvisor(event) {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    await addDoc(collection(db, "advisors"), { name: name.trim(), email: email.trim(), role, capacity: Number(capacity || 0), active: true, team: "Sales", createdAt: serverTimestamp() });
    setName(""); setEmail(""); setMessage("Advisor profile added. Create their Firebase Authentication login separately before they sign in.");
  }
  async function toggle(advisor) {
    await updateDoc(doc(db, "advisors", advisor.id), { active: !advisor.active, updatedAt: serverTimestamp() });
  }
  return <section className="team503-page"><header><div><span><Users size={15}/> Sales Team</span><h1>Advisor directory and assignment capacity</h1><p>Profiles listed here appear in lead assignment menus. Login accounts remain managed through Firebase Authentication.</p></div><strong>{activeAdvisors(records).length} active</strong></header><div className="team503-grid"><form onSubmit={addAdvisor}><h2>Add advisor profile</h2><label>Name<input value={name} onChange={(e)=>setName(e.target.value)} required /></label><label>Email<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required /></label><label>Role<select value={role} onChange={(e)=>setRole(e.target.value)}>{TEAM_ROLES.map((item)=><option key={item}>{item}</option>)}</select></label><label>Active lead capacity<input type="number" min="0" value={capacity} onChange={(e)=>setCapacity(e.target.value)} /></label><button type="submit"><Plus size={16}/> Add advisor</button>{message && <p className="team503-message"><CheckCircle2 size={15}/>{message}</p>}</form><div className="team503-list"><h2>Team directory</h2>{advisors.length ? advisors.map((advisor)=><article key={advisor.id}><div className="team503-avatar">{advisor.name.slice(0,1).toUpperCase()}</div><div><strong>{advisor.name}</strong><span>{advisor.email}</span><small>{advisor.role} · Capacity {advisor.capacity || "Not set"}</small></div><button type="button" onClick={()=>toggle(advisor)}>{advisor.active ? "Deactivate" : "Activate"}</button></article>) : <p>No advisor profiles yet.</p>}</div></div></section>;
}
