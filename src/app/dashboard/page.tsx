import Link from "next/link";
import { BookOpenCheck, Building2, ChevronRight, UsersRound } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard-header";
import { requireUser } from "@/lib/auth";

const cards = [
  {
    href: "/dashboard/materias",
    title: "Materias pendientes",
    description: "Consulta las materias, claves y carreras pendientes de asignar.",
    Icon: BookOpenCheck
  },
  {
    href: "/dashboard/grupos",
    title: "Grupos asignados",
    description: "Visualiza los grupos asignados y la cantidad de alumnos.",
    Icon: UsersRound
  },
  {
    href: "/dashboard/salones",
    title: "Salones disponibles",
    description: "Revisa los salones disponibles y su capacidad.",
    Icon: Building2
  }
];

export default async function CoordinatorHomePage() {
  const user = await requireUser();
  const welcome = user.role === "COORDINATOR" ? "Coordinador" : "Auxiliar";
  return (
    <>
      <DashboardHeader title="Menú principal" subtitle={`Bienvenido, ${welcome}`} />
      <div className="coordinator-home">
        <p className="home-note">Desde aquí puedes acceder a las principales funciones del sistema.</p>
        <section className="quick-card">
          <h2>Accesos rápidos</h2>
          <p>Selecciona una opción para comenzar</p>
          <div className="quick-list">
            {cards.map(({ href, title, description, Icon }) => (
              <Link href={href} className="quick-option" key={href}>
                <Icon size={34} />
                <span><strong>{title}</strong><small>{description}</small></span>
                <ChevronRight size={24} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
