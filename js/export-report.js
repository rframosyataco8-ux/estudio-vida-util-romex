/* Romex QC — exportar informe visual: PDF, Word, PowerPoint, CSV */
'use strict';

(function () {
  var CDN = {
    html2canvas: 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    jspdf: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
    pptxgen: 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'
  };

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }

  function snackMsg(m) {
    if (typeof snack === 'function') snack(m);
    else console.log(m);
  }

  function productInfo() {
    var p = (typeof products !== 'undefined' && products)
      ? products.find(function (x) { return x.codigo === activeCodigo; })
      : null;
    return {
      nombre: p ? p.nombre : (document.getElementById('productTitle') || {}).textContent || 'Producto',
      lote: p ? p.lote : '',
      codigo: typeof activeCodigo !== 'undefined' ? activeCodigo : '',
      mes: (typeof MONTH_NAMES !== 'undefined' && MONTH_NAMES[activeMonth]) ? MONTH_NAMES[activeMonth] : String(activeMonth || ''),
      anio: typeof activeYear !== 'undefined' ? activeYear : 2026,
      mode: typeof activeMode !== 'undefined' ? activeMode : 'micro',
      modeLabel: (typeof activeMode !== 'undefined' && activeMode === 'fisico') ? 'Físicoquímico' : 'Microbiología'
    };
  }

  function canvasToDataUrl(id) {
    var cv = document.getElementById(id);
    if (!cv) return null;
    try { return cv.toDataURL('image/png'); } catch (e) { return null; }
  }

  function readResultsTable() {
    var table = document.querySelector('#content .table-wrap table');
    if (!table) return { headers: [], values: [] };
    var headers = [];
    var values = [];
    table.querySelectorAll('thead th').forEach(function (th) {
      headers.push((th.textContent || '').trim());
    });
    table.querySelectorAll('tbody tr').forEach(function (tr) {
      var row = [];
      tr.querySelectorAll('td').forEach(function (td) {
        var inp = td.querySelector('input');
        row.push(inp ? (inp.value || '').trim() : (td.textContent || '').trim());
      });
      if (row.length) values.push(row);
    });
    return { headers: headers, values: values };
  }

  function readMeta() {
    var cells = document.querySelectorAll('#content .info-cell');
    var meta = {};
    cells.forEach(function (c) {
      var lbl = (c.querySelector('.info-lbl') || {}).textContent || '';
      var val = (c.querySelector('.info-val') || {}).textContent || '';
      meta[lbl.trim().toUpperCase()] = val.trim();
    });
    return meta;
  }

  function fileBase() {
    var i = productInfo();
    var safe = String(i.nombre || i.codigo || 'romex')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9._-]/g, '');
    return 'Romex_' + safe + '_' + i.mode + '_' + i.mes + '_' + i.anio;
  }

  function ensureMenu() {
    var existing = document.getElementById('exportMenu');
    if (existing) return existing;
    var menu = document.createElement('div');
    menu.id = 'exportMenu';
    menu.className = 'export-menu';
    menu.hidden = true;
    menu.innerHTML =
      '<button type="button" data-fmt="pdf"><span class="material-icons-outlined">picture_as_pdf</span> PDF</button>' +
      '<button type="button" data-fmt="word"><span class="material-icons-outlined">description</span> Word (.doc)</button>' +
      '<button type="button" data-fmt="pptx"><span class="material-icons-outlined">slideshow</span> PowerPoint</button>' +
      '<button type="button" data-fmt="csv"><span class="material-icons-outlined">table_view</span> CSV</button>' +
      '<button type="button" data-fmt="print"><span class="material-icons-outlined">print</span> Imprimir</button>';
    document.body.appendChild(menu);

    if (!document.getElementById('exportMenuStyle')) {
      var st = document.createElement('style');
      st.id = 'exportMenuStyle';
      st.textContent =
        '.export-menu{position:fixed;z-index:9999;min-width:200px;background:#fff;border:1px solid #e0e6ed;' +
        'border-radius:12px;box-shadow:0 8px 28px rgba(13,71,161,.18);padding:6px;display:flex;flex-direction:column;gap:2px}' +
        '.export-menu[hidden]{display:none!important}' +
        '.export-menu button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;' +
        'padding:10px 12px;border-radius:8px;font:500 13px Roboto,system-ui,sans-serif;color:#1a2332;cursor:pointer;text-align:left}' +
        '.export-menu button:hover{background:#e3f2fd;color:#0d47a1}' +
        '.export-menu .material-icons-outlined{font-size:18px;color:#1565c0}' +
        'html[data-theme="dark"] .export-menu{background:#1a1d24;border-color:#37474f;box-shadow:0 8px 28px rgba(0,0,0,.45)}' +
        'html[data-theme="dark"] .export-menu button{color:#e3f2fd}' +
        'html[data-theme="dark"] .export-menu button:hover{background:#263238;color:#90caf9}' +
        '@media print{' +
        '  .drawer,.app-bar,.tabs,#exportMenu,.icon-btn,.segmented,.year-select,.drawer-actions,' +
        '  #snackbar,#splash,.modal-backdrop{display:none!important}' +
        '  .app{margin:0!important;width:100%!important}' +
        '  .content{padding:0!important}' +
        '  .card{break-inside:avoid;box-shadow:none!important;border:1px solid #ddd}' +
        '  body{background:#fff!important}' +
        '}';
      document.head.appendChild(st);
    }

    menu.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-fmt]');
      if (!btn) return;
      menu.hidden = true;
      runExport(btn.getAttribute('data-fmt'));
    });

    document.addEventListener('click', function (e) {
      if (!menu.hidden && !e.target.closest('#exportMenu') && !e.target.closest('#exportBtn')) {
        menu.hidden = true;
      }
    });

    return menu;
  }

  function openExportMenu(anchor) {
    var menu = ensureMenu();
    var el = anchor || document.getElementById('exportBtn');
    if (!el) return;
    var r = el.getBoundingClientRect();
    menu.hidden = false;
    menu.style.top = (r.bottom + 6) + 'px';
    menu.style.left = Math.max(8, r.right - 210) + 'px';
  }

  async function runExport(fmt) {
    if (fmt === 'csv') {
      if (typeof window.exportCsv === 'function') window.exportCsv();
      return;
    }
    if (fmt === 'print') {
      window.print();
      return;
    }
    snackMsg('Generando ' + fmt.toUpperCase() + '…');
    try {
      if (fmt === 'pdf') await exportPdf();
      else if (fmt === 'word') await exportWord();
      else if (fmt === 'pptx') await exportPptx();
    } catch (err) {
      console.error(err);
      snackMsg('Error al exportar: ' + (err.message || err));
    }
  }

  function gatherReport() {
    var info = productInfo();
    var meta = readMeta();
    var table = readResultsTable();
    return {
      info: info,
      meta: meta,
      table: table,
      chart3d: canvasToDataUrl('cMain'),
      chartTrend: canvasToDataUrl('cTrend'),
      estado: meta['ESTADO'] || '',
      fecha: meta['FECHA'] || meta['FECHA SIEMBRA'] || '',
      title: info.modeLabel + ' · ' + info.nombre + ' · ' + info.mes + ' ' + info.anio
    };
  }

  async function exportPdf() {
    await loadScript(CDN.html2canvas);
    await loadScript(CDN.jspdf);
    var JsPDF = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
    if (!JsPDF) throw new Error('jsPDF no disponible');

    var content = document.getElementById('content');
    if (!content) throw new Error('No hay contenido');

    var canvas = await window.html2canvas(content, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: Math.max(content.scrollWidth, 900)
    });

    var img = canvas.toDataURL('image/png');
    var pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pageW = pdf.internal.pageSize.getWidth();
    var pageH = pdf.internal.pageSize.getHeight();
    var margin = 10;
    var usableW = pageW - margin * 2;
    var imgH = (canvas.height * usableW) / canvas.width;

    var rep = gatherReport();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(13, 71, 161);
    pdf.text('EXPORTADORA ROMEX S.A.', margin, 12);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(90, 106, 122);
    pdf.text('Planta Cacao Chincha · ' + rep.info.modeLabel + ' · I-EVUP-R-309', margin, 17);
    pdf.setDrawColor(21, 101, 192);
    pdf.setLineWidth(0.4);
    pdf.line(margin, 19, pageW - margin, 19);

    var y = 22;
    var maxH = pageH - y - 12;
    if (imgH <= maxH) {
      pdf.addImage(img, 'PNG', margin, y, usableW, imgH);
    } else {
      var srcY = 0;
      var page = 0;
      while (srcY < canvas.height) {
        if (page > 0) {
          pdf.addPage();
          y = margin;
          maxH = pageH - margin * 2;
        }
        var sliceHpx = Math.floor((maxH / usableW) * canvas.width);
        var slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = Math.min(sliceHpx, canvas.height - srcY);
        var ctx = slice.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, srcY, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
        var sliceImg = slice.toDataURL('image/png');
        var sliceHmm = (slice.height * usableW) / canvas.width;
        pdf.addImage(sliceImg, 'PNG', margin, y, usableW, sliceHmm);
        srcY += slice.height;
        page++;
      }
    }

    var total = pdf.internal.getNumberOfPages();
    for (var i = 1; i <= total; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(140, 140, 140);
      pdf.text(rep.title, margin, pageH - 6);
      pdf.text('Pág. ' + i + '/' + total, pageW - margin - 20, pageH - 6);
    }

    pdf.save(fileBase() + '.pdf');
    snackMsg('PDF descargado');
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function downloadBlob(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 800);
  }

  async function exportWord() {
    var rep = gatherReport();
    var rowsHtml = '';
    if (rep.table.headers.length) {
      rowsHtml += '<tr>' + rep.table.headers.map(function (h) {
        return '<th style="background:#e3f2fd;color:#0d47a1;padding:8px 10px;border:1px solid #bbdefb;font-size:11px;text-transform:uppercase">' + esc(h) + '</th>';
      }).join('') + '</tr>';
      rep.table.values.forEach(function (row) {
        rowsHtml += '<tr>' + row.map(function (v) {
          return '<td style="padding:8px 10px;border:1px solid #e0e6ed;text-align:center;font-size:13px;font-weight:600">' + esc(v) + '</td>';
        }).join('') + '</tr>';
      });
    }

    var chartBlock = '';
    if (rep.chart3d) {
      chartBlock += '<h3 style="color:#0d47a1;font-size:13px;margin:18px 0 8px">Gráfico 3D · siembra vs mes</h3>' +
        '<img src="' + rep.chart3d + '" style="width:100%;max-width:640px;height:auto;border:1px solid #e8eef5;border-radius:8px" />';
    }
    if (rep.chartTrend) {
      chartBlock += '<h3 style="color:#0d47a1;font-size:13px;margin:18px 0 8px">Tendencia</h3>' +
        '<img src="' + rep.chartTrend + '" style="width:100%;max-width:640px;height:auto;border:1px solid #e8eef5;border-radius:8px" />';
    }

    var html =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">' +
      '<head><meta charset="utf-8"><title>' + esc(rep.title) + '</title>' +
      '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->' +
      '<style>body{font-family:Calibri,Arial,sans-serif;color:#1a2332;margin:24px}' +
      'h1{font-size:16px;color:#0d47a1;margin:0 0 4px}h2{font-size:14px;color:#1565c0;margin:16px 0 8px}' +
      'table{border-collapse:collapse;width:100%;margin:8px 0}</style></head><body>' +
      '<div style="border-bottom:2px solid #1565c0;padding-bottom:8px;margin-bottom:14px">' +
      '<div style="font-size:11px;color:#607d8b">EXPORTADORA ROMEX S.A. · Planta Cacao Chincha · I-EVUP-R-309</div>' +
      '<h1>' + esc(rep.title) + '</h1></div>' +
      '<table style="width:100%;margin-bottom:12px">' +
      '<tr><td style="padding:6px;border:1px solid #e0e6ed;width:25%"><div style="font-size:10px;color:#78909c;text-transform:uppercase">Producto</div><strong>' + esc(rep.info.nombre) + '</strong></td>' +
      '<td style="padding:6px;border:1px solid #e0e6ed;width:25%"><div style="font-size:10px;color:#78909c;text-transform:uppercase">Lote</div><strong>' + esc(String(rep.info.lote)) + '</strong></td>' +
      '<td style="padding:6px;border:1px solid #e0e6ed;width:25%"><div style="font-size:10px;color:#78909c;text-transform:uppercase">Fecha</div><strong>' + esc(rep.fecha || '—') + '</strong></td>' +
      '<td style="padding:6px;border:1px solid #e0e6ed;width:25%"><div style="font-size:10px;color:#78909c;text-transform:uppercase">Estado</div><strong>' + esc(rep.estado || '—') + '</strong></td></tr></table>' +
      '<h2>Resultados</h2><table>' + rowsHtml + '</table>' +
      chartBlock +
      '<p style="margin-top:28px;font-size:11px;color:#90a4ae">Generado desde Romex QC · ' + new Date().toLocaleString('es-PE') + '</p>' +
      '</body></html>';

    var blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    downloadBlob(blob, fileBase() + '.doc');
    snackMsg('Word descargado');
  }

  async function exportPptx() {
    await loadScript(CDN.pptxgen);
    if (!window.PptxGenJS) throw new Error('PptxGenJS no disponible');
    var rep = gatherReport();
    var pptx = new window.PptxGenJS();
    pptx.defineLayout({ name: 'ROMEX_A4', width: 13.33, height: 7.5 });
    pptx.layout = 'ROMEX_A4';
    pptx.author = 'Romex QC';
    pptx.title = rep.title;

    var s1 = pptx.addSlide();
    s1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: '0D47A1' } });
    s1.addText('EXPORTADORA ROMEX S.A.', {
      x: 0.4, y: 0.22, w: 10, h: 0.35,
      fontSize: 16, bold: true, color: 'FFFFFF', fontFace: 'Arial'
    });
    s1.addText('Planta Cacao Chincha · Control de Calidad · I-EVUP-R-309', {
      x: 0.4, y: 0.52, w: 10, h: 0.28,
      fontSize: 11, color: 'BBDEFB', fontFace: 'Arial'
    });
    s1.addText(rep.title, {
      x: 0.4, y: 1.15, w: 12.5, h: 0.45,
      fontSize: 22, bold: true, color: '1565C0', fontFace: 'Arial'
    });

    var metaRows = [
      [
        { text: 'Producto', options: { bold: true, color: '546E7A' } },
        { text: rep.info.nombre || '—', options: { bold: true } },
        { text: 'Lote', options: { bold: true, color: '546E7A' } },
        { text: String(rep.info.lote || '—'), options: { bold: true } }
      ],
      [
        { text: 'Fecha', options: { bold: true, color: '546E7A' } },
        { text: rep.fecha || '—', options: { bold: true } },
        { text: 'Estado', options: { bold: true, color: '546E7A' } },
        { text: rep.estado || '—', options: { bold: true, color: '2E7D32' } }
      ]
    ];
    s1.addTable(metaRows, {
      x: 0.4, y: 1.8, w: 12.5, colW: [2.2, 4.05, 2.2, 4.05],
      border: [{ pt: 0.5, color: 'E0E6ED' }, { pt: 0.5, color: 'E0E6ED' }, { pt: 0.5, color: 'E0E6ED' }, { pt: 0.5, color: 'E0E6ED' }],
      fontFace: 'Arial', fontSize: 12,
      color: '1A2332',
      fill: { color: 'F8FAFC' },
      align: 'left', valign: 'middle'
    });

    if (rep.table.headers.length) {
      var head = rep.table.headers.map(function (h) {
        return { text: h, options: { bold: true, color: '0D47A1', align: 'center' } };
      });
      var body = (rep.table.values[0] || []).map(function (v) {
        return { text: String(v), options: { bold: true, align: 'center', fontSize: 14 } };
      });
      s1.addText('Resultados', {
        x: 0.4, y: 3.1, w: 12, h: 0.35,
        fontSize: 14, bold: true, color: '0D47A1', fontFace: 'Arial'
      });
      s1.addTable([head, body], {
        x: 0.4, y: 3.5, w: 12.5,
        border: [{ pt: 0.5, color: 'BBDEFB' }, { pt: 0.5, color: 'BBDEFB' }, { pt: 0.5, color: 'BBDEFB' }, { pt: 0.5, color: 'BBDEFB' }],
        fontFace: 'Arial', fontSize: 11,
        color: '1A2332',
        fill: { color: 'FFFFFF' },
        align: 'center', valign: 'middle'
      });
    }

    s1.addText('Generado desde Romex QC · ' + new Date().toLocaleString('es-PE'), {
      x: 0.4, y: 7.05, w: 12, h: 0.25,
      fontSize: 10, color: '90A4AE', fontFace: 'Arial'
    });

    if (rep.chart3d) {
      var s2 = pptx.addSlide();
      s2.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.7, fill: { color: '0D47A1' } });
      s2.addText('Gráfico 3D · Siembra vs mes', {
        x: 0.4, y: 0.18, w: 12, h: 0.4,
        fontSize: 16, bold: true, color: 'FFFFFF', fontFace: 'Arial'
      });
      s2.addImage({ data: rep.chart3d, x: 0.5, y: 1.0, w: 12.3, h: 5.8 });
    }

    if (rep.chartTrend) {
      var s3 = pptx.addSlide();
      s3.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.7, fill: { color: '0D47A1' } });
      s3.addText('Tendencia · ' + rep.info.nombre, {
        x: 0.4, y: 0.18, w: 12, h: 0.4,
        fontSize: 16, bold: true, color: 'FFFFFF', fontFace: 'Arial'
      });
      s3.addImage({ data: rep.chartTrend, x: 0.5, y: 1.0, w: 12.3, h: 5.8 });
    }

    await pptx.writeFile({ fileName: fileBase() + '.pptx' });
    snackMsg('PowerPoint descargado');
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('#exportBtn');
    if (!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openExportMenu(btn);
  }, true);

  window.romexExport = {
    openMenu: openExportMenu,
    pdf: exportPdf,
    word: exportWord,
    pptx: exportPptx
  };
})();
