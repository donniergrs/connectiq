import { useEffect, useRef } from "react";
import { Bot, CheckCircle2, Circle, LoaderCircle, UserRound } from "lucide-react";

const LOOKUP_STEPS = [
  "Validating the service address",
  "Checking FCC broadband availability",
  "Comparing fiber, cable, and wireless options",
  "Preparing your household questions",
];

const ORDER_STEPS = [
  "Reviewing your selected provider",
  "Packaging your recommendation and quote",
  "Saving your request securely",
  "Preparing the ConnectIQ follow-up queue",
];

export default function AdvisorConversation({ messages, busy = false, busyMode = "lookup", busyStep = 0 }) {
  const listRef = useRef(null);
  const progressSteps = busyMode === "order" ? ORDER_STEPS : LOOKUP_STEPS;

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages, busy, busyStep]);

  return (
    <aside className="v040-conversation" aria-label="Advisor conversation">
      <div className="v040-conversation-head">
        <div className="v040-avatar"><Bot /></div>
        <div>
          <strong>ConnectIQ Advisor</strong>
          <span><i /> Online and ready to help</span>
        </div>
      </div>

      <div className="v040-message-list" aria-live="polite" ref={listRef}>
        {messages.map((message, index) => (
          <div className={`v040-message is-${message.role}`} key={`${message.role}-${index}-${message.text}`}>
            <div className="v040-message-icon">
              {message.role === "advisor" ? <Bot /> : <UserRound />}
            </div>
            <div>
              <span>{message.role === "advisor" ? "Advisor" : "You"}</span>
              <p>{message.text}</p>
            </div>
          </div>
        ))}

        {busy && (
          <div className="v040-message is-advisor">
            <div className="v040-message-icon"><Bot /></div>
            <div>
              <span>Advisor</span>
              <div className="v040-thinking-card">
                <div className="v040-thinking-title"><LoaderCircle /> Working on it</div>
                <div className="v040-thinking-steps">
                  {progressSteps.map((label, index) => {
                    const complete = index < busyStep;
                    const active = index === busyStep;
                    return (
                      <div className={complete ? "is-complete" : active ? "is-active" : ""} key={label}>
                        {complete ? <CheckCircle2 /> : <Circle />}
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="v040-typing" aria-label="Advisor is typing"><i /><i /><i /></p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
