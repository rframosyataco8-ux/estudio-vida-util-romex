# Control de Calidad Romex — Estudio de Vida Útil

**Exportadora Romex S.A.** · Planta Chincha · **v1.5.3**

Web app + API (Node/Express) · SQL Server (local) o **PostgreSQL (Render)**.

---

## Publicar en Render (producción)

### 1. Base de datos PostgreSQL en Render

1. [Render Dashboard](https://dashboard.render.com) → **New** → **PostgreSQL**
2. Name: `romex-qc-db` · Plan **Free**
3. Copia la **Internal Database URL** (o External si hace falta)

### 2. Ejecutar el esquema SQL

En la consola de Postgres de Render (o con `psql` y la External URL):

```bash
# Desde tu PC (con la External Database URL):
psql "TU_EXTERNAL_DATABASE_URL" -f sql/postgres/01_schema.sql
psql "TU_EXTERNAL_DATABASE_URL" -f sql/postgres/02_seed.sql
```

O pega el contenido de esos archivos en el **Shell** / query tool de Render.

### 3. Web Service

**Opción A — Blueprint (recomendado)**  
- New → **Blueprint** → conecta el repo `estudio-vida-util-romex`  
- Usa el `render.yaml` del repo (crea web + DB)

**Opción B — Manual**

| Campo | Valor |
|--------|--------|
| Root Directory | *(vacío, raíz del repo)* |
| Runtime | Node |
| Build Command | `npm install --prefix server` |
| Start Command | `node server/index.js` |
| Health Check | `/api/health` |

**Environment variables**

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `DB_TYPE` | `postgres` |
| `DATABASE_URL` | *Link del Postgres* (o pega la URL) |

### 4. Usuarios iniciales (tras el seed)

| Usuario | Pass | Rol |
|---------|------|-----|
| admin | admin123 | ADMIN |
| rodrigo | rodrigo123 | ADMIN |
| nereyda | romex2026 | ADMIN |
| lector | lector123 | LECTOR |

**Cambia las contraseñas en producción.**

### 5. URL

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

## Qué incluye v1.5.3

- Login bcrypt · roles ADMIN / LECTOR  
- Microbiología y físicoquímico por producto / mes / año  
- **Siembra / punto de partida** según lote (`2603` → marzo, etc.)  
- Gráfico 3D siembra vs mes · tendencia con línea de siembra  
- Export CSV · comparar · auditoría · dark mode  
- Auto-guardado · agregar mes/producto  

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
