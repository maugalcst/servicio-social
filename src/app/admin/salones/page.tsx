import { DashboardHeader } from "@/components/dashboard-header";
import { ClassroomsManager } from "@/components/classrooms-manager";
import { prisma } from "@/lib/prisma";

export default async function SalonesPage() {
  const classrooms = await prisma.classroom.findMany({
    select: { id: true, building: true, floor: true, number: true, capacity: true, status: true, blockReason: true },
    orderBy: [{ building: "asc" }, { floor: "asc" }, { number: "asc" }]
  });
  return <><DashboardHeader title="Lista de salones" subtitle="Listado de los salones registrados, puede agregar o quitar salones."/><div className="content-wrap"><ClassroomsManager classrooms={classrooms}/></div></>;
}
