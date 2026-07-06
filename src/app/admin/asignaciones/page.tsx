import { RequestStatus, WeekDay } from "@prisma/client";
import { DashboardHeader } from "@/components/dashboard-header";
import { StatCards } from "@/components/stat-cards";
import { prisma } from "@/lib/prisma";

const dayLabels: Record<WeekDay, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado"
};

export default async function AsignacionesPage() {
  const [assigned, total, pending, rejected] = await Promise.all([
    prisma.classroomRequest.findMany({ where: { status: RequestStatus.APPROVED }, include: { coordinator: true, career: true, classroom: true, subject: true, schoolHour: true, groupSubject: { include: { group: true } } }, orderBy: { reviewedAt: "desc" } }),
    prisma.classroomRequest.count(), prisma.classroomRequest.count({ where: { status: RequestStatus.PENDING } }), prisma.classroomRequest.count({ where: { status: RequestStatus.REJECTED } })
  ]);
  return <><DashboardHeader title="Salones Asignados" subtitle="Vista de todos los salones asignados por día y hora." /><div className="content-wrap"><StatCards total={total} pending={pending} approved={assigned.length} rejected={rejected} /><section className="table-card"><div className="table-heading"><div><h2>Salones asignados</h2><p>Semestre Ago-Dic 2026 · Ordenadas por fecha</p></div><input placeholder="Buscar por coordinador, carrera, semestre..." /></div><div className="table-scroll"><table><thead><tr><th>Coordinador</th><th>Carrera</th><th>Grupo</th><th>Semestre</th><th>Salón</th><th>Materia</th><th>Día</th><th>Hora</th><th>Fecha de asignación</th></tr></thead><tbody>{assigned.map(x => <tr key={x.id}><td>{x.coordinator.name}</td><td><span className="career-pill">{x.career.acronym}</span></td><td>{x.groupSubject?.group.code || "—"}</td><td>{x.semester}to</td><td>{x.classroom.building}-{x.classroom.number}</td><td>{x.subject.code}</td><td>{dayLabels[x.dayOfWeek]}</td><td>{x.schoolHour.code} · {x.schoolHour.startTime}</td><td>{x.reviewedAt ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(x.reviewedAt) : "—"}</td></tr>)}</tbody></table></div></section></div></>;
}
