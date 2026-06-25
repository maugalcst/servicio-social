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
