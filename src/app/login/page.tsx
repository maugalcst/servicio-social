import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === "ADMIN" ? "/admin/solicitudes" : "/dashboard");
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-card">
          <div className="brand-mark">
            <Image
              src="/images/fime-formal.png"
              alt="FIME"
              width={200}
              height={80}
              priority
            />
          </div>

          <h1>Inicio de sesión</h1>
          <p>Bienvenido de vuelta, ingrese con su cuenta</p>

          <LoginForm />
        </div>
      </section>

      <section className="login-hero">
        <div className="hero-noise" />

        <div className="hero-copy">
          <div className="bear">
            <Image
              src="/images/fime-bear-logo.png"
              alt="FIME"
              width={80}
              height={80}
              priority
            />
          </div>

          <h2>Asignación de Salones</h2>
          <p>eslógan o pequeña descripción</p>
        </div>
      </section>
    </main >
  );
}