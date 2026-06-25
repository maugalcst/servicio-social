import Link from "next/link";
import { BookOpen, Building2, ClipboardCheck, DoorOpen, Menu, Users } from "lucide-react";
import { logoutAction } from "@/app/actions";

const items = [
  ["/dashboard/solicitudes", "Pendientes de revisión", ClipboardCheck],
  ["/dashboard/asignaciones", "Salones asignados", DoorOpen],
  ["/dashboard/personal", "Personal", Users],
  ["/dashboard/materias", "Lista de materias", BookOpen],
  ["/dashboard/salones", "Lista de salones", Building2]
] as const;

export function Sidebar({ userName, career }: { userName: string; career?: string | null }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top"><Menu size={25} /></div>
      <nav>
        {items.map(([href, label, Icon]) => (
          <Link key={href} href={href}><Icon size={16} /><span>{label}</span></Link>
        ))}
      </nav>
      <div className="sidebar-user">
        <div className="avatar">●</div>
        <div><strong>{userName}</strong><small>{career || "Administración"}</small></div>
        <form action={logoutAction}><button type="submit">Salir</button></form>
      </div>
    </aside>
  );
}
