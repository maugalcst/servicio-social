"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="login-form">
      <label>
        Email
        <input name="email" type="email" placeholder="ejemplo@uanl.edu.mx" required />
      </label>
      <label>
        Contraseña
        <input name="password" type="password" required minLength={6} />
      </label>
      {state?.error && <p className="form-error">{state.error}</p>}
      <p className="account-note">¿No tiene cuenta? aquí puede <span>crear una cuenta</span></p>
      <button type="submit" disabled={pending}>{pending ? "Ingresando..." : "Ingresar"}</button>
    </form>
  );
}
