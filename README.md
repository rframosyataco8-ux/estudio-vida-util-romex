# Control de Calidad Romex — Web + SQL

Aplicación profesional (Material Design) con:
- **Microbiología** y **Físicoquímico** por producto y mes
- Datos de **mayo** tomados del Excel e imagen real
- Variación coherente junio–diciembre (leve alza desde agosto)
- API Node.js + **SQL Server** (SSMS) o **PostgreSQL** (Render)

## Arquitectura

```
Navegador (Material Design) → /api/... → server/index.js → SQL Server | PostgreSQL
```

## 1) SQL Server (SSMS)

1. Abre SSMS y conéctate a tu instancia.
2. Ejecuta `sql/01_schema_sqlserver.sql`
3. Ejecuta `sql/02_seed_sqlserver.sql`
4. Verifica: `SELECT * FROM RomexQC.dbo.Productos`

Crea `server/.env`:
```env
DB_TYPE=mssql
MSSQL_SERVER=localhost
MSSQL_DATABASE=RomexQC
MSSQL_USER=sa
MSSQL_PASSWORD=TuPassword
MSSQL_ENCRYPT=false
PORT=3000
```

## 2) Local

```bash
cd server
npm install
cp .env.example .env
npm start
# http://localhost:3000
```

## 3) Render (PostgreSQL + Web Service)

Render **no tiene SQL Server**. Usa Postgres:

1. **New → PostgreSQL** → copia `DATABASE_URL`
2. Ejecuta `sql/01_schema_postgres.sql` + inserts de productos/resultados
3. **New → Web Service** (repo GitHub)
   - Build: `cd server && npm install`
   - Start: `cd server && node index.js`
   - Env: `DATABASE_URL`, `DB_TYPE=postgres`, `NODE_ENV=production`

## Diseño
Material Design claro (Roboto, cards, chips, tabs).

## Datos mayo (Excel + imagen)
Torta Natural 44260304 | Torta Alcalina 13260318 | Cocoa Natural 11260513 | Cocoa Alcalina 07260324 | Licor 260516 | Manteca 19260321

Analista: Nereyda Huachua Flores
