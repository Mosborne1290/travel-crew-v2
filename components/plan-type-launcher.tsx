import Link from "next/link";
export function PlanTypeLauncher({tripId}:{tripId:string}){
  return <section className="panel plan-type-launcher">
    <div><div className="eyebrow">+ Create Plan</div><h2>What are you planning?</h2><p className="muted">Use the normal day planner, or create a cruise shore day with a return-to-ship safety window.</p></div>
    <div className="plan-type-buttons">
      <span className="plan-type-current">📅 Day Plan</span>
      <Link className="plan-type-cruise" href={`/trips/${tripId}/cruise-days`}>🚢 Cruise Port Day</Link>
    </div>
  </section>;
}
