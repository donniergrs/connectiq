const steps = ["Address", "Needs", "Recommendation", "Quote", "Order"];
export default function AdvisorProgress({ activeIndex }) {
  return <div className="v040-progress">{steps.map((step, index) => <div className={index <= activeIndex ? "is-active" : ""} key={step}><i>{index + 1}</i><span>{step}</span></div>)}</div>;
}
