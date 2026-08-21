# Estudio de Vida Útil — Torta Alcalina de Cacao

**Exportadora Romex S.A. | Planta de Cacao Chincha**  
Área: Laboratorio de Microbiología

Sistema profesional web (HTML + CSS + JavaScript) para el **Estudio de Vida Útil** de Torta Alcalina de Cacao.  
Incluye análisis microbiológicos mensuales + seguimiento de **% de Humedad** con el formato oficial de la empresa.

---

## Estructura del proyecto (separado)

```
estudio-vida-util-romex/
├── index.html          # Estructura HTML
├── css/
│   └── styles.css      # Todos los estilos
├── js/
│   └── app.js          # Lógica completa + Chart.js
└── README.md
```

---

## Características

### 1. Módulo de Microbiología
- Hojas mensuales (tabs) editables
- Resultados: RTAMV, Mohos, E. Coli, Enterobacterias + % Humedad
- Gráficos Chart.js:
  - **Independiente** (barras del mes actual)
  - **Evaluación / Comportamiento** (líneas acumuladas)
- Interpretación editable por mes
- Condiciones de almacenamiento
- Firma del analista

### 2. Módulo de % Humedad (formato oficial de la imagen)
- Header corporativo idéntico al formato Excel del laboratorio
- Producto, Lote, Fecha inicial, % Humedad inicial
- Tabla de registros: Fecha + % Humedad obtenida
- Agregar / eliminar registros
- Gráfico de evolución de humedad
- Interpretación editable

### 3. Mejoras técnicas
- Código **separado** en HTML / CSS / JS
- Persistencia con `localStorage`
- Diseño dark profesional (Romex)
- Responsive
- Impresión optimizada
- Botón de guardado

---

## Cómo usar

```bash
git clone https://github.com/rframosyataco8-ux/estudio-vida-util-romex.git
cd estudio-vida-util-romex
```

Abre `index.html` en cualquier navegador moderno (Chrome, Edge, Firefox, Safari).

> **Importante**: como usa rutas relativas (`css/styles.css` y `js/app.js`), ábrelo desde la carpeta del proyecto (no arrastres solo el HTML a otra ubicación).

---

## Datos de ejemplo incluidos

- Lote: **44260304**
- Producto: **Torta Alcalina de Cacao**
- Meses: Mayo 2026 → Enero 2027
- % Humedad inicial: **2.06%**
- Condiciones: 18°C – 33°C / HR 60-75%

---

## Resetear datos

Abre la consola del navegador (`F12`) y ejecuta:

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
