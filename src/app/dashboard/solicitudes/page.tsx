import { RequestStatus } from "@prisma/client";
import { DashboardHeader } from "@/components/dashboard-header";
import { RequestActions } from "@/components/request-actions";
import { StatCards } from "@/components/stat-cards";
import { prisma } from "@/lib/prisma";

export default async function SolicitudesPage() {
  const [requests, grouped] = await Promise.all([
    prisma.classroomRequest.findMany({ include: { coordinator: true, career: true, classroom: true, subject: true }, orderBy: { requestedAt: "desc" } }),
    prisma.classroomRequest.groupBy({ by: ["status"], _count: true })
  ]);
  const count = (status: RequestStatus) => grouped.find(x => x.status === status)?._count ?? 0;

  return <>
    <DashboardHeader title="Asignación de Salones" subtitle="Revisión de solicitudes · semestre activo" />
    <div className="content-wrap">
      <StatCards total={requests.length} pending={count(RequestStatus.PENDING)} approved={count(RequestStatus.APPROVED)} rejected={count(RequestStatus.REJECTED)} />
      <section className="table-card">
        <div className="table-heading"><div><h2>Solicitudes activas</h2><p>Semestre Ago-Dic 2026 · Ordenadas por fecha</p></div><input placeholder="Buscar por coordinador, carrera, semestre..." /></div>
        <div className="table-scroll"><table><thead><tr><th>Coordinador</th><th>Carrera</th><th>Semestre</th><th>Salón</th><th>Estado</th><th>Acciones</th><th>Fecha de solicitud</th></tr></thead>
        <tbody>{requests.map(request => <tr key={request.id}><td>{request.coordinator.name}</td><td><span className="career-pill">{request.career.acronym}</span></td><td>{request.semester}to</td><td>{request.classroom.number}</td><td><span className={`status ${request.status.toLowerCase()}`}>{request.status === "PENDING" ? "Pendiente" : request.status === "APPROVED" ? "Aprobado" : "Rechazado"}</span></td><td>{request.status === RequestStatus.PENDING ? <RequestActions requestId={request.id} coordinator={request.coordinator.name} /> : "—"}</td><td>{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(request.requestedAt)}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  </>;
}
