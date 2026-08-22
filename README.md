# Control de Calidad Romex — Web + SQL Server

Sistema profesional de **Estudio de Vida Útil / Control de Calidad**  
**Exportadora Romex S.A.** · Planta de Cacao Chincha  
Microbiología + Físicoquímico · HTML/CSS/JS + Chart.js + API Node.js

**Versión:** 1.2.0

---

## Arquitectura

```
Navegador (Material Design)
    → /api/...
    → server/index.js (Express)
    → SQL Server (SSMS Express)  o  PostgreSQL (opcional / Render)
```

## Requisitos

- Node.js ≥ 18
- SQL Server Express + SSMS
- Navegador moderno

---

## 1) Base de datos (SSMS Express)

Tu base **RomexQC** ya está creada. Orden recomendado de scripts:

| Orden | Archivo | Qué hace |
|-------|---------|----------|
| 1 | `sql/00_RESET_COMPLETO.sql` | **Solo si quieres recrear todo** (borra y vuelve a crear productos + datos mayo–dic 2026) |
| 2 | `sql/02_roles_usuarios.sql` | Tablas `Usuarios` y `Sesiones` + usuarios iniciales |
| 3 | `sql/03_bcrypt_passwords.sql` | Amplía `PasswordHash` y pone hashes bcrypt |
| 4 | `sql/04_mejoras.sql` | PasswordHash VARCHAR(100), índice, limpia sesiones viejas |

> Si ya tienes productos y datos, **no ejecutes** el `00_RESET`.  
> Ejecuta **04_mejoras.sql** ahora (es seguro).

### Usuarios por defecto

| Usuario   | Contraseña  | Rol    |
|-----------|-------------|--------|
| admin     | admin123    | ADMIN  |
| rodrigo   | rodrigo123  | ADMIN  |
| nereyda   | romex2026   | ADMIN  |
| lector    | lector123   | LECTOR |

**Cambia estas contraseñas en producción.**

---

## 2) Configurar API local

```bash
cd server
cp .env.example .env
# Edita .env con tu servidor, usuario y password de SQL Server
npm install
npm start
# http://localhost:3000
```

Ejemplo `.env`:

```env
DB_TYPE=mssql
MSSQL_SERVER=localhost
MSSQL_DATABASE=RomexQC
MSSQL_USER=sa
MSSQL_PASSWORD=TuPassword
MSSQL_ENCRYPT=false
PORT=3000
NODE_ENV=development
```

Si usas Live Server (puerto 5500), el frontend apunta solo a `http://localhost:3000`.

---

## 3) Funcionalidades v1.2

- Login con bcrypt (+ migración automática desde SHA-256)
- **Recordarme** correcto (localStorage vs sessionStorage)
- Roles **ADMIN** / **LECTOR**
- Auto-guardado de resultados (ADMIN)
- Agregar mes y producto (ADMIN)
- Soft-delete de producto (`DELETE /api/productos/:codigo`)
- Selector de **año** (2025 / 2026 / 2027)
- Estado real (LIBERADO / CONFORME / etc.) en interpretación y badge
- Validación de rangos en micro y físico
- Rate-limit de login (12 intentos / 15 min)
- CORS configurable (`CORS_ORIGINS`)
- Limpieza de sesiones expiradas al login
- Analista = usuario logueado al crear mes

---

## 4) API principal

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/login` | — | Login |
| POST | `/api/logout` | Bearer | Cerrar sesión |
| GET | `/api/me` | Bearer | Usuario actual |
| GET | `/api/health` | Bearer* | Health + tipo DB |
| GET | `/api/productos` | Bearer | Listar productos |
| POST | `/api/productos` | ADMIN | Crear producto |
| DELETE | `/api/productos/:codigo` | ADMIN | Desactivar producto |
| GET | `/api/productos/:codigo/micro?anio=` | Bearer | Resultados micro |
| GET | `/api/productos/:codigo/fisico?anio=` | Bearer | Resultados físico |
| PUT | `/api/productos/:codigo/micro/:mes?anio=` | ADMIN | Actualizar micro |
| PUT | `/api/productos/:codigo/fisico/:mes?anio=` | ADMIN | Actualizar físico |
| POST | `/api/productos/:codigo/mes` | ADMIN | Agregar mes |

\* `/api/health` en esta versión requiere estar autenticado si se llama desde `api()` del front; el endpoint en sí no exige auth en el servidor.

---

## 5) Productos (seed)

- Torta Natural de Cacao · 44260304  
- Torta Alcalina de Cacao · 13260318  
- Cocoa Natural · 11260513  
- Cocoa Alcalina · 07260324  
- Licor de Cacao · 260516  
- Manteca de Cacao · 19260321  

Analista de referencia: **Nereyda Huachua Flores**

---

## 6) Deploy (Render + PostgreSQL) — opcional

Render no tiene SQL Server. Usa Postgres:

1. Crea PostgreSQL y copia `DATABASE_URL`
2. Adapta el esquema (tablas equivalentes en snake_case)
3. Web Service: build `cd server && npm install`, start `cd server && node index.js`
4. Env: `DATABASE_URL`, `DB_TYPE=postgres`, `NODE_ENV=production`

*(Scripts Postgres completos pendientes; el backend ya soporta `DB_TYPE=postgres`.)*

---

## Diseño

Material Design claro (Roboto, cards, chips, tabs, drawer colapsable, splash animado).
