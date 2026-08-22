# Control de Calidad Romex — Web + SQL

Sistema profesional de **Estudio de Vida Útil / Control de Calidad**  
**Exportadora Romex S.A.** · Planta Chincha  
**Versión 1.5.0**

---

## Qué incluye (v1.5)

- Login bcrypt + roles ADMIN / LECTOR + Recordarme
- Microbiología y físicoquímico por producto/mes/año
- Auto-guardado, agregar mes/producto, soft-delete
- Selector de año · estado real · empty-state
- **Export CSV** (Excel) · **Imprimir/PDF** (navegador)
- **Comparar productos** (promedios)
- **Alertas** de límites orientativos QC
- **Auditoría** de cambios (tabla + UI)
- **Dark mode** · PWA básica (manifest + service worker)
- **UI v1.5** — animaciones fluidas, skeletons, transiciones de contenido, login glassmorphism, micro-interacciones
- Tendencia físico con **selector de parámetro**
- API dual: **SQL Server** (local) o **PostgreSQL** (Render)

---

## SSMS Express — scripts a ejecutar

Tu base `RomexQC` ya existe. Ejecuta en orden lo que falte:

| Script | Cuándo |
|--------|--------|
| `sql/00_RESET_COMPLETO.sql` | Solo si quieres borrar y recrear datos |
| `sql/02_roles_usuarios.sql` | Si no tienes Usuarios/Sesiones |
| `sql/03_bcrypt_passwords.sql` | Hashes bcrypt |
| `sql/04_mejoras.sql` | PasswordHash VARCHAR + índice |
| **`sql/05_auditoria.sql`** | **Obligatorio para historial v1.3** |

```sql
-- Mínimo ahora:
-- 1) Abre sql/05_auditoria.sql en SSMS y F5 sobre RomexQC
```

### Usuarios

| Usuario | Pass | Rol |
|---------|------|-----|
| admin | admin123 | ADMIN |
| rodrigo | rodrigo123 | ADMIN |
| nereyda | romex2026 | ADMIN |
| lector | lector123 | LECTOR |

---

## Arranque local

```bash
cd server
cp .env.example .env   # edita password SQL
npm install
npm start
# http://localhost:3000
```

---

## PostgreSQL (Render)

```
sql/postgres/01_schema.sql
sql/postgres/02_seed.sql
```

Env: `DB_TYPE=postgres`, `DATABASE_URL=...`, `NODE_ENV=production`

---

## Toolbar UI

- 📥 Export CSV  
- ⇄ Comparar productos  
- 🌙 Tema oscuro/claro  
- 🖨 Imprimir (PDF del navegador)  
- Historial (ADMIN, drawer)

---

## API nueva v1.3

| Ruta | Descripción |
|------|-------------|
| `GET /api/limits` | Límites QC |
| `GET /api/auditoria?limit=` | Historial (ADMIN) |
| micro/fisico responses | incluyen `alertas[]` |

---

Analista de referencia: Nereyda Huachua Flores · Código doc I-EVUP-R-309
