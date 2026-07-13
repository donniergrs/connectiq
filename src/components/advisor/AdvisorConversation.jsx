import { Bot, UserRound } from "lucide-react";

export default function AdvisorConversation({ messages, busy = false }) {
  return (
    <aside className="v040-conversation" aria-label="Advisor conversation">
      <div className="v040-conversation-head">
        <div className="v040-avatar"><Bot /></div>
        <div>
          <strong>ConnectIQ Advisor</strong>
          <span><i /> Online and ready to help</span>
        </div>
      </div>

      <div className="v040-message-list" aria-live="polite">
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
              <p className="v040-typing"><i /><i /><i /></p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
