"use server";

import bcrypt from "bcryptjs";
// @ts-ignore
import { ClassroomStatus, Prisma, RequestStatus, WeekDay } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

function getFormData(firstArg: FormData | ActionState | undefined, secondArg?: FormData) {
  return secondArg ?? (firstArg as FormData);
}

function validationError(error: z.ZodError) {
  const first = error.issues[0];
  if (!first) return "Datos inválidos.";
  return first.message || "Datos inválidos.";
}

function prismaErrorMessage(error: any, fallback = "Ocurrió un error inesperado.") {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "Ya existe un registro con esos datos.";
    if (error.code === "P2003") return "No se puede completar la acción porque el registro está relacionado con otros datos.";
    if (error.code === "P2025") return "No se encontró el registro solicitado.";
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

function actionOk(message: string): ActionState {
  return { ok: true, message };
}

function actionError(error: any, fallback?: string): ActionState {
  const message = prismaErrorMessage(error, fallback);
  console.error("[Server Action Error]", error);
  return { ok: false, error: message };
}

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "El usuario debe tener al menos 3 caracteres.")
    .max(40, "El usuario no puede exceder 40 caracteres.")
    .regex(/^[a-zA-Z0-9._-]+$/, "El usuario solo puede contener letras, números, punto, guion y guion bajo."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.")
});

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function loginAction(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { ok: false, error: validationError(parsed.error) };
  }

  const user = await prisma.user.findUnique({
    where: { username: normalizeUsername(parsed.data.username) }
  });

  if (!user || !user.active || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { ok: false, error: "Usuario o contraseña incorrectos." };
  }

  await createSession(user.id);
  redirect(user.role === "ADMIN" ? "/admin/solicitudes" : "/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function approveRequestAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    const user = await requireUser();
    const requestId = Number(formData.get("requestId"));

    if (!Number.isInteger(requestId)) {
      return { ok: false, error: "Solicitud inválida." };
    }

    const request = await prisma.classroomRequest.findUnique({
      where: { id: requestId },
      include: { classroom: true }
    });

    if (!request || request.status !== RequestStatus.PENDING) {
      return { ok: false, error: "La solicitud ya no está pendiente o no existe." };
    }

    if (request.classroom.status !== ClassroomStatus.AVAILABLE) {
      return { ok: false, error: "El salón está inhabilitado o en mantenimiento." };
    }

    const conflict = await prisma.classroomRequest.findFirst({
      where: {
        id: { not: request.id },
        classroomId: request.classroomId,
        dayOfWeek: request.dayOfWeek,
        schoolHourId: request.schoolHourId,
        status: RequestStatus.APPROVED
      }
    });

    if (conflict) {
      return { ok: false, error: "Ya existe una asignación aprobada para ese salón en el mismo día y hora." };
    }

    await prisma.classroomRequest.update({
      where: { id: request.id },
      data: {
        status: RequestStatus.APPROVED,
        reviewedById: user.id,
        reviewedAt: new Date(),
        rejectionReason: null
      }
    });

    revalidatePath("/admin/solicitudes");
    revalidatePath("/admin/asignaciones");
    revalidatePath("/dashboard/materias");
    revalidatePath("/dashboard/salones");

    return actionOk("Solicitud aprobada correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo aprobar la solicitud.");
  }
}

export async function rejectRequestAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    const user = await requireUser();
    const requestId = Number(formData.get("requestId"));
    const reason = String(formData.get("reason") || "").trim();

    if (!Number.isInteger(requestId)) {
      return { ok: false, error: "Solicitud inválida." };
    }

    if (reason.length < 5) {
      return { ok: false, error: "El motivo de rechazo debe tener al menos 5 caracteres." };
    }

    await prisma.classroomRequest.updateMany({
      where: { id: requestId, status: RequestStatus.PENDING },
      data: {
        status: RequestStatus.REJECTED,
        rejectionReason: reason,
        reviewedById: user.id,
        reviewedAt: new Date()
      }
    });

    revalidatePath("/admin/solicitudes");
    revalidatePath("/admin/asignaciones");

    return actionOk("Solicitud rechazada correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo rechazar la solicitud.");
  }
}

const personSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres."),
  careerId: z.coerce.number().int().positive("Selecciona un área/carrera."),
  role: z.enum(["ADMIN", "COORDINATOR", "TEACHER"]),
  username: z
    .string()
    .trim()
    .min(3, "El usuario debe tener al menos 3 caracteres.")
    .max(40, "El usuario no puede exceder 40 caracteres.")
    .regex(/^[a-zA-Z0-9._-]+$/, "El usuario solo puede contener letras, números, punto, guion y guion bajo."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional().or(z.literal(""))
});

