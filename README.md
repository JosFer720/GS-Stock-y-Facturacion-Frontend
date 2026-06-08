# GS Stock & Facturación

CRM para una zapatería que comercializa calzado importado y nacional. Permite gestionar
inventario, usuarios y roles, clientes con su historial de pedidos, ventas, pagos y
devoluciones.

## Stack

- **Frontend:** Vue 3 + Vite + Vue Router (Pinia disponible), Axios, Socket.IO client.
- **Backend:** Node.js + Express, PostgreSQL (`pg`), JWT, Socket.IO, Nodemailer, PDFKit.
- **Infraestructura:** Docker Compose (frontend, backend, PostgreSQL, Nginx).

## Estructura del repositorio

```
GS-Stock/
├── backend/            # API Express + PostgreSQL
│   ├── routes/         # Endpoints de la API (por dominio)
│   ├── middleware/     # auth (JWT), roles, rate limiting
│   ├── services/       # email, socket
│   └── index.js        # Arranque del servidor + Socket.IO
├── frontend/           # SPA Vue 3
│   └── src/
│       ├── views/      # Vistas por ruta
│       ├── components/ # Componentes reutilizables
│       ├── services/   # Clientes de la API
│       └── router/     # Definición de rutas
├── db-init/            # Scripts SQL de inicialización (orden por prefijo)
└── docker-compose.yml  # Orquestación de servicios
Documentacion/          # Documentación funcional y de sprints
```

## Variables de entorno

Las credenciales **no** se versionan. Antes de levantar el proyecto, copia los ejemplos y
rellena los valores reales:

```bash
# Para docker-compose
cp GS-Stock/.env.example GS-Stock/.env

# Para ejecutar el backend fuera de Docker
cp GS-Stock/backend/.env.example GS-Stock/backend/.env
```

Variables obligatorias (sin valor por defecto): `DB_PASSWORD`, `JWT_SECRET`,
`EMAIL_USER`, `EMAIL_PASSWORD`. Genera un `JWT_SECRET` seguro con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Cómo levantar el proyecto

### Con Docker (recomendado)

```bash
cd GS-Stock
cp .env.example .env   # y rellenar valores
docker compose up --build
```

- Frontend (dev): http://localhost:3001
- Backend: http://localhost:3000
- PostgreSQL: localhost:5434

`docker-compose.override.yml` se aplica automáticamente en desarrollo (Vite dev server,
Nginx deshabilitado).

### Manual (sin Docker)

```bash
# Backend
cd GS-Stock/backend
npm install
cp .env.example .env   # apuntar DB_HOST a tu PostgreSQL local
npm start

# Frontend (otra terminal)
cd GS-Stock/frontend
npm install
npm run dev
```

## Scripts útiles

**Backend** (`GS-Stock/backend`)
- `npm start` — inicia el servidor
- `npm test` — pruebas con Jest
- `npm run lint` / `npm run format` — ESLint / Prettier

**Frontend** (`GS-Stock/frontend`)
- `npm run dev` — servidor de desarrollo Vite
- `npm run build` — build de producción
- `npm run test:unit` — pruebas con Vitest
- `npm run lint` / `npm run format` — ESLint / Prettier
