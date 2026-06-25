import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard/solicitudes");

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-card">
          <div className="brand-mark"><span className="seal">F</span><strong>FIME</strong></div>
          <h1>Inicio de sesión</h1>
          <p>Bienvenido de vuelta, ingrese con su cuenta</p>
          <LoginForm />
          <div className="demo-credentials">Demo: admin@uanl.edu.mx / admin123</div>
        </div>
      </section>
      <section className="login-hero">
        <div className="hero-noise" />
        <div className="hero-copy">
          <div className="bear">♙</div>
          <h2>Asignación de Salones</h2>
          <p>Gestión académica de espacios</p>
        </div>
      </section>
    </main>
  );
}
