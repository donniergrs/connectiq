import { CheckCircle2, Circle, Home, Router, WalletCards } from "lucide-react";

const NEED_LABELS = {
  workFromHome: "Remote work",
  streaming: "Streaming TV",
  gaming: "Online gaming",
  creator: "Content uploads",
  reliability: "Maximum reliability",
};

function profileItem(complete, label, value) {
  return (
    <div className={complete ? "is-complete" : ""}>
      {complete ? <CheckCircle2 /> : <Circle />}
      <span>{label}<b>{value}</b></span>
    </div>
  );
}

export default function CustomerProfile({ address, needs, providers, recommendation }) {
  const activeNeeds = Object.entries(NEED_LABELS).filter(([key]) => Boolean(needs?.[key]));

  return (
    <aside className="v040-profile" aria-label="Customer profile">
      <div className="v040-profile-title">
        <span>Live profile</span>
        <small>Updates as you answer</small>
      </div>

      <div className="v040-profile-core">
        {profileItem(Boolean(address), "Service address", address || "Not entered")}
        {profileItem(Boolean(providers?.length), "Available providers", providers?.length ? `${providers.length} found` : "Waiting for lookup")}
        {profileItem(Boolean(recommendation), "Best match", recommendation?.displayName || "Not calculated")}
      </div>

      <div className="v040-profile-stats">
        <div><Home /><span>Household<b>{needs?.people || 0} people</b></span></div>
        <div><Router /><span>Connected devices<b>{needs?.devices || 0} devices</b></span></div>
        <div><WalletCards /><span>Target budget<b>${needs?.budget || 0}/month</b></span></div>
      </div>

      <div className="v040-profile-needs">
        <strong>Priorities and usage</strong>
        <div>
          {needs?.priority && <span>{needs.priority}</span>}
          {activeNeeds.map(([key, label]) => <span key={key}>{label}</span>)}
          {!needs?.priority && activeNeeds.length === 0 && <small>No preferences selected yet.</small>}
        </div>
      </div>
    </aside>
  );
}
