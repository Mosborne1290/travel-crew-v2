"use client";

export function PrintTripButton() {
  return (
    <button className="primary no-print" type="button" onClick={() => window.print()}>
      Print / Save as PDF
    </button>
  );
}