export async function savePersonAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    await requireUser();

    const parsed = personSchema.safeParse({
      id: formData.get("id") || undefined,
      name: formData.get("name"),
      careerId: formData.get("careerId"),
      role: formData.get("role"),
      username: formData.get("username"),
      password: formData.get("password")
    });

    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error) };
    }

    const { id, password, ...data } = parsed.data;

    if (id) {
      await prisma.user.update({
        where: { id },
        data: {
          ...data,
          username: normalizeUsername(data.username),
          ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {})
        }
      });
    } else {
      if (!password) {
        return { ok: false, error: "La contraseña es obligatoria." };
      }

      await prisma.user.create({
        data: {
          ...data,
          username: normalizeUsername(data.username),
          passwordHash: await bcrypt.hash(password, 12)
        }
      });
    }

    revalidatePath("/admin/personal");
    return actionOk(id ? "Usuario actualizado correctamente." : "Usuario creado correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo guardar el usuario.");
  }
}

export async function deletePersonAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    const current = await requireUser();
    const id = Number(formData.get("id"));

    if (!Number.isInteger(id)) {
      return { ok: false, error: "Usuario inválido." };
    }

    if (id === current.id) {
      return { ok: false, error: "No puedes eliminar tu propia cuenta." };
    }

    const requests = await prisma.classroomRequest.findMany({
      where: { OR: [{ coordinatorId: id }, { reviewedById: id }] },
      select: { id: true }
    });

    const requestIds = requests.map((request: any) => request.id);

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: id } }),
      prisma.classroomRequest.deleteMany({ where: { id: { in: requestIds } } }),
      prisma.academicGroup.deleteMany({ where: { coordinatorId: id } }),
      prisma.user.delete({ where: { id } })
    ]);

    revalidatePath("/admin/personal");
    return actionOk("Usuario eliminado correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo eliminar el usuario.");
  }
}

const subjectSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  code: z.string().trim().min(2, "La clave debe tener al menos 2 caracteres.").max(20),
  name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres."),
  type: z.string().trim().min(2, "El tipo de materia es obligatorio."),
  semester: z.coerce.number().int().min(1).max(12),
  careerIds: z.array(z.coerce.number().int().positive()).min(1, "Selecciona al menos una carrera.")
});

export async function saveSubjectAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    await requireUser();

    const parsed = subjectSchema.safeParse({
      id: formData.get("id") || undefined,
      code: formData.get("code"),
      name: formData.get("name"),
      type: formData.get("type"),
      semester: formData.get("semester"),
      careerIds: formData.getAll("careerIds")
    });

    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error) };
    }

    const { id, careerIds, ...data } = parsed.data;
    const relation = { set: careerIds.map((careerId) => ({ id: careerId })) };

    if (id) {
      await prisma.subject.update({
        where: { id },
        data: {
          ...data,
          code: data.code.toUpperCase(),
          careers: relation
        }
      });
    } else {
      await prisma.subject.create({
        data: {
          ...data,
          code: data.code.toUpperCase(),
          careers: { connect: careerIds.map((careerId) => ({ id: careerId })) }
        }
      });
    }

    revalidatePath("/admin/materias");
    return actionOk(id ? "Materia actualizada correctamente." : "Materia creada correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo guardar la materia.");
  }
}

export async function deleteSubjectAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    await requireUser();
    const id = Number(formData.get("id"));

    if (!Number.isInteger(id)) {
      return { ok: false, error: "Materia inválida." };
    }

    const requests = await prisma.classroomRequest.findMany({
      where: { subjectId: id },
      select: { id: true }
    });

    const requestIds = requests.map((request: any) => request.id);

    await prisma.$transaction([
      prisma.classroomRequest.deleteMany({ where: { id: { in: requestIds } } }),
      prisma.groupSubject.deleteMany({ where: { subjectId: id } }),
      prisma.subject.delete({ where: { id } })
    ]);

    revalidatePath("/admin/materias");
    return actionOk("Materia eliminada correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo eliminar la materia.");
  }
}

const classroomSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  building: z.string().trim().min(1, "El edificio es obligatorio.").max(30),
  floor: z.coerce.number().int().min(0).max(99),
  number: z.string().trim().min(1, "El salón es obligatorio.").max(20),
  capacity: z.coerce.number().int().min(1, "La capacidad debe ser mayor a 0.").max(1000),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "UNAVAILABLE"]).default("AVAILABLE"),
  blockReason: z.string().trim().max(140).optional().or(z.literal(""))
});

