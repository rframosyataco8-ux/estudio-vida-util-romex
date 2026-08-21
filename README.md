# Estudio de Vida Útil — Torta Alcalina de Cacao

**Exportadora Romex S.A. | Planta de Cacao Chincha**  
Área: Laboratorio de Microbiología

Sistema profesional web (HTML + CSS + JavaScript puro) para el **Estudio de Vida Útil** de Torta Alcalina de Cacao.  
Incluye análisis microbiológicos mensuales + seguimiento de **% de Humedad** con el formato oficial de la empresa.

---

## Características

### 1. Módulo de Microbiología
- Hojas mensuales (tabs) editables
- Resultados: RTAMV, Mohos, E. Coli, Enterobacterias
- Gráficos Chart.js:
  - **Independiente** (barras del mes actual)
  - **Evaluación / Comportamiento** (líneas acumuladas de todos los meses)
- Interpretación editable por mes
- Condiciones de almacenamiento
- Firma del analista

### 2. Módulo de % Humedad (formato oficial)
- Header corporativo idéntico al formato Excel usado en laboratorio
- Producto, Lote, Fecha inicial, % Humedad inicial
- Tabla de registros: Fecha + % Humedad obtenida
- Agregar / eliminar registros
- Gráfico de evolución de humedad
- Interpretación automática + editable

### 3. Mejoras técnicas
- Persistencia con `localStorage` (los datos se guardan en el navegador)
- Diseño dark profesional (Romex)
- Responsive (móvil / tablet / desktop)
- Impresión optimizada (Ctrl+P)
- Botón de guardado manual
- Todo en un solo archivo (`index.html`) — cero dependencias de servidor

---

## Cómo usar

### Opción 1 — Clonar el repositorio

```bash
git clone https://github.com/rframosyataco8-ux/estudio-vida-util-romex.git
cd estudio-vida-util-romex
```

Abre `index.html` en cualquier navegador moderno (Chrome, Edge, Firefox, Safari).

### Opción 2 — Descarga directa
Ve a la pestaña **Code → Download ZIP** en GitHub y abre `index.html`.

---

## Estructura del proyecto

```
estudio-vida-util-romex/
├── index.html          # Aplicación completa (HTML + CSS + JS)
└── README.md           # Este archivo
```

---

## Datos de ejemplo incluidos

- Lote: **44260304**
- Producto: **Torta Alcalina de Cacao**
- Meses: Mayo 2026 → Enero 2027
- % Humedad inicial: **2.06%**
- Condiciones: 18°C – 33°C / HR 60-75%

---

## Personalización rápida

Todos los textos, valores y fechas son editables directamente en la interfaz (contenteditable + inputs).  
Los datos se guardan automáticamente en el navegador al agregar/eliminar hojas.

Para resetear los datos: abre la consola del navegador (`F12`) y ejecuta:

```js
localStorage.removeItem('romex_vida_util');
location.reload();
```

---

## Autor / Analista

**Nereyda Huachua Flores**  
Analista de Microbiología  
Exportadora Romex S.A.

---

## Licencia

Uso interno de Exportadora Romex S.A.  
Código liberado para uso y mejora del laboratorio.
