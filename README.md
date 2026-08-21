# Control de Calidad — Exportadora Romex S.A.

Sistema multi-producto: **Microbiología** + **Físicoquímico** por mes.

## Base de datos
Los datos **no están hardcodeados** en el HTML/JS.

| Archivo | Rol |
|---------|-----|
| `data/products.json` | Semilla / catálogo de productos y bases de mayo |
| **IndexedDB** (`romex_qc_db`) | Base de datos local del navegador (resultados editados) |

Al abrir por primera vez se genera la serie Mayo→Diciembre y se guarda en IndexedDB.  
Las ediciones se persisten con el botón 💾.

## Cómo abrir
Como usa `fetch('data/products.json')`, **no abras con doble clic** (`file://`). Usa un servidor local:

```bash
git clone https://github.com/rframosyataco8-ux/estudio-vida-util-romex.git
cd estudio-vida-util-romex

# Opción 1
npx serve .

# Opción 2
python3 -m http.server 8080
# luego http://localhost:8080
```

## Estructura
```
index.html
css/styles.css
js/app.js
data/products.json   ← base de datos semilla
README.md
```

## Productos (datos mayo)
Torta Natural · Torta Alcalina · Cocoa Natural · Cocoa Alcalina · Licor · Manteca

Analista: Nereyda Huachua Flores · Planta Cacao Chincha
