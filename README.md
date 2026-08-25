# Control de Calidad Romex — Estudio de Vida Útil

**Exportadora Romex S.A.** · Planta Chincha · **v1.5.4**

Web app + API (Node/Express) · SQL Server (local) o **PostgreSQL (Render)**.

---

## Publicar en Render (producción) — LISTO

### Opción recomendada: Blueprint (1 clic)

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Conecta el repositorio `estudio-vida-util-romex`
3. Render lee el `render.yaml` y crea:
   - Web Service `romex-qc`
   - PostgreSQL `romex-qc-db`
4. Haz clic en **Apply**

En el **primer arranque** la API crea sola las tablas y los usuarios (schema + seed automático).

### Opción manual

| Campo | Valor |
|--------|--------|
| Root Directory | *(vacío)* |
| Runtime | Node |
| Build Command | `npm install --prefix server` |
| Start Command | `node server/index.js` |
| Health Check | `/api/health` |

**Environment variables**

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `DB_TYPE` | `postgres` |
| `DATABASE_URL` | *Link del Postgres de Render* |

---

### Usuarios iniciales

| Usuario | Pass | Rol |
|---------|------|-----|
| admin | admin123 | ADMIN |
| rodrigo | rodrigo123 | ADMIN |
| nereyda | romex2026 | ADMIN |
| lector | lector123 | LECTOR |

**Cambia las contraseñas en producción.**

### URL

Tras el deploy: `https://romex-qc-xxxx.onrender.com`  
Login en esa misma URL (API y frontend juntos).

> Plan free: el servicio se duerme tras inactividad; la primera carga puede tardar ~30–60 s.

---

## Arranque local (SQL Server)

```bash
cd server
cp .env.example .env
# Edita MSSQL_PASSWORD
npm install
npm start
# http://localhost:3000
```

Scripts SSMS: carpeta `sql/` (ver `sql/TODO_EN_UNO_SSMS.sql`).

---

## Qué incluye v1.5.4

- Login bcrypt · roles ADMIN / LECTOR  
- Microbiología y físicoquímico por producto / mes / año  
- **Siembra / punto de partida** según lote (`2603` → marzo, etc.)  
- Gráfico 3D siembra vs mes · tendencia con línea de siembra  
- Export CSV · comparar · auditoría · dark mode  
- Auto-guardado · agregar mes/producto  
- **Auto-schema + seed en PostgreSQL** (Render listo sin pasos SQL manuales)

---

## API

| Ruta | Descripción |
|------|-------------|
| `GET /api/health` | Estado + versión + tipo DB |
| `POST /api/login` | Login |
| `GET /api/productos` | Listado |
| `GET /api/productos/:codigo/micro?anio=` | Microbiología |
| `GET /api/productos/:codigo/fisico?anio=` | Físicoquímico |
| `GET /api/auditoria` | Historial (ADMIN) |

---

Analista de referencia: Nereyda Huachua Flores · Doc I-EVUP-R-309
