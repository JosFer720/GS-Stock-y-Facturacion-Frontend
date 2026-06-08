# Backend — GS Stock & Facturación

API REST en Express + PostgreSQL. Este documento describe la **arquitectura en
capas** hacia la que se está migrando el backend (Fase 2 del refactor).

## Arquitectura en capas

El flujo de una petición es:

```
HTTP → routes → controllers → services → repositories → db (pool pg)
```

| Capa | Carpeta | Responsabilidad única |
|------|---------|----------------------|
| **Routes** | `routes/` | Declarar endpoints y middlewares; delegar en un controlador. Sin lógica. |
| **Controllers** | `controllers/` | Traducir HTTP ↔ dominio: leer `req`, llamar al servicio, construir `res` (status, mensajes, formato). |
| **Services** | `services/` | Lógica de negocio: validaciones, orquestación de **transacciones** y armado de datos. No conoce `req`/`res`. |
| **Repositories** | `repositories/` | Único lugar con **SQL**. Cada función recibe un *executor* (el pool o un client de transacción). |
| **Utils** | `utils/` | Funciones puras y helpers reutilizables (p. ej. validación de NIT, `ServiceError`). |
| **DB** | `db.js` | Pool de conexiones único y compartido (ver Fase 1). |

### Manejo de errores

- Los errores de **negocio esperados** (400, 404, …) se lanzan desde el servicio
  como `ServiceError(status, body)` (`utils/ServiceError.js`).
- El controlador los traduce a `res.status(status).json(body)` y deja cualquier
  otro error como `500`.

### Transacciones

El **servicio** abre la transacción y pasa el `client` a las funciones del
repositorio:

```js
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await repo.insertCliente({ ... }, client);
  // ...más operaciones con el mismo client...
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

Las funciones del repositorio usan el pool por defecto cuando no se pasa un
client: `function findById(id, executor = pool) { ... }`.

## Módulo de referencia

**Clientes** es el módulo piloto ya migrado a esta arquitectura:

```
routes/clientes.js              → wiring de los 10 endpoints
controllers/clientesController.js
services/clientesService.js
repositories/clientesRepository.js
utils/nitGuatemala.js           → validación/formato de NIT (con tests)
```

## Cómo añadir / migrar un módulo

1. **Repository** (`repositories/<modulo>Repository.js`): mover aquí todo el SQL.
   Funciones pequeñas con nombres de intención (`findById`, `insertX`, …) que
   reciban `executor = pool`.
2. **Service** (`services/<modulo>Service.js`): validaciones, transacciones y
   shaping. Lanzar `ServiceError` para 400/404.
3. **Controller** (`controllers/<modulo>Controller.js`): un handler por endpoint;
   `req` → service → `res`, preservando status y formato de respuesta.
4. **Route** (`routes/<modulo>.js`): reducir a `router.METHOD(path, ...mw, controller.fn)`.
5. Extraer funciones puras a `utils/` y, si se puede, cubrirlas con tests unitarios.

> Al migrar, **preservar el comportamiento** (mismos paths, status, mensajes y
> formato de respuesta) para no romper el frontend.

## Scripts

- `npm start` — inicia el servidor.
- `npm test` — pruebas con Jest.
- `npm run lint` / `npm run format` — ESLint / Prettier.

Estado de la migración por capas:

- [x] Clientes (piloto)
- [ ] Usuarios, Ventas, Auth, Inventario, Facturas, Pagos, Devoluciones, Envíos, Dashboard, Graphics, … (pendientes)
