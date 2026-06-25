import { PrismaClient, RequestStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.session.deleteMany();
  await prisma.classroomRequest.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.user.deleteMany();
  await prisma.career.deleteMany();

  const career = await prisma.career.create({
    data: { name: "Ingeniería en Tecnología de Software", acronym: "ITS" }
  });

  const passwordHash = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Juan García Gallegos",
      email: "admin@uanl.edu.mx",
      passwordHash,
      role: UserRole.ADMIN,
      careerId: career.id
    }
  });

  const coordinator = await prisma.user.create({
    data: {
      name: "Juan Pérez Rodríguez",
      email: "coordinador@uanl.edu.mx",
      passwordHash,
      role: UserRole.COORDINATOR,
      careerId: career.id
    }
  });

  const subjects = await Promise.all([
    ["DISMOV", "Dispositivos móviles", 6],
    ["BD", "Bases de datos", 5],
    ["IA", "Inteligencia artificial", 7],
    ["REDES", "Redes de computadoras", 6]
  ].map(([code, name, semester]) => prisma.subject.create({
    data: { code: String(code), name: String(name), semester: Number(semester), careerId: career.id }
  })));

  const classrooms = await Promise.all([
    ["1205", "Edificio 1", 35, "Aula"],
    ["2201", "Edificio 2", 40, "Aula"],
    ["3104", "Edificio 3", 30, "Laboratorio"],
    ["4102", "Edificio 4", 45, "Aula"],
    ["LAB-6", "Edificio 6", 28, "Laboratorio"]
  ].map(([number, building, capacity, type]) => prisma.classroom.create({
    data: { number: String(number), building: String(building), capacity: Number(capacity), type: String(type) }
  })));

  const statuses: RequestStatus[] = [
    RequestStatus.PENDING,
    RequestStatus.REJECTED,
    RequestStatus.APPROVED,
    RequestStatus.PENDING,
    RequestStatus.PENDING,
    RequestStatus.APPROVED,
    RequestStatus.PENDING,
    RequestStatus.PENDING,
    RequestStatus.REJECTED,
    RequestStatus.PENDING,
    RequestStatus.APPROVED,
    RequestStatus.APPROVED
  ];

  for (let i = 0; i < statuses.length; i++) {
    const status = statuses[i];
    await prisma.classroomRequest.create({
      data: {
        coordinatorId: coordinator.id,
        careerId: career.id,
        subjectId: subjects[i % subjects.length].id,
        classroomId: classrooms[i % classrooms.length].id,
        semester: subjects[i % subjects.length].semester,
        status,
        rejectionReason: status === RequestStatus.REJECTED ? "El salón no está disponible en el horario solicitado." : null,
        reviewedById: status === RequestStatus.PENDING ? null : admin.id,
        reviewedAt: status === RequestStatus.PENDING ? null : new Date()
      }
    });
  }
}

main()
  .then(() => console.log("Base de datos inicializada."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
