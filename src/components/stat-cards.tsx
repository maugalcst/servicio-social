export function StatCards({ total, pending, approved, rejected }: { total: number; pending: number; approved: number; rejected: number }) {
  const cards = [
    ["TOTAL SOLICITUDES", total, "Solicitudes registradas", "total"],
    ["PENDIENTES", pending, "Requieren revisión", "pending"],
    ["APROBADAS", approved, "Asignadas este semestre", "approved"],
    ["RECHAZADAS", rejected, "Con motivo registrado", "rejected"]
  ];
  return <section className="stats-grid">{cards.map(([label, value, note, kind]) => (
    <article className={`stat-card ${kind}`} key={String(label)}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>
  ))}</section>;
}
