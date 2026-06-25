"use server";

import bcrypt from "bcryptjs";
import { RequestStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function loginAction(_: { error?: string } | undefined, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) return { error: "Ingresa un correo y contraseña válidos." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !user.active || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "Correo o contraseña incorrectos." };
  }

  await createSession(user.id);
  redirect("/dashboard/solicitudes");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function approveRequestAction(formData: FormData) {
  const user = await requireUser();
  const requestId = Number(formData.get("requestId"));
  if (!Number.isInteger(requestId)) return;

  await prisma.classroomRequest.updateMany({
    where: { id: requestId, status: RequestStatus.PENDING },
    data: {
      status: RequestStatus.APPROVED,
      reviewedById: user.id,
      reviewedAt: new Date(),
      rejectionReason: null
    }
  });

  revalidatePath("/dashboard/solicitudes");
  revalidatePath("/dashboard/asignaciones");
}

export async function rejectRequestAction(formData: FormData) {
  const user = await requireUser();
  const requestId = Number(formData.get("requestId"));
  const reason = String(formData.get("reason") || "").trim();
  if (!Number.isInteger(requestId) || reason.length < 5) return;

  await prisma.classroomRequest.updateMany({
    where: { id: requestId, status: RequestStatus.PENDING },
    data: {
      status: RequestStatus.REJECTED,
      rejectionReason: reason,
      reviewedById: user.id,
      reviewedAt: new Date()
    }
  });

  revalidatePath("/dashboard/solicitudes");
  revalidatePath("/dashboard/asignaciones");
}


const personSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(3),
  careerId: z.coerce.number().int().positive(),
  role: z.enum(["ADMIN", "COORDINATOR", "TEACHER"]),
  email: z.string().trim().email(),
  password: z.string().min(6).optional().or(z.literal(""))
});

export async function savePersonAction(formData: FormData) {
  await requireUser();
  const parsed = personSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"), careerId: formData.get("careerId"),
    role: formData.get("role"), email: formData.get("email"), password: formData.get("password")
  });
  if (!parsed.success) throw new Error("Datos de personal inválidos");
  const { id, password, ...data } = parsed.data;
  if (id) {
    await prisma.user.update({ where: { id }, data: { ...data, email: data.email.toLowerCase(), ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}) } });
  } else {
    if (!password) throw new Error("La contraseña es obligatoria");
    await prisma.user.create({ data: { ...data, email: data.email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) } });
  }
  revalidatePath("/dashboard/personal");
}

export async function deletePersonAction(formData: FormData) {
  const current = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id === current.id) throw new Error("No puedes eliminar tu propia cuenta");
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: id } }),
    prisma.classroomRequest.deleteMany({ where: { OR: [{ coordinatorId: id }, { reviewedById: id }] } }),
    prisma.user.delete({ where: { id } })
  ]);
  revalidatePath("/dashboard/personal");
}

const subjectSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(3),
  coordination: z.string().trim().min(2),
  semester: z.coerce.number().int().min(1).max(12),
  careerIds: z.array(z.coerce.number().int().positive()).min(1)
});

export async function saveSubjectAction(formData: FormData) {
  await requireUser();
  const parsed = subjectSchema.safeParse({
    id: formData.get("id") || undefined, code: formData.get("code"), name: formData.get("name"),
    coordination: formData.get("coordination"), semester: formData.get("semester"), careerIds: formData.getAll("careerIds")
  });
  if (!parsed.success) throw new Error("Datos de materia inválidos");
  const { id, careerIds, ...data } = parsed.data;
  const relation = { set: careerIds.map((careerId) => ({ id: careerId })) };
  if (id) await prisma.subject.update({ where: { id }, data: { ...data, code: data.code.toUpperCase(), careers: relation } });
  else await prisma.subject.create({ data: { ...data, code: data.code.toUpperCase(), careers: { connect: careerIds.map((careerId) => ({ id: careerId })) } } });
  revalidatePath("/dashboard/materias");
}

export async function deleteSubjectAction(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await prisma.$transaction([
    prisma.classroomRequest.deleteMany({ where: { subjectId: id } }),
    prisma.subject.delete({ where: { id } })
  ]);
  revalidatePath("/dashboard/materias");
}

const classroomSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  building: z.string().trim().min(1).max(30),
  floor: z.coerce.number().int().min(0).max(99),
  number: z.string().trim().min(1).max(20),
  capacity: z.coerce.number().int().min(1).max(1000)
});

export async function saveClassroomAction(formData: FormData) {
  await requireUser();
  const parsed = classroomSchema.safeParse({
    id: formData.get("id") || undefined,
    building: formData.get("building"),
    floor: formData.get("floor"),
    number: formData.get("number"),
    capacity: formData.get("capacity")
  });
  if (!parsed.success) throw new Error("Datos de salón inválidos");
  const { id, ...data } = parsed.data;
  if (id) {
    await prisma.classroom.update({ where: { id }, data });
  } else {
    await prisma.classroom.create({ data: { ...data, type: "Aula" } });
  }
  revalidatePath("/dashboard/salones");
}

export async function deleteClassroomAction(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await prisma.$transaction([
    prisma.classroomRequest.deleteMany({ where: { classroomId: id } }),
    prisma.classroom.delete({ where: { id } })
  ]);
  revalidatePath("/dashboard/salones");
  revalidatePath("/dashboard/solicitudes");
  revalidatePath("/dashboard/asignaciones");
}
