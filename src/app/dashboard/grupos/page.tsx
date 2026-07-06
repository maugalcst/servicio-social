import { DashboardHeader } from "@/components/dashboard-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AssignedGroupsPage() {
  const user = await requireUser();
  const groups = await prisma.academicGroup.findMany({
    where: { coordinatorId: user.id },
    include: { career: true, subjects: { include: { subject: true, requests: true } } },
    orderBy: [{ semester: "asc" }, { code: "asc" }]
  });

  return (
    <>
      <DashboardHeader title="Grupos asignados" subtitle="Grupos asociados a tu coordinación y sus materias" />
      <div className="content-wrap">
        <section className="table-card coordinator-card">
          <div className="table-heading"><div><h2>Grupos activos</h2><p>Semestre Ago-Dic 2026</p></div><input placeholder="Buscar grupo..." /></div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Grupo</th><th>Carrera</th><th>Semestre</th><th>Alumnos</th><th>Materias</th><th>Horarios solicitados</th></tr></thead>
              <tbody>
                {groups.map((group) => {
                  const totalSubjects = group.subjects.length;
                  const requestedSlots = group.subjects.reduce((total, item) => total + item.requests.length, 0);
                  return <tr key={group.id}><td><strong>{group.code}</strong></td><td><span className="career-pill">{group.career.acronym}</span></td><td>{group.semester}to</td><td>{group.students}</td><td>{group.subjects.map((item) => item.subject.code).join(", ")}</td><td>{requestedSlots} horarios en {totalSubjects} materias</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
