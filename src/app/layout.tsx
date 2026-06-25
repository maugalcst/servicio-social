import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asignación de Salones | FIME",
  description: "Sistema administrativo para asignación de salones"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
