import { WeekDay } from "@prisma/client";
import { DashboardHeader } from "@/components/dashboard-header";
import { requestGroupClassroomAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const dayLabels: Record<WeekDay, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado"
};

function statusLabel(status?: string) {
  if (!status) return "Sin solicitud";
  if (status === "PENDING") return "En revisión";
  if (status === "APPROVED") return "Aprobada";
  return "Rechazada";
}

export default async function PendingSubjectsPage() {
  const user = await requireUser();
  const [assignments, classrooms, schoolHours] = await Promise.all([
    prisma.groupSubject.findMany({
      where: { group: { coordinatorId: user.id } },
      include: {
        subject: { include: { careers: true } },
        group: { include: { career: true } },
        requests: { include: { classroom: true, schoolHour: true }, orderBy: [{ requestedAt: "desc" }] }
      },
      orderBy: [{ group: { semester: "asc" } }, { subject: { name: "asc" } }]
    }),
    prisma.classroom.findMany({ where: { status: "AVAILABLE" }, orderBy: [{ building: "asc" }, { floor: "asc" }, { number: "asc" }] }),
    prisma.schoolHour.findMany({ orderBy: { sortOrder: "asc" } })
  ]);

  const days = Object.entries(dayLabels) as [WeekDay, string][];

  return (
    <>
      <DashboardHeader title="Materias pendientes" subtitle="Coordina materias por grupo, día y hora escolar" />
      <div className="content-wrap">
        <section className="schedule-help with-reference">
          <div>
          <h2>Nomenclatura de horas</h2>
          <p>Selecciona el día y la hora escolar de la clase antes de solicitar el salón. El sistema evita choques de salón en el mismo horario.</p>
          <div className="hour-grid">
            {schoolHours.map((hour) => <span key={hour.id}><strong>{hour.code}</strong> {hour.startTime} - {hour.endTime}</span>)}
          </div>
          </div>
          <img src="/images/fime-hour-nomenclature.png" alt="Nomenclatura de horas clase" />
        </section>
        <section className="table-card coordinator-card">
          <div className="table-heading">
            <div><h2>Materias por coordinar</h2><p>Selecciona día, hora y salón disponible para enviar la solicitud a administración.</p></div>
            <input placeholder="Buscar materia, grupo o carrera..." />
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Grupo</th><th>Clave</th><th>Materia</th><th>Carrera</th><th>Alumnos</th><th>Solicitudes</th><th>Nueva solicitud</th></tr></thead>
              <tbody>
                {assignments.map((assignment) => {
                  return (
                    <tr key={assignment.id}>
                      <td><strong>{assignment.group.code}</strong></td>
                      <td>{assignment.subject.code}</td>
                      <td>{assignment.subject.name}</td>
                      <td><span className="career-pill">{assignment.group.career.acronym}</span></td>
                      <td>{assignment.group.students}</td>
                      <td>
                        <div className="schedule-list">
                          {assignment.requests.length === 0 ? <span className="muted">Sin horario solicitado</span> : assignment.requests.map((request) => (
                            <span key={request.id} className="schedule-chip">
                              {dayLabels[request.dayOfWeek]} · {request.schoolHour.code} · {request.classroom.building}-{request.classroom.number}
                              <b className={`status ${request.status.toLowerCase()}`}>{statusLabel(request.status)}</b>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <form action={requestGroupClassroomAction} className="inline-request-form schedule-request-form">
                          <input type="hidden" name="groupSubjectId" value={assignment.id} />
                          <select name="dayOfWeek" required>
                            <option value="">Día</option>
                            {days.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                          <select name="schoolHourId" required>
                            <option value="">Hora</option>
                            {schoolHours.map((hour) => <option key={hour.id} value={hour.id}>{hour.code} · {hour.startTime}</option>)}
                          </select>
                          <select name="classroomId" required>
                            <option value="">Salón</option>
                            {classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>Ed. {classroom.building} · P{classroom.floor} · {classroom.number} · {classroom.capacity}</option>)}
                          </select>
                          <button type="submit">Solicitar</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
