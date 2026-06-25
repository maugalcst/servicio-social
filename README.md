# FIME · Asignación de Salones

Base funcional en Next.js con App Router, TypeScript, Prisma y SQLite. Incluye:

- Inicio y cierre de sesión con cookie HTTP-only.
- Dashboard inspirado en el Figma proporcionado.
- Resumen de solicitudes pendientes, aprobadas y rechazadas.
- Aprobación con confirmación.
- Rechazo con motivo obligatorio.
- Vista de salones asignados.
- Catálogos de personal, materias y salones.
- Datos de demostración y archivo local `prisma/database.db`.

## Requisitos

- Node.js 20 o superior.
- npm.

## Instalación

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Abre `http://localhost:3000`.

### Cuenta de prueba

- Correo: `admin@uanl.edu.mx`
- Contraseña: `admin123`

## Archivo SQLite

Después de ejecutar `npm run db:push`, la base queda en:

```text
prisma/database.db
```

No subas ese archivo a un repositorio público si contiene información real.

## Reiniciar datos

```bash
npm run db:reset
```

## Notas de producción

SQLite requiere almacenamiento persistente. En un VPS o servidor local funciona directamente. En plataformas serverless con sistema de archivos efímero, usa un volumen persistente o cambia a una base administrada.