export async function saveClassroomAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    await requireUser();

    const parsed = classroomSchema.safeParse({
      id: formData.get("id") || undefined,
      building: formData.get("building"),
      floor: formData.get("floor"),
      number: formData.get("number"),
      capacity: formData.get("capacity"),
      status: formData.get("status") || "AVAILABLE",
      blockReason: formData.get("blockReason") || ""
    });

    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error) };
    }

    const { id, ...data } = parsed.data;
    const blockReason = data.status === "AVAILABLE" ? null : data.blockReason || "No disponible";

    if (id) {
      await prisma.classroom.update({
        where: { id },
        data: { ...data, blockReason }
      });
    } else {
      await prisma.classroom.create({
        data: { ...data, blockReason, type: "Aula" }
      });
    }

    revalidatePath("/admin/salones");
    return actionOk(id ? "Salón actualizado correctamente." : "Salón creado correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo guardar el salón.");
  }
}

export async function deleteClassroomAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    await requireUser();
    const id = Number(formData.get("id"));

    if (!Number.isInteger(id)) {
      return { ok: false, error: "Salón inválido." };
    }

    const requests = await prisma.classroomRequest.findMany({
      where: { classroomId: id },
      select: { id: true }
    });

    const requestIds = requests.map((request: any) => request.id);

    await prisma.$transaction([
      prisma.classroomRequest.deleteMany({ where: { id: { in: requestIds } } }),
      prisma.classroom.delete({ where: { id } })
    ]);

    revalidatePath("/admin/salones");
    revalidatePath("/admin/solicitudes");
    revalidatePath("/admin/asignaciones");

    return actionOk("Salón eliminado correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo eliminar el salón.");
  }
}

const groupRequestSchema = z.object({
  groupSubjectId: z.coerce.number().int().positive(),
  classroomId: z.coerce.number().int().positive(),
  dayOfWeek: z.nativeEnum(WeekDay),
  schoolHourId: z.coerce.number().int().positive()
});

export async function requestGroupClassroomAction(
  firstArg: FormData | ActionState | undefined,
  secondArg?: FormData
): Promise<ActionState> {
  const formData = getFormData(firstArg, secondArg);

  try {
    const user = await requireUser();

    const parsed = groupRequestSchema.safeParse({
      groupSubjectId: formData.get("groupSubjectId"),
      classroomId: formData.get("classroomId"),
      dayOfWeek: formData.get("dayOfWeek"),
      schoolHourId: formData.get("schoolHourId")
    });

    if (!parsed.success) {
      return { ok: false, error: validationError(parsed.error) || "Datos de solicitud inválidos." };
    }

    const assignment = await prisma.groupSubject.findUnique({
      where: { id: parsed.data.groupSubjectId },
      include: { group: true, subject: true }
    });

    if (!assignment || assignment.group.coordinatorId !== user.id) {
      return { ok: false, error: "No puedes solicitar este salón para esa materia." };
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id: parsed.data.classroomId }
    });

    if (!classroom || classroom.status !== ClassroomStatus.AVAILABLE) {
      return { ok: false, error: "El salón está inhabilitado o en mantenimiento." };
    }

    const unavailableSlot = await prisma.classroomUnavailableSlot.findUnique({
      where: {
        classroomId_dayOfWeek_schoolHourId: {
          classroomId: parsed.data.classroomId,
          dayOfWeek: parsed.data.dayOfWeek,
          schoolHourId: parsed.data.schoolHourId
        }
      }
    });

    if (unavailableSlot?.active) {
      return { ok: false, error: `El salón está inhabilitado en ese horario: ${unavailableSlot.reason}` };
    }

    const conflictingRequest = await prisma.classroomRequest.findFirst({
      where: {
        classroomId: parsed.data.classroomId,
        dayOfWeek: parsed.data.dayOfWeek,
        schoolHourId: parsed.data.schoolHourId,
        status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED] }
      }
    });

    if (conflictingRequest) {
      return { ok: false, error: "Ya existe una solicitud o asignación para ese salón en el mismo día y hora." };
    }

    await prisma.classroomRequest.create({
      data: {
        coordinatorId: user.id,
        careerId: assignment.group.careerId,
        subjectId: assignment.subjectId,
        classroomId: parsed.data.classroomId,
        semester: assignment.group.semester,
        groupSubjectId: assignment.id,
        dayOfWeek: parsed.data.dayOfWeek,
        schoolHourId: parsed.data.schoolHourId,
        status: RequestStatus.PENDING
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/materias");
    revalidatePath("/dashboard/grupos");
    revalidatePath("/admin/solicitudes");

    return actionOk("Solicitud enviada correctamente.");
  } catch (error) {
    return actionError(error, "No se pudo enviar la solicitud.");
  }
}
