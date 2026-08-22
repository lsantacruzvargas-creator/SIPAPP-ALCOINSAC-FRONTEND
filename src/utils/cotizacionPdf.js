import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Se cargan desde /public (no un import de módulo) para que, si el archivo
// todavía no fue subido, solo falle la carga de esa imagen puntual en vez
// de romper el build o la exportación completa del PDF.
function cargarImagen(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Logos de marcas representadas — van siempre al pie de cada cotización.
// El orden del array define el orden izquierda→derecha en el pie (ver más
// abajo): ACHEM va primero (extrema izquierda) y HUAHAI al final (extrema
// derecha), como en la imagen de referencia.
const LOGOS_MARCAS = [
  { src: "/assets/logos/logo_achem.png",     format: "PNG" },
  { src: "/assets/logos/logo_Gruetzner.png", format: "PNG" },
  { src: "/assets/logos/logo_KOGANEI.jpg",   format: "JPEG" },
  { src: "/assets/logos/logo_beko.png",      format: "PNG" },
  { src: "/assets/logos/logo_kcpc.jpg",      format: "JPEG" }, // XCPC
  { src: "/assets/logos/logo_huahai.png",    format: "PNG" },
];

export const exportarCotizacionPdf = async (cotizacion) => {
  const doc = new jsPDF();
  const empresa = cotizacion.empresa;
  const PAGE_R = 196;

  const [icono, textoLogo, ...marcasImgs] = await Promise.all([
    // Cuadrado (1:1): ícono globo+paloma con "ALCOINSAC" apilado debajo.
    cargarImagen("/assets/logos/Logo_grande-DESKTOP-3FJUSSF.png"),
    // Wordmark ancho (~4.46:1): "ALCOINSAC / ALPHA CONTROL E INGENIERIA S.A.C.".
    cargarImagen("/assets/logos/Logo_pequeño.png"),
    ...LOGOS_MARCAS.map((m) => cargarImagen(m.src)),
  ]);

  // ─── Marca de agua: ícono centrado detrás de todo el contenido ───
  // Se dibuja primero (antes que cualquier otro texto/imagen) para que quede
  // detrás — en PDF cada trazo nuevo se pinta encima de lo anterior.
  if (icono) {
    const wSize = 100;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.addImage(icono, "PNG", (pageW - wSize) / 2, (pageH - wSize) / 2, wSize, wSize);
    doc.restoreGraphicsState();
  }

  // ─── Encabezado: logos a la izquierda, datos de contacto a la derecha ───
  if (icono) doc.addImage(icono, "PNG", 14, 3, 30, 30);
  if (textoLogo) doc.addImage(textoLogo, "PNG", 43, 10, 90, 18);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  let ry = 14;
  doc.text("Mza. F1 Lote 16 Urbanizacion El Dorado", PAGE_R-25, ry, { align: "center" }); ry += 4;
  doc.text("Puente Piedra - Lima - Lima", PAGE_R-25, ry, { align: "center" }); ry += 4;
  doc.text("www.alcoinsac.com   ventas@alcoinsac.com", PAGE_R-25, ry, { align: "center" }); ry += 4;
  doc.text("CEL: 969585300", PAGE_R-25, ry, { align: "center" });

  let y = 32;
  doc.setDrawColor(200);
  doc.line(14, y, PAGE_R, y);
  y += 7;

  // ─── Señores/Atención (izquierda) + Cotización/Fecha (derecha) ───
  const fechaStr = cotizacion.fecha ? new Date(cotizacion.fecha).toLocaleDateString("es-PE") : "-";

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Señores:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(empresa?.razonSocial || "-", 32, y);
  doc.setFont("helvetica", "bold");
  doc.text(`COTIZACION: ${cotizacion.numeroCotizacion || "-"}`, 150, y, { align: "right" });
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Atención:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(cotizacion.atencion || "-", 32, y);
  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", 113, y);
  doc.setFont("helvetica", "normal");
  doc.text(fechaStr, 150, y, { align: "right" });
  y += 10;

  // ─── Párrafo de presentación (fijo) ───
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("De nuestra mayor consideración:", 14, y);
  y += 6;
  const parrafo =
    "Nos es grato presentarnos ante ud. Para saludarlo cordialmente y a su vez presentarle nuestra PROPUESTA COMERCIAL.";
  const lineas = doc.splitTextToSize(parrafo, PAGE_R - 14);
  doc.text(lineas, 14, y);
  y += lineas.length * 5 + 4;

  // ─── Título + condición de pago ───
  // doc.setFontSize(10);
  // doc.setFont("helvetica", "bold");
  // const tituloLineas = doc.splitTextToSize(cotizacion.titulo || "", PAGE_R - 14);
  // doc.text(tituloLineas, 14, y);
  // y += tituloLineas.length * 5 + 3;

  // Misma tabla (columnas, anchos y pie) para ambos tipos de cotización
  // ("venta" y "servicio") — la única diferencia real entre ellos son los
  // sub-ítems en viñetas, que solo existen en los ítems de tipo "servicio".
  // Moneda mostrada en el pie (Subtotal/IGV/Total) —
  // se toma la del primer ítem, mismo criterio que ya usa cada fila del
  // cuerpo (una cotización real no mezcla monedas entre ítems).
  const monedaFooter = cotizacion.items?.[0]?.moneda === "USD" ? "$" : "S/";
  // Celda en blanco (cols 0-2), a la izquierda de la etiqueta. El borde
  // izquierdo real de esas filas es el marco exterior de la tabla principal
  // (tableLineWidth, líneas ~187) — ese rectángulo se repinta siempre encima
  // de cualquier lineWidth de celda, así que no hay forma de quitarlo ahí.
  // Por eso el pie (Subtotal/IGV/Total) se dibuja como una SEGUNDA tabla,
  // pegada justo debajo, sin tableLineWidth propio: así cada celda controla
  // sus 4 bordes de verdad y sí se puede apagar el izquierdo/inferior.
  const filaFooterServicio = (etiqueta, valor, lwBlanco) => [
    { content: "", colSpan: 3, styles: { lineWidth: lwBlanco } },
    { content: etiqueta, styles: { halign: "right", fontStyle: "bold" } },
    { content: monedaFooter, styles: { halign: "center", fontStyle: "bold", lineWidth: { top: 0.1, bottom: 0.1, left: 0.1, right: 0 } } },
    { content: Number(valor).toFixed(2), styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.1, bottom: 0.1, left: 0, right: 0.1 } } },
  ];
  // Fila 1: top normal (linda con el borde inferior del cuerpo). Las 3 filas
  // van sin izquierdo/inferior; filas 2-3 también sin top (si no, el top de
  // una repinta la línea que la anterior apagó con su bottom) — la celda en
  // blanco queda así totalmente abierta por abajo e izquierda en las 3.
  const filasFooterServicio = [
    filaFooterServicio("Subtotal:", cotizacion.subtotal, { top: 0.1, bottom: 0, left: 0, right: 0.1 }),
    filaFooterServicio("IGV 18%:", cotizacion.igv, { top: 0, bottom: 0, left: 0, right: 0.1 }),
    filaFooterServicio("TOTAL:", cotizacion.total, { top: 0, bottom: 0, left: 0, right: 0.1 }),
  ];
  autoTable(doc, {
    startY: y,
    head: [["#", "Descripción", "Cant.", "Precio", "Mon.", "Subtotal"]],
    body: cotizacion.items.map((item, i) => {
      // Ítems informativos (sin costo propio, p.ej. sub-agrupaciones del
      // catálogo) suelen quedar en 0.00 — se ocultan #, Cantidad, Moneda,
      // Precio y Subtotal (en blanco) en vez de mostrar ceros que no aplican.
      const precioNum = Number(item.precio) || 0;
      const subtotalNum = Number(item.subtotal) || 0;
      const esInformativo = precioNum === 0;
      // Los sub-ítems en viñetas solo existen en ítems de tipo "servicio"
      // (itemVacioVenta no tiene subItems) — acá no hace falta distinguir.
      let desc = item.descripcion;
      if (item.subItems?.length > 0) {
        desc += "\n" + item.subItems.map((s) => `  • ${s}`).join("\n");
      }
      return [
        esInformativo ? "" : i + 1,
        desc,
        esInformativo ? "" : item.cantidad,
        esInformativo ? "" : precioNum.toFixed(2),
        esInformativo ? "" : (item.moneda === "PEN" ? "S/" : "$"),
        subtotalNum === 0 ? "" : subtotalNum.toFixed(2),
      ];
    }),
    // El pie (Subtotal/IGV/Total) ya no va acá en ningún caso — se dibuja
    // después como una segunda tabla independiente (ver más abajo) para
    // poder controlar sus bordes sin que el marco exterior de ESTA tabla
    // los repinte.
    foot: undefined,
    theme: "grid",
    margin: { left: 10, right: 10 },
    // Subtotal/IGV/Total (foot) solo en la última página — por defecto
    // autoTable repite el foot en cada página cuando la tabla se parte.
    showFoot: "lastPage",
    // Como las filas del cuerpo ya no tienen borde inferior propio (ver
    // "styles" más abajo), sin esto la tabla queda "abierta" al final de
    // cada página cuando se corta en varias — tableLineWidth dibuja un
    // rectángulo de cierre alrededor de todo el contenido de esa página en
    // cada salto (y otra vez al final de la última página).
    tableLineWidth: 0.1,
    tableLineColor: [0, 0, 0],
    // El marco exterior de la tabla se arma con el borde completo de
    // encabezado y pie (top+bottom+left+right) — solo las FILAS DEL CUERPO
    // pierden las líneas horizontales entre sí (top/bottom en 0, se
    // mantienen las verticales left/right para separar columnas).
    styles: { fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: { top: 0, bottom: 0, left: 0.1, right: 0.1 }, fillColor: false },
    headStyles: { fontSize: 8, fontStyle: "bold", textColor: [0, 0, 0], fillColor: false, lineColor: [0, 0, 0], lineWidth: 0.1 },
    footStyles: { halign: "right", fontStyle: "bold", textColor: [0, 0, 0], fillColor: false, lineColor: [0, 0, 0], lineWidth: 0.1 },
    alternateRowStyles: { fillColor: false },
    columnStyles: {
      0: { cellWidth: 8,  halign: "center" },
      2: { cellWidth: 12, halign: "center" },
      3: { cellWidth: 20, halign: "right" },
      // Sin línea divisoria entre "Mon." y "Subtotal" — se anula el borde
      // derecho de una y el izquierdo de la otra (el resto de columnas
      // conserva su lineWidth heredado de `styles`).
      4: { cellWidth: 10, halign: "center", lineWidth: { top: 0, bottom: 0, left: 0.1, right: 0 } },
      5: { cellWidth: 20, halign: "right", lineWidth: { top: 0, bottom: 0, left: 0, right: 0.1 } },
    },
    // autoTable no soporta estilos mixtos dentro de una misma celda — la
    // tabla ya dibujó la descripción completa (grupo + sub-ítems) en peso
    // normal. Acá se tapa esa franja (negrita y normal no ocupan el mismo
    // ancho por carácter, así que solo superponer dejaba un "fantasma" del
    // texto normal más angosto asomando al costado) y se vuelve a dibujar
    // SOLO la línea del grupo padre en negrita, limpia, encima.
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 1) return;
      const item = cotizacion.items[data.row.index];
      if (!item?.subItems?.length) return;
      const { cell } = data;
      const fontSize = cell.styles.fontSize;
      doc.setFontSize(fontSize);
      const maxWidth = cell.width - cell.padding("left") - cell.padding("right");
      const lineasPadre = doc.splitTextToSize(item.descripcion, maxWidth);

      // doc.getLineHeight() no coincidía con el alto real de línea que usa
      // autoTable internamente (tapaba de más, comiéndose sub-ítems de
      // abajo) — se calcula el alto real de línea a partir de lo que
      // autoTable YA calculó para esta celda: alto interior ÷ total de
      // líneas envueltas (cell.text ya viene con el wrap final aplicado).
      const totalLineas = Array.isArray(cell.text) && cell.text.length > 0 ? cell.text.length : lineasPadre.length;
      const padTop = cell.padding("top");
      const padBottom = cell.padding("bottom");
      const alturaInterior = cell.height - padTop - padBottom;
      const lineHeight = alturaInterior / totalLineas;
      const bandHeight = lineasPadre.length * lineHeight;

      doc.setFillColor(255, 255, 255);
      doc.rect(cell.x + 0.3, cell.y + padTop - 0.2, cell.width - 0.6, bandHeight + 0.2, "F");

      const x = cell.x + cell.padding("left");
      let ly = cell.y + padTop + lineHeight * 0.75;
      doc.setFont("helvetica", "bold");
      lineasPadre.forEach((linea) => { doc.text(linea, x, ly); ly += lineHeight; });
      doc.setFont("helvetica", "normal");
    },
  });

  // ─── Pie Subtotal/IGV/Total ───
  // Tabla aparte, pegada justo debajo de la principal (mismo startY que su
  // finalY), sin tableLineWidth: cada celda dibuja sus propios 4 bordes, así
  // la celda de la etiqueta sí puede quedar sin borde izquierdo/inferior.
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY,
    body: filasFooterServicio,
    theme: "grid",
    margin: { left: 10, right: 10 },
    styles: { fontSize: 9, halign: "right", fontStyle: "bold", textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1, fillColor: false },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 106 },
      2: { cellWidth: 12 },
      3: { cellWidth: 20 },
      4: { cellWidth: 10, halign: "center" },
      5: { cellWidth: 20 },
    },
  });

  // ─── Condiciones comerciales ───
  let y2 = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Condiciones comerciales:", 14, y2);
  y2 += 6;

  doc.setFont("helvetica", "normal");
  const condiciones = [
    ["Forma de pago", cotizacion.condicionPago],
    ["Plazo de entrega", cotizacion.plazoEntrega],
    ["Lugar de entrega", cotizacion.lugarEntrega],
    ["Validez de la oferta", cotizacion.validezOferta],
  ];
  condiciones.forEach(([label, valor]) => {
    doc.text(label, 14, y2);
    doc.text(":", 50, y2);
    doc.text(valor || "-", 54, y2);
    y2 += 5;
  });
  y2 += 5;

  const cierre = "Sin otro en particular quedamos a la espera de su grata orden de compra.";
  const cierreLineas = doc.splitTextToSize(cierre, PAGE_R - 14);
  doc.text(cierreLineas, 14, y2);
  y2 += cierreLineas.length * 5 + 10;

  doc.text("Atentamente,", 14, y2);
  y2 += 12;
  doc.setFont("helvetica", "bold");
  doc.text("JESUS HERRERA", 14, y2);
  y2 += 5;
  doc.text("ALCOINSAC", 14, y2);
    y2 += 5;
  doc.text("CEL: 969585300", 14, y2);

  // ─── Pie de página: logos de marcas representadas ───
  const marcasCargadas = LOGOS_MARCAS
    .map((m, i) => ({ ...m, img: marcasImgs[i] }))
    .filter((m) => m.img);
  if (marcasCargadas.length > 0) {
    const altoLogo = 20;
    const espacio = 8;
    const anchos = marcasCargadas.map((m) => (m.img.naturalWidth / m.img.naturalHeight) * altoLogo);
    const anchoTotal = anchos.reduce((a, b) => a + b, 0) + espacio * (marcasCargadas.length - 1);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let fx = (pageW - anchoTotal) / 2;
    const fy = pageH - altoLogo - 8;
    marcasCargadas.forEach((m, i) => {
      doc.addImage(m.img, m.format, fx, fy, anchos[i], altoLogo);
      fx += anchos[i] + espacio;
    });
  }

  doc.save(`Cotizacion-${cotizacion.numeroCotizacion || cotizacion.codigo}.pdf`);
};
